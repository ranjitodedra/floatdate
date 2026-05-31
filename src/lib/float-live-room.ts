import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

/** Create or refresh per-user room presence rows after a match. */
export async function ensureRoomParticipants(
    tx: Tx,
    roomId: string,
    participantAId: string,
    participantBId: string,
    userAId: string,
    userBId: string
): Promise<void> {
    const now = new Date();

    const upsertOne = async (
        userId: string,
        participantId: string,
        role: "A" | "B"
    ) => {
        const existing = await tx.floatLiveRoomParticipant.findUnique({
            where: { roomId_userId: { roomId, userId } },
        });

        if (existing) {
            await tx.floatLiveRoomParticipant.update({
                where: { id: existing.id },
                data: {
                    participantId,
                    role,
                    status: "online",
                    lastSeenAt: now,
                    awaySince: null,
                },
            });
            return;
        }

        await tx.floatLiveRoomParticipant.create({
            data: {
                id: randomUUID(),
                roomId,
                participantId,
                userId,
                role,
                status: "online",
                lastSeenAt: now,
            },
        });
    };

    await upsertOne(userAId, participantAId, "A");
    await upsertOne(userBId, participantBId, "B");
}

/** End a room with explicit lifecycle fields (keeps isActive in sync for realtime). */
export async function endChatRoom(
    tx: Tx,
    roomId: string,
    endedReason: string
): Promise<void> {
    const now = new Date();
    const room = await tx.floatLiveChatRoom.update({
        where: { id: roomId },
        data: {
            isActive: false,
            status: "ended",
            endedReason,
            endedAt: now,
        },
    });

    await tx.floatLiveRoomParticipant.updateMany({
        where: { roomId },
        data: { status: "left" },
    });

    // Reconcile queue state: neither participant should stay stuck as "matched"
    // once the room is over. The caller may further mark the leaver as "left".
    await tx.floatLiveParticipant.updateMany({
        where: {
            id: { in: [room.participantAId, room.participantBId] },
            status: "matched",
        },
        data: { status: "idle" },
    });
}

/** Mark queue participants matched for a session pair. */
export async function markParticipantsMatched(
    tx: Tx,
    participantAId: string,
    participantBId: string
): Promise<void> {
    await tx.floatLiveParticipant.updateMany({
        where: { id: { in: [participantAId, participantBId] } },
        data: { status: "matched" },
    });
}
