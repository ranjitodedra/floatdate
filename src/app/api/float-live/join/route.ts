import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodaySessionTimes } from "@/lib/float-live-time";
import { requireReferralUnlock } from "@/lib/guards";

const VALID_PREFERENCES = ["male", "female", "nonbinary", "any"];
const VALID_INTENTIONS = ["blind_date", "friendship"];
const VALID_CHARACTERS = ["A", "B", "C", "D", "E", "F"];

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const referralDenied = await requireReferralUnlock(authSession.userId);
        if (referralDenied) return referralDenied;

        const body = await req.json();
        const { preference, intention, character, acceptedTerms } = body;

        if (acceptedTerms !== true) {
            return NextResponse.json(
                { error: "You must accept the terms to join Float Live" },
                { status: 400 }
            );
        }

        // Validate filters
        if (!VALID_PREFERENCES.includes(preference)) {
            return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
        }
        if (!VALID_INTENTIONS.includes(intention)) {
            return NextResponse.json({ error: "Invalid intention" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: {
                gender: true,
                universityId: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const selectedCharacter = VALID_CHARACTERS.includes(character) ? character : "A";

        // Get or create today's session
        const { date, startTime, endTime } = await getTodaySessionTimes();
        let liveSession = await prisma.floatLiveSession.findFirst({
            where: {
                date: {
                    gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                },
            },
        });

        if (!liveSession) {
            liveSession = await prisma.floatLiveSession.create({
                data: { date, startTime, endTime },
            });
        }

        // Upsert participant
        const participant = await prisma.floatLiveParticipant.upsert({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId: liveSession.id,
                },
            },
            update: {
                gender: user.gender,
                preference,
                intention,
                universityId: user.universityId,
                character: selectedCharacter,
                isOnline: true,
                acceptedTerms: true,
                leftAt: null,
                lastSeenAt: new Date(),
                status: "waiting",
            },
            create: {
                userId: authSession.userId,
                sessionId: liveSession.id,
                gender: user.gender,
                preference,
                intention,
                universityId: user.universityId,
                character: selectedCharacter,
                acceptedTerms: true,
                lastSeenAt: new Date(),
                status: "waiting",
            },
        });

        // Close any active chat rooms this participant is in
        // (prevents rejoining the same partner from a previous chat)
        await prisma.floatLiveChatRoom.updateMany({
            where: {
                isActive: true,
                OR: [
                    { participantAId: participant.id },
                    { participantBId: participant.id },
                ],
            },
            data: {
                isActive: false,
                status: "ended",
                endedReason: "user_exit",
                endedAt: new Date(),
            },
        });

        return NextResponse.json({ participant, sessionId: liveSession.id });
    } catch (error) {
        console.error("Float Live join error:", error);
        return NextResponse.json({ error: "Failed to join" }, { status: 500 });
    }
}
