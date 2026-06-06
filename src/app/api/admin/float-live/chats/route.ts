import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

// GET /api/admin/float-live/chats — List all chat rooms grouped by session date
export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessions = await prisma.floatLiveSession.findMany({
            orderBy: { date: "desc" },
            include: {
                chatRooms: {
                    include: {
                        messages: {
                            orderBy: { createdAt: "asc" },
                            select: {
                                id: true,
                                senderId: true,
                                content: true,
                                createdAt: true,
                            },
                        },
                        voiceTranscripts: {
                            orderBy: { createdAt: "asc" },
                            select: {
                                id: true,
                                senderId: true,
                                content: true,
                                createdAt: true,
                            },
                        },
                        participantA: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true },
                                },
                            },
                        },
                        participantB: {
                            include: {
                                user: {
                                    select: { id: true, name: true, email: true },
                                },
                            },
                        },
                        reports: {
                            select: { id: true, reason: true, status: true },
                        },
                    },
                },
            },
        });

        // Transform into date-grouped structure
        const grouped = sessions
            .filter((s) => s.chatRooms.length > 0)
            .map((session) => ({
                sessionId: session.id,
                date: session.date.toISOString(),
                chatRooms: session.chatRooms.map((room) => ({
                    id: room.id,
                    intention: room.intention,
                    startedAt: room.startedAt,
                    endedAt: room.endedAt,
                    participantA: {
                        userId: room.participantA.user.id,
                        name: room.participantA.user.name,
                        email: room.participantA.user.email,
                        character: room.participantA.character,
                    },
                    participantB: {
                        userId: room.participantB.user.id,
                        name: room.participantB.user.name,
                        email: room.participantB.user.email,
                        character: room.participantB.character,
                    },
                    messages: room.messages,
                    voiceTranscripts: room.voiceTranscripts,
                    hasReports: room.reports.length > 0,
                    reportCount: room.reports.length,
                })),
            }));

        return NextResponse.json({ sessions: grouped });
    } catch (error) {
        console.error("Admin chats list error:", error);
        return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }
}

// DELETE /api/admin/float-live/chats — Delete all chats for a specific session date
export async function DELETE(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }

        // Verify session exists
        const session = await prisma.floatLiveSession.findUnique({
            where: { id: sessionId },
            include: { chatRooms: { select: { id: true } } },
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const chatRoomIds = session.chatRooms.map((r) => r.id);

        if (chatRoomIds.length > 0) {
            // Delete in correct FK order: messages/transcripts → reports → chatRooms
            await prisma.floatLiveVoiceTranscript.deleteMany({
                where: { chatRoomId: { in: chatRoomIds } },
            });

            await prisma.floatLiveChatMessage.deleteMany({
                where: { chatRoomId: { in: chatRoomIds } },
            });

            await prisma.floatLiveReport.deleteMany({
                where: { chatRoomId: { in: chatRoomIds } },
            });

            await prisma.floatLiveChatRoom.deleteMany({
                where: { id: { in: chatRoomIds } },
            });
        }

        return NextResponse.json({
            success: true,
            deleted: { chatRooms: chatRoomIds.length },
        });
    } catch (error) {
        console.error("Admin delete chats error:", error);
        return NextResponse.json({ error: "Failed to delete chats" }, { status: 500 });
    }
}
