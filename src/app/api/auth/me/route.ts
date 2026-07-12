import { NextResponse } from "next/server";
import { getCurrentUser, getSessionContext } from "@/lib/auth";
import { isAdminUserId } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const [user, session] = await Promise.all([
            getCurrentUser(),
            getSessionContext(),
        ]);
        if (!user || !session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = await isAdminUserId(session.effectiveUserId);

        let actor = null;
        if (session.isImpersonating) {
            actor = await prisma.user.findUnique({
                where: { id: session.actorUserId },
                select: { id: true, name: true, email: true },
            });
        }

        return NextResponse.json({
            user,
            isAdmin,
            session: {
                isImpersonating: session.isImpersonating,
                actor,
            },
        });
    } catch (error) {
        console.error("Get user error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
