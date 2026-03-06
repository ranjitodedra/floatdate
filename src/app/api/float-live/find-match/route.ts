import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isFloatLiveActive, getTodaySessionTimes } from "@/lib/float-live-time";

function isCompatible(
    userA: { gender: string; preference: string; intention: string; campus: string },
    userB: { gender: string; preference: string; intention: string; campus: string }
): boolean {
    // Campus must match
    if (userA.campus !== userB.campus) return false;
    // Intention must match
    if (userA.intention !== userB.intention) return false;
    // Gender preference must be mutual
    const aPrefersB = userA.preference === "any" || userA.preference === userB.gender;
    const bPrefersA = userB.preference === "any" || userB.preference === userA.gender;
    if (!aPrefersB || !bPrefersA) return false;
    return true;
}

export async function POST(req: NextRequest) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { active } = await isFloatLiveActive();
        if (!active) {
            return NextResponse.json(
                { error: "Float Live is only available 5-6 PM ET" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId required" }, { status: 400 });
        }

        // Get current user's participant record
        const myParticipant = await prisma.floatLiveParticipant.findUnique({
            where: {
                userId_sessionId: {
                    userId: authSession.userId,
                    sessionId,
                },
            },
        });

        if (!myParticipant) {
            return NextResponse.json({ error: "You must join first" }, { status: 400 });
        }

        // Check if user already has an active chat room
        const existingRoom = await prisma.floatLiveChatRoom.findFirst({
            where: {
                isActive: true,
                sessionId,
                OR: [
                    { participantAId: myParticipant.id },
                    { participantBId: myParticipant.id },
                ],
            },
        });

        if (existingRoom) {
            return NextResponse.json({ status: "matched", chatRoomId: existingRoom.id });
        }

        // Find all online, unmatched participants in this session
        const candidates = await prisma.floatLiveParticipant.findMany({
            where: {
                sessionId,
                isOnline: true,
                userId: { not: authSession.userId },
                // Not in any active chat room
                chatRoomsAsA: { none: { isActive: true } },
                chatRoomsAsB: { none: { isActive: true } },
            },
        });

        // Find first compatible match
        const match = candidates.find((candidate) =>
            isCompatible(myParticipant, candidate)
        );

        if (!match) {
            return NextResponse.json({
                status: "waiting",
                message: "Looking for someone...",
            });
        }

        // Check if an inactive room already exists between these two participants
        // If so, reactivate it instead of creating a new one (avoids unique constraint)
        const existingPairRoom = await prisma.floatLiveChatRoom.findFirst({
            where: {
                sessionId,
                isActive: false,
                OR: [
                    { participantAId: myParticipant.id, participantBId: match.id },
                    { participantAId: match.id, participantBId: myParticipant.id },
                ],
            },
        });

        if (existingPairRoom) {
            // Reactivate the existing room for a fresh chat
            const reactivated = await prisma.floatLiveChatRoom.update({
                where: { id: existingPairRoom.id },
                data: {
                    isActive: true,
                    endedAt: null,
                    intention: myParticipant.intention,
                    emailRevealedByA: false,
                    emailRevealedByB: false,
                },
            });
            return NextResponse.json({ status: "matched", chatRoomId: reactivated.id });
        }

        // Create chat room — wrapped in try/catch for race condition safety
        try {
            const chatRoom = await prisma.floatLiveChatRoom.create({
                data: {
                    sessionId,
                    participantAId: myParticipant.id,
                    participantBId: match.id,
                    intention: myParticipant.intention,
                },
            });

            return NextResponse.json({ status: "matched", chatRoomId: chatRoom.id });
        } catch (createError: unknown) {
            // If unique constraint failed, the other user's polling already created the room
            if (
                typeof createError === "object" &&
                createError !== null &&
                "code" in createError &&
                (createError as { code: string }).code === "P2002"
            ) {
                // Find the room that was just created by the other side
                const raceRoom = await prisma.floatLiveChatRoom.findFirst({
                    where: {
                        sessionId,
                        isActive: true,
                        OR: [
                            { participantAId: myParticipant.id },
                            { participantBId: myParticipant.id },
                        ],
                    },
                });
                if (raceRoom) {
                    return NextResponse.json({ status: "matched", chatRoomId: raceRoom.id });
                }
                return NextResponse.json({ status: "waiting", message: "Looking for someone..." });
            }
            throw createError;
        }
    } catch (error) {
        console.error("Float Live find-match error:", error);
        return NextResponse.json({ error: "Failed to find match" }, { status: 500 });
    }
}
