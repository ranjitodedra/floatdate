import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin-auth";
import { isReferralUnlocked } from "@/lib/referral";

export function isReferralGateEnabled(): boolean {
    return process.env.REFERRAL_GATE_ENABLED === "true";
}

export async function requireReferralUnlock(
    userId: string
): Promise<NextResponse | null> {
    if (!isReferralGateEnabled()) return null;

    const isAdmin = await isAdminUserId(userId);
    if (isAdmin) return null;

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
