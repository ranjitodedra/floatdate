import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { clearImpersonationSession } from "@/lib/auth";

export async function POST() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await clearImpersonationSession();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Clear impersonation error:", error);
        return NextResponse.json(
            { error: "Failed to clear impersonation session" },
            { status: 500 }
        );
    }
}
