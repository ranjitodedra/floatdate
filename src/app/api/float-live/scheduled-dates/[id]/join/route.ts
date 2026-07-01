import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodaySessionTimes } from "@/lib/float-live-time";
import { canonicalParticipantPair } from "@/lib/float-live-presence";
import {
    ensureRoomParticipants,
    markParticipantsMatched,
} from "@/lib/float-live-room";
import { requireReferralUnlock } from "@/lib/guards";
import {
    VALID_CHARACTERS,
    isWithinJoinWindow,
    userGenderPrefToFloatLivePref,
} from "@/lib/float-live-scheduled";

function buildRoomResponse(
    room: {
        id: string;
        participantA: { userId: string; character: string };
        participantB: { userId: string; character: string };
    },
    userId: string
) {
    const isUserA = room.participantA.userId === userId;
    return {
        chatRoomId: room.id,
        userCharacter: isUserA ? room.participantA.character : room.participantB.character,
        partnerCharacter: isUserA ? room.participantB.character : room.participantA.character,
    };
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const referralDenied = await requireReferralUnlock(authSession.userId);
        if (referralDenied) return referralDenied;

        const { id } = await params;
        const body = await req.json();
        const { character } = body;
        const selectedCharacter = VALID_CHARACTERS.includes(character) ? character : "A";

        const date = await prisma.floatLiveScheduledDate.findUnique({
            where: { id },
            include: {
                creator: { select: { id: true, gender: true, genderPref: true, universityId: true } },
                joiner: { select: { id: true, gender: true, genderPref: true, universityId: true } },
            },
        });

        if (!date) {
            return NextResponse.json({ error: "Scheduled date not found" }, { status: 404 });
        }

        const isCreator = date.creatorId === authSession.userId;
        const isJoiner = date.joinerId === authSession.userId;

        if (!isCreator && !isJoiner) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (date.status === "in_progress" && date.chatRoomId) {
            const room = await prisma.floatLiveChatRoom.findUnique({
                where: { id: date.chatRoomId },
                include: {
                    participantA: { select: { userId: true, character: true } },
                    participantB: { select: { userId: true, character: true } },
                },
            });

            if (room && room.isActive) {
                return NextResponse.json(
                    buildRoomResponse(room, authSession.userId)
                );
            }
        }

        if (date.status !== "claimed") {
            return NextResponse.json(
                { error: "This date is not ready to join yet" },
                { status: 400 }
            );
        }

        if (!date.joinerId || !date.joiner) {
            return NextResponse.json({ error: "No joiner on this date" }, { status: 400 });
        }

        if (!isWithinJoinWindow(date.scheduledAt, date.durationMinutes)) {
            return NextResponse.json(
                { error: "The join window for this date is not open yet or has ended" },
                { status: 403 }
            );
        }

        const { date: sessionDate, startTime, endTime } = await getTodaySessionTimes();
        let liveSession = await prisma.floatLiveSession.findFirst({
            where: {
                date: {
                    gte: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate()),
                    lt: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate() + 1),
                },
            },
        });

        if (!liveSession) {
            liveSession = await prisma.floatLiveSession.create({
                data: { date: sessionDate, startTime, endTime },
            });
        }

        const creatorCharacter = isCreator
            ? selectedCharacter
            : date.creatorCharacter || "A";
        const joinerCharacter = isJoiner
            ? selectedCharacter
            : date.joinerCharacter || "A";

        const sessionId = liveSession.id;

        const result = await prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<
                { id: string; status: string; chatRoomId: string | null }[]
            >`
                SELECT id, status, "chatRoomId"
                FROM "FloatLiveScheduledDate"
                WHERE id = ${id}
                FOR UPDATE NOWAIT
            `;

            if (locked.length === 0) {
                throw new Error("NOT_FOUND");
            }

            const fresh = locked[0]!;

            if (fresh.status === "in_progress" && fresh.chatRoomId) {
                const room = await tx.floatLiveChatRoom.findUnique({
                    where: { id: fresh.chatRoomId },
                    include: {
                        participantA: { select: { userId: true, character: true } },
                        participantB: { select: { userId: true, character: true } },
                    },
                });
                if (room) {
                    return buildRoomResponse(room, authSession.userId);
                }
            }

            if (fresh.status !== "claimed") {
                throw new Error("NOT_CLAIMED");
            }

            const characterUpdates: { creatorCharacter?: string; joinerCharacter?: string } = {};
            if (isCreator) characterUpdates.creatorCharacter = selectedCharacter;
            if (isJoiner) characterUpdates.joinerCharacter = selectedCharacter;

            if (Object.keys(characterUpdates).length > 0) {
                await tx.floatLiveScheduledDate.update({
                    where: { id },
                    data: characterUpdates,
                });
            }

            const upsertParticipant = async (
                userId: string,
                gender: string,
                genderPref: string,
                universityId: string,
                char: string
            ) => {
                return tx.floatLiveParticipant.upsert({
                    where: {
                        userId_sessionId: {
                            userId,
                            sessionId,
                        },
                    },
                    update: {
                        gender,
                        preference: userGenderPrefToFloatLivePref(genderPref),
                        intention: date.intention,
                        universityId,
                        character: char,
                        isOnline: true,
                        acceptedTerms: true,
                        leftAt: null,
                        lastSeenAt: new Date(),
                        status: "matched",
                    },
                    create: {
                        userId,
                        sessionId,
                        gender,
                        preference: userGenderPrefToFloatLivePref(genderPref),
                        intention: date.intention,
                        universityId,
                        character: char,
                        acceptedTerms: true,
                        lastSeenAt: new Date(),
                        status: "matched",
                    },
                });
            };

            const participantCreator = await upsertParticipant(
                date.creator.id,
                date.creator.gender,
                date.creator.genderPref,
                date.creator.universityId,
                creatorCharacter
            );

            const participantJoiner = await upsertParticipant(
                date.joiner!.id,
                date.joiner!.gender,
                date.joiner!.genderPref,
                date.joiner!.universityId,
                joinerCharacter
            );

            const [participantAId, participantBId] = canonicalParticipantPair(
                participantCreator.id,
                participantJoiner.id
            );

            const chatRoom = await tx.floatLiveChatRoom.create({
                data: {
                    sessionId,
                    participantAId,
                    participantBId,
                    intention: date.intention,
                    emailRevealedByA: false,
                    emailRevealedByB: false,
                    isActive: true,
                    status: "active",
                },
            });

            await markParticipantsMatched(tx, participantAId, participantBId);
            await ensureRoomParticipants(
                tx,
                chatRoom.id,
                participantAId,
                participantBId,
                date.creator.id,
                date.joiner!.id
            );

            await tx.floatLiveScheduledDate.update({
                where: { id },
                data: {
                    status: "in_progress",
                    chatRoomId: chatRoom.id,
                    creatorCharacter,
                    joinerCharacter,
                },
            });

            const isUserCreator = authSession.userId === date.creator.id;
            return {
                chatRoomId: chatRoom.id,
                userCharacter: isUserCreator ? creatorCharacter : joinerCharacter,
                partnerCharacter: isUserCreator ? joinerCharacter : creatorCharacter,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "NOT_CLAIMED") {
                return NextResponse.json(
                    { error: "This date is not ready to join yet" },
                    { status: 400 }
                );
            }
            if (error.message === "NOT_FOUND") {
                return NextResponse.json(
                    { error: "Scheduled date not found" },
                    { status: 404 }
                );
            }
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === "P2002" ||
                error.code === "P2034" ||
                error.message.includes("could not obtain lock"))
        ) {
            const { id } = await params;
            const existing = await prisma.floatLiveScheduledDate.findUnique({
                where: { id },
                include: {
                    chatRoom: {
                        include: {
                            participantA: { select: { userId: true, character: true } },
                            participantB: { select: { userId: true, character: true } },
                        },
                    },
                },
            });

            if (existing?.chatRoom) {
                const authSession = await requireAuth();
                if (authSession) {
                    return NextResponse.json(
                        buildRoomResponse(existing.chatRoom, authSession.userId)
                    );
                }
            }

            return NextResponse.json(
                { error: "Another user is joining this date. Please retry." },
                { status: 409 }
            );
        }

        if (error instanceof Error && error.message.includes("55P03")) {
            return NextResponse.json(
                { error: "Another user is joining this date. Please retry." },
                { status: 409 }
            );
        }

        console.error("Float Live scheduled-dates join error:", error);
        return NextResponse.json({ error: "Failed to join scheduled date" }, { status: 500 });
    }
}
