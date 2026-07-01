import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isReferralUnlocked } from "@/lib/referral";
import { VERIFICATION_STATUS } from "@/lib/verification";

export async function requireReferralUnlock(
    userId: string
): Promise<NextResponse | null> {
    const unlocked = await isReferralUnlocked(userId);
    if (!unlocked) {
        return NextResponse.json(
            {
                error: "Invite one friend to unlock this feature",
                code: "referral_required",
            },
            { status: 403 }
        );
    }
    return null;
}

export async function requireApprovedUser(
    userId: string
): Promise<NextResponse | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { verificationStatus: true },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.verificationStatus !== VERIFICATION_STATUS.APPROVED) {
        return NextResponse.json(
            {
                error: "Your account must be verified before using Float Live",
                code: "verification_required",
                verificationStatus: user.verificationStatus,
            },
            { status: 403 }
        );
    }

    return null;
}

export function isShowApplicationOpen(): boolean {
    const deadline = process.env.SHOW_APPLICATION_DEADLINE;
    if (!deadline) return true;
    const deadlineDate = new Date(deadline);
    if (Number.isNaN(deadlineDate.getTime())) return true;
    return new Date() <= deadlineDate;
}

export function showApplicationClosedResponse(): NextResponse {
    return NextResponse.json(
        {
            error: "Applications are now closed",
            code: "application_closed",
        },
        { status: 403 }
    );
}
