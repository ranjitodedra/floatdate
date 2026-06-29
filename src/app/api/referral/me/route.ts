import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
    buildReferralLink,
    ensureReferralCode,
    getReferralCount,
    isReferralUnlocked,
} from "@/lib/referral";

export async function GET() {
    try {
        const auth = await requireAuth();
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const code = await ensureReferralCode(auth.userId);
        const count = await getReferralCount(auth.userId);
        const unlocked = await isReferralUnlocked(auth.userId);

        return NextResponse.json({
            code,
            link: buildReferralLink(code),
            count,
            unlocked,
        });
    } catch (error) {
        console.error("Referral status error:", error);
        return NextResponse.json(
            { error: "Failed to fetch referral status" },
            { status: 500 }
        );
    }
}
