import { getBaseSession } from "./auth";
import { prisma } from "./db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "ranjitodedra.dev@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase());

export async function requireAdmin() {
    const session = await getBaseSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, name: true },
    });

    if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return null;
    }

    return user;
}
