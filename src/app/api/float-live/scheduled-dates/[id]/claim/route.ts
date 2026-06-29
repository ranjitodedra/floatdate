import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
    VALID_CHARACTERS,
    canJoinScheduledDate,
    formatScheduledAtLabel,
} from "@/lib/float-live-scheduled";
import {
    sendScheduledDateClaimedToCreator,
    sendScheduledDateClaimedToJoiner,
} from "@/lib/send-match-email";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authSession = await requireAuth();
        if (!authSession) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { character } = body;

        const joinerCharacter = VALID_CHARACTERS.includes(character) ? character : "A";

        const joiner = await prisma.user.findUnique({
            where: { id: authSession.userId },
            select: { id: true, gender: true, universityId: true, name: true, email: true },
        });

        if (!joiner) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const preference = "any";

        let claimedDate: {
            id: string;
            creatorId: string;
            scheduledAt: Date;
            intention: string;
        } | null = null;

        try {
            claimedDate = await prisma.$transaction(async (tx) => {
                const locked = await tx.$queryRaw<{ id: string; status: string; creatorId: string; scheduledAt: Date; intention: string; gender: string; preference: string; universityId: string }[]>`
                    SELECT id, status, "creatorId", "scheduledAt", intention, gender, preference, "universityId"
                    FROM "FloatLiveScheduledDate"
                    WHERE id = ${id}
                    FOR UPDATE NOWAIT
                `;

                if (locked.length === 0) {
                    throw new Error("NOT_FOUND");
                }

                const row = locked[0];

                if (row.status !== "open") {
                    throw new Error("NOT_OPEN");
                }

                if (row.creatorId === authSession.userId) {
                    throw new Error("SELF_CLAIM");
                }

                const joinerProfile = {
                    gender: joiner.gender,
                    preference,
                    intention: row.intention,
                    universityId: joiner.universityId,
                };

                if (!canJoinScheduledDate(joinerProfile, row)) {
                    throw new Error("INCOMPATIBLE");
                }

                const now = new Date();
                if (row.scheduledAt <= now) {
                    throw new Error("PAST");
                }

                await tx.floatLiveScheduledDate.update({
                    where: { id },
                    data: {
                        status: "claimed",
                        joinerId: authSession.userId,
                        joinerCharacter,
                        claimedAt: now,
                    },
                });

                return {
                    id: row.id,
                    creatorId: row.creatorId,
                    scheduledAt: row.scheduledAt,
                    intention: row.intention,
                };
            });
        } catch (err) {
            if (err instanceof Error) {
                if (err.message === "NOT_FOUND") {
                    return NextResponse.json({ error: "Scheduled date not found" }, { status: 404 });
                }
                if (err.message === "NOT_OPEN") {
                    return NextResponse.json(
                        { error: "This date is no longer available" },
                        { status: 409 }
                    );
                }
                if (err.message === "SELF_CLAIM") {
                    return NextResponse.json({ error: "You cannot join your own date" }, { status: 400 });
                }
                if (err.message === "INCOMPATIBLE") {
                    return NextResponse.json({ error: "You are not compatible with this date" }, { status: 400 });
                }
                if (err.message === "PAST") {
                    return NextResponse.json({ error: "This date has already passed" }, { status: 400 });
                }
            }

            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                (err.code === "P2034" || err.message.includes("could not obtain lock"))
            ) {
                return NextResponse.json(
                    { error: "This date was just claimed by someone else" },
                    { status: 409 }
                );
            }
            if (err instanceof Error && err.message.includes("55P03")) {
                return NextResponse.json(
                    { error: "This date was just claimed by someone else" },
                    { status: 409 }
                );
            }

            throw err;
        }

        const creator = await prisma.user.findUnique({
            where: { id: claimedDate!.creatorId },
            select: { name: true, email: true },
        });

        const scheduledAtLabel = formatScheduledAtLabel(claimedDate!.scheduledAt);

        if (creator) {
            await sendScheduledDateClaimedToCreator(creator.email, creator.name, scheduledAtLabel);
        }
        await sendScheduledDateClaimedToJoiner(joiner.email, joiner.name, scheduledAtLabel);

        return NextResponse.json({
            ok: true,
            scheduledAtLabel,
            message: `You're matched for ${scheduledAtLabel}. Return when it's time to join.`,
        });
    } catch (error) {
        console.error("Float Live scheduled-dates claim error:", error);
        return NextResponse.json({ error: "Failed to claim scheduled date" }, { status: 500 });
    }
}
