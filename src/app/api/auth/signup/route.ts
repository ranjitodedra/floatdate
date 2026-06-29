import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import {
    hashPassword,
    getUniversityByEmail,
} from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/send-match-email";
import {
    uploadVerificationDoc,
    deleteVerificationDoc,
    validateVerificationImage,
    isGmailAddress,
    ADMIN_GMAIL,
} from "@/lib/supabase-admin";
import { VERIFICATION_METHOD } from "@/lib/verification";
import { normalizeReferralCode } from "@/lib/referral";

const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required").max(100),
    age: z.number().int().min(17, "Must be at least 17").max(100),
    gender: z.enum(["male", "female", "nonbinary"]),
    genderPref: z.enum(["male", "female", "any"]),
    city: z.string().min(1, "City is required").max(100),
    bio: z.string().max(500).optional(),
    referralCode: z.string().max(20).optional(),
});

interface SignupFields {
    email: string;
    password: string;
    name: string;
    age: number;
    gender: "male" | "female" | "nonbinary";
    genderPref: "male" | "female" | "any";
    city: string;
    bio?: string;
}

async function resolveUniversity(
    normalizedEmail: string,
    universityId?: string
): Promise<{ id: string } | null> {
    if (normalizedEmail === ADMIN_GMAIL) {
        return getUniversityByEmail(normalizedEmail);
    }

    if (isGmailAddress(normalizedEmail)) {
        if (!universityId) return null;
        return prisma.university.findUnique({
            where: { id: universityId },
            select: { id: true },
        });
    }

    return getUniversityByEmail(normalizedEmail);
}

