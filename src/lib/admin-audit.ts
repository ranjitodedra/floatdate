import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AdminAuditAction =
    | "impersonation_start"
    | "impersonation_stop"
    | "email_reveal"
    | "report_submit"
    | "application_submit"
    | "manual_verify";

export async function logAdminAudit(params: {
    actorUserId: string;
    targetUserId?: string | null;
    action: AdminAuditAction;
    metadata?: Prisma.InputJsonValue;
}): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: {
                actorUserId: params.actorUserId,
                targetUserId: params.targetUserId ?? null,
                action: params.action,
                metadata: params.metadata ?? undefined,
            },
        });
    } catch (error) {
        console.error("Failed to write admin audit log:", error);
    }
}

export async function logImpersonatedAction(
    auth: { userId: string; actorUserId: string; isImpersonating: boolean },
    action: AdminAuditAction,
    metadata?: Prisma.InputJsonValue
): Promise<void> {
    if (!auth.isImpersonating) return;

    await logAdminAudit({
        actorUserId: auth.actorUserId,
        targetUserId: auth.userId,
        action,
        metadata,
    });
}
