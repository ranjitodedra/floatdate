import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { clearImpersonationSession, getSessionContext } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";

export async function POST() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const context = await getSessionContext();

        await clearImpersonationSession();

        if (context?.isImpersonating) {
            await logAdminAudit({
                actorUserId: admin.id,
                targetUserId: context.effectiveUserId,
                action: "impersonation_stop",
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Clear impersonation error:", error);
        return NextResponse.json(
            { error: "Failed to clear impersonation session" },
            { status: 500 }
        );
    }
}
