import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive, getTodaySessionTimes } from "@/lib/float-live-time";

const VALID_PREFERENCES = ["male", "female", "nonbinary", "any"];
const VALID_INTENTIONS = ["blind_date", "friendship"];
const VALID_CAMPUSES = ["Waterloo", "Brantford", "Milton"];

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { active } = isFloatLiveActive();
        if (!active) {
            return NextResponse.json(
                { error: "Float Live is only available 5-6 PM ET" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { preference, intention, campus } = body;

        // Validate filters
        if (!VALID_PREFERENCES.includes(preference)) {
            return NextResponse.json({ error: "Invalid preference" }, { status: 400 });
        }
        if (!VALID_INTENTIONS.includes(intention)) {
            return NextResponse.json({ error: "Invalid intention" }, { status: 400 });
        }
        if (!VALID_CAMPUSES.includes(campus)) {
            return NextResponse.json({ error: "Invalid campus" }, { status: 400 });
        }

        // Get user's gender
        const user = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: { gender: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Get or create today's session
        const { date, startTime, endTime } = getTodaySessionTimes();
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
                preference,
                intention,
                campus,
                isOnline: true,
                acceptedTerms: true,
                leftAt: null,
            },
            create: {
                userId: authSession.userId,
                sessionId: liveSession.id,
                gender: user.gender,
                preference,
                intention,
                campus,
                acceptedTerms: true,
            },
        });

        return NextResponse.json({ participant, sessionId: liveSession.id });
    } catch (error) {
        console.error("Float Live join error:", error);
        return NextResponse.json({ error: "Failed to join" }, { status: 500 });
    }
}
