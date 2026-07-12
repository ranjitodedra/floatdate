import { getBaseSession } from "./auth";
import { isAdminEmail } from "./admin-emails";
import { prisma } from "./db";

export { getAdminEmails, getClientAdminEmails, isAdminEmail, isAdminEmailClient } from "./admin-emails";

export async function isAdminUserId(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    return !!user && isAdminEmail(user.email);
}

export async function requireAdmin() {
    const session = await getBaseSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, name: true },
    });

    if (!user || !isAdminEmail(user.email)) {
        return null;
    }

    return user;
}