async function upsertPendingSignup(params: {
    fields: SignupFields;
    universityId: string;
    verificationMethod: string;
    verificationDocPath: string | null;
    referralCode?: string | null;
}) {
    const { fields, universityId, verificationMethod, verificationDocPath, referralCode } =
        params;
    const normalizedEmail = fields.email.toLowerCase();
    const passwordHash = await hashPassword(fields.password);

    const existingPending = await prisma.pendingSignup.findUnique({
        where: { email: normalizedEmail },
    });

    let verifyToken: string;
    let verifyTokenExpiry: Date;

    if (existingPending && existingPending.verifyTokenExpiry > new Date()) {
        verifyToken = existingPending.verifyToken;
        verifyTokenExpiry = existingPending.verifyTokenExpiry;
    } else {
        verifyToken = randomUUID();
        verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    // Remove old document if replacing with a new upload
    if (
        existingPending?.verificationDocPath &&
        verificationDocPath &&
        existingPending.verificationDocPath !== verificationDocPath
    ) {
        await deleteVerificationDoc(existingPending.verificationDocPath);
    }

    await prisma.pendingSignup.upsert({
        where: { email: normalizedEmail },
        update: {
            name: fields.name,
            age: fields.age,
            gender: fields.gender,
            genderPref: fields.genderPref,
            city: fields.city,
            bio: fields.bio || null,
            passwordHash,
            universityId,
            verifyToken,
            verifyTokenExpiry,
            verificationMethod,
            verificationDocPath,
            referralCode: referralCode ?? null,
        },
        create: {
            email: normalizedEmail,
            name: fields.name,
            age: fields.age,
            gender: fields.gender,
            genderPref: fields.genderPref,
            city: fields.city,
            bio: fields.bio || null,
            passwordHash,
            universityId,
            verifyToken,
            verifyTokenExpiry,
            verificationMethod,
            verificationDocPath,
            referralCode: referralCode ?? null,
        },
    });

    return { normalizedEmail, verifyToken };
}

async function handleJsonSignup(body: unknown) {
    const result = signupSchema.safeParse(body);
    if (!result.success) {
        return NextResponse.json(
            { error: result.error.issues[0].message },
            { status: 400 }
        );
    }

    const fields = result.data;
    const normalizedEmail = fields.email.toLowerCase();

    if (isGmailAddress(normalizedEmail) && normalizedEmail !== ADMIN_GMAIL) {
        return NextResponse.json(
            {
                error: "Gmail signups require document verification. Please select your university and upload a transcript or student ID.",
            },
            { status: 400 }
        );
    }

    const university = await resolveUniversity(normalizedEmail);
    if (!university) {
        return NextResponse.json(
            {
                error: "Only supported university emails are allowed (e.g. @mylaurier.ca, @uwaterloo.ca)",
            },
            { status: 400 }
        );
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (existingUser) {
        return NextResponse.json(
            { error: "An account with this email already exists" },
            { status: 409 }
        );
    }

    const { verifyToken } = await upsertPendingSignup({
        fields,
        universityId: university.id,
        verificationMethod: VERIFICATION_METHOD.EMAIL_DOMAIN,
        verificationDocPath: null,
        referralCode: normalizeReferralCode(fields.referralCode),
    });

    const emailResult = await sendVerificationEmail(
        normalizedEmail,
        fields.name,
        verifyToken
    );
    console.log(
        `Verification email to ${normalizedEmail}: ${emailResult.status}`
    );

    const emailFailed = emailResult.status === "failed";

    return NextResponse.json(
        {
            success: true,
            message: emailFailed
                ? "We couldn't send the verification email. Please try again or use the resend option."
                : "Please check your email to verify your account. Your account will be created once you verify.",
            requiresVerification: true,
            emailFailed,
        },
        { status: 201 }
    );
}

async function handleMultipartSignup(formData: FormData) {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();
    const ageRaw = String(formData.get("age") || "");
    const gender = String(formData.get("gender") || "");
    const genderPref = String(formData.get("genderPref") || "");
    const city = String(formData.get("city") || "").trim();
    const bio = String(formData.get("bio") || "").trim();
    const universityId = String(formData.get("universityId") || "").trim();
    const document = formData.get("document");
    const referralCodeRaw = String(formData.get("referralCode") || "").trim();

    const parsed = signupSchema.safeParse({
        email,
        password,
        name,
        age: parseInt(ageRaw, 10),
        gender,
        genderPref,
        city,
        bio: bio || undefined,
        referralCode: referralCodeRaw || undefined,
    });

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 }
        );
    }

    const fields = parsed.data;
    const normalizedEmail = fields.email.toLowerCase();

    if (!isGmailAddress(normalizedEmail) && normalizedEmail !== ADMIN_GMAIL) {
        return NextResponse.json(
            {
                error: "Document verification is only available for Gmail addresses. Please use your university email.",
            },
            { status: 400 }
        );
    }

    if (normalizedEmail !== ADMIN_GMAIL) {
        if (!universityId) {
            return NextResponse.json(
                { error: "Please select your university." },
                { status: 400 }
            );
        }

        if (!(document instanceof File) || document.size === 0) {
            return NextResponse.json(
                {
                    error: "Please upload a transcript or student ID image for verification.",
                },
                { status: 400 }
            );
        }

        const imageError = validateVerificationImage(document);
        if (imageError) {
            return NextResponse.json({ error: imageError }, { status: 400 });
        }
    }

    const university = await resolveUniversity(
        normalizedEmail,
        universityId || undefined
    );
    if (!university) {
        return NextResponse.json(
            { error: "Please select a valid university." },
            { status: 400 }
        );
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (existingUser) {
        return NextResponse.json(
            { error: "An account with this email already exists" },
            { status: 409 }
        );
    }

    let verificationDocPath: string | null = null;
    let verificationMethod: string = VERIFICATION_METHOD.EMAIL_DOMAIN;

    if (
        normalizedEmail !== ADMIN_GMAIL &&
        document instanceof File &&
        document.size > 0
    ) {
        const bytes = Buffer.from(await document.arrayBuffer());
        verificationDocPath = await uploadVerificationDoc(bytes, document.type);
        verificationMethod = VERIFICATION_METHOD.DOCUMENT;
    }

    const { verifyToken } = await upsertPendingSignup({
        fields,
        universityId: university.id,
        verificationMethod,
        verificationDocPath,
        referralCode: normalizeReferralCode(fields.referralCode),
    });

    const emailResult = await sendVerificationEmail(
        normalizedEmail,
        fields.name,
        verifyToken
    );
    console.log(
        `Verification email to ${normalizedEmail}: ${emailResult.status}`
    );

    const emailFailed = emailResult.status === "failed";

    return NextResponse.json(
        {
            success: true,
            message: emailFailed
                ? "We couldn't send the verification email. Please try again or use the resend option."
                : "Please check your email to verify your account. Your account will be created once you verify.",
            requiresVerification: true,
            emailFailed,
        },
        { status: 201 }
    );
}

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            return handleMultipartSignup(formData);
        }

        const body = await req.json();
        return handleJsonSignup(body);
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
