import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "floatdate_session";
const IMPERSONATION_COOKIE = "floatdate_impersonation";
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-in-production"
);
const IMPERSONATION_TTL_SECONDS = 60 * 30; // 30 minutes

interface ImpersonationPayload {
    actorUserId: string;
    targetUserId: string;
}

export interface SessionContext {
    actorUserId: string;
    effectiveUserId: string;
    isImpersonating: boolean;
}

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

export async function getBaseSession(): Promise<{ userId: string } | null> {
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

async function getImpersonationPayload(): Promise<ImpersonationPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const actorUserId = payload.actorUserId as string | undefined;
        const targetUserId = payload.targetUserId as string | undefined;
        if (!actorUserId || !targetUserId) return null;
        return { actorUserId, targetUserId };
    } catch {
        return null;
    }
}

export async function getSessionContext(): Promise<SessionContext | null> {
    const baseSession = await getBaseSession();
    if (!baseSession) return null;

    const impersonation = await getImpersonationPayload();
    if (
        impersonation &&
        impersonation.actorUserId === baseSession.userId &&
        impersonation.targetUserId !== baseSession.userId
    ) {
        return {
            actorUserId: baseSession.userId,
            effectiveUserId: impersonation.targetUserId,
            isImpersonating: true,
        };
    }

    return {
        actorUserId: baseSession.userId,
        effectiveUserId: baseSession.userId,
        isImpersonating: false,
    };
}

export async function getSession(): Promise<{ userId: string } | null> {
    const context = await getSessionContext();
    if (!context) return null;
    return { userId: context.effectiveUserId };
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function createImpersonationSession(
    actorUserId: string,
    targetUserId: string
): Promise<void> {
    const token = await new SignJWT({ actorUserId, targetUserId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(`${IMPERSONATION_TTL_SECONDS}s`)
        .setIssuedAt()
        .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: IMPERSONATION_TTL_SECONDS,
        path: "/",
    });
}

export async function clearImpersonationSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function requireAuth(): Promise<{
    userId: string;
    actorUserId: string;
    isImpersonating: boolean;
} | null> {
    const session = await getSessionContext();
    if (!session) return null;
    return {
        userId: session.effectiveUserId,
        actorUserId: session.actorUserId,
        isImpersonating: session.isImpersonating,
    };
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
            university: {
                select: { id: true, name: true },
            },
            completedSetup: true,
            verificationStatus: true,
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
