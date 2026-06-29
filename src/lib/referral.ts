import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;
const MAX_COLLISION_RETRIES = 12;

export function normalizeReferralCode(code: string | null | undefined): string | null {
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
}

export function generateReferralCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    }
    return code;
}

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
    );
}

export async function generateUniqueReferralCode(
    tx?: Prisma.TransactionClient
): Promise<string> {
    const client = tx ?? prisma;
    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
        const code = generateReferralCode();
        const existing = await client.user.findUnique({
            where: { referralCode: code },
            select: { id: true },
        });
        if (!existing) return code;
    }
    throw new Error("Failed to generate a unique referral code");
}

export function buildReferralLink(code: string): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.floatdate.com";
    return `${base.replace(/\/$/, "")}/?ref=${code}`;
}

export async function getReferralCount(userId: string): Promise<number> {
    return prisma.referral.count({
        where: { referrerUserId: userId },
    });
}

export async function isReferralUnlocked(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referredByCode: true },
    });
    if (user?.referredByCode) return true;
    const count = await getReferralCount(userId);
    return count >= 1;
}

export async function ensureReferralCode(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
    });

    if (user?.referralCode) return user.referralCode;

    for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
        const code = generateReferralCode();
        try {
            const result = await prisma.user.updateMany({
                where: { id: userId, referralCode: null },
                data: { referralCode: code },
            });
            if (result.count > 0) return code;
        } catch (error) {
            if (isUniqueViolation(error)) continue;
            throw error;
        }

        const refreshed = await prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true },
        });
        if (refreshed?.referralCode) return refreshed.referralCode;
    }

    throw new Error("Failed to assign referral code");
}

export async function attributeReferral(
    tx: Prisma.TransactionClient,
    params: {
        newUserId: string;
        newUserEmail: string;
        newUserReferralCode: string;
        pendingReferralCode: string | null | undefined;
    }
): Promise<void> {
    const code = normalizeReferralCode(params.pendingReferralCode);
    if (!code) return;

    if (code === params.newUserReferralCode) return;

    const referrer = await tx.user.findFirst({
        where: { referralCode: code },
        select: { id: true, email: true },
    });

    if (!referrer) return;
    if (referrer.id === params.newUserId) return;
    if (referrer.email.toLowerCase() === params.newUserEmail.toLowerCase()) return;

    await tx.user.update({
        where: { id: params.newUserId },
        data: { referredByCode: code },
    });

    try {
        await tx.referral.create({
            data: {
                referrerUserId: referrer.id,
                referredUserId: params.newUserId,
                status: "completed",
            },
        });
    } catch (error) {
        if (!isUniqueViolation(error)) throw error;
    }
}
