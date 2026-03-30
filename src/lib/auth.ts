import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "floatdate_session";
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-in-production"
);

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
    const token = await new SignJWT({ userId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .setIssuedAt()
        .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });
}

export async function getSession(): Promise<{ userId: string } | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return { userId: payload.userId as string };
    } catch {
        return null;
    }
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}

export async function requireAuth(): Promise<{
    userId: string;
} | null> {
    const session = await getSession();
    if (!session) return null;
    return session;
}

export async function getCurrentUser() {
    const session = await getSession();
    if (!session) return null;
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            id: true,
            email: true,
            name: true,
            age: true,
            gender: true,
            genderPref: true,
            city: true,
            bio: true,
            universityId: true,
            completedSetup: true,
            createdAt: true,
        },
    });
    return user;
}

/**
 * Look up the University record for an email address based on its domain.
 * Returns null if the email domain is not recognized.
 * Admin email (ranjitodedra.dev@gmail.com) falls back to Laurier.
 */
export async function getUniversityByEmail(email: string): Promise<{ id: string; slug: string; name: string; campuses: unknown } | null> {
    const normalizedEmail = email.toLowerCase();

    // Admin exception — map to Laurier
    if (normalizedEmail === "ranjitodedra.dev@gmail.com") {
        return prisma.university.findUnique({
            where: { slug: "laurier" },
            select: { id: true, slug: true, name: true, campuses: true },
        });
    }

    const domain = normalizedEmail.split("@")[1];
    if (!domain) return null;

    return prisma.university.findUnique({
        where: { emailDomain: domain },
        select: { id: true, slug: true, name: true, campuses: true },
    });
}

/**
 * Simple boolean check: is this a supported university email?
 * Backward-compatible replacement for isValidLaurierEmail.
 */
export async function isValidUniversityEmail(email: string): Promise<boolean> {
    const uni = await getUniversityByEmail(email);
    return uni !== null;
}

// Keep backward compat — deprecated, use isValidUniversityEmail instead
export function isValidLaurierEmail(email: string): boolean {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail === "ranjitodedra.dev@gmail.com") {
        return true;
    }
    return normalizedEmail.endsWith("@mylaurier.ca");
}
