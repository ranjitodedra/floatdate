import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, isValidLaurierEmail } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/send-match-email";
import { randomUUID } from "crypto";

const signupSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .refine((e) => isValidLaurierEmail(e), {
            message: "Only @mylaurier.ca emails are allowed",
        }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Name is required").max(100),
    age: z.number().int().min(17, "Must be at least 17").max(100),
    gender: z.enum(["male", "female", "nonbinary"]),
    genderPref: z.enum(["male", "female", "any"]),
    city: z.string().min(1, "City is required").max(100),
    bio: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = signupSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email, password, name, age, gender, genderPref, city, bio } =
            result.data;

        // Double-check Laurier email server-side
        if (!isValidLaurierEmail(email)) {
            return NextResponse.json(
                { error: "Only @mylaurier.ca emails are allowed" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase();

        // Check if a verified user already exists
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);

        // Check if a pending signup already exists with a valid token
        const existingPending = await prisma.pendingSignup.findUnique({
            where: { email: normalizedEmail },
        });

        let verifyToken: string;
        let verifyTokenExpiry: Date;

        if (existingPending && existingPending.verifyTokenExpiry > new Date()) {
            // Reuse existing valid token so previously sent emails remain valid
            verifyToken = existingPending.verifyToken;
            verifyTokenExpiry = existingPending.verifyTokenExpiry;
        } else {
            // Generate new token if none exists or existing one is expired
            verifyToken = randomUUID();
            verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }

        // Upsert into PendingSignup (so re-signups before verification just refresh the token)
        await prisma.pendingSignup.upsert({
            where: { email: normalizedEmail },
            update: {
                name,
                age,
                gender,
                genderPref,
                city,
                bio: bio || null,
                passwordHash,
                verifyToken,
                verifyTokenExpiry,
            },
            create: {
                email: normalizedEmail,
                name,
                age,
                gender,
                genderPref,
                city,
                bio: bio || null,
                passwordHash,
                verifyToken,
                verifyTokenExpiry,
            },
        });

        // Send verification email
        const emailResult = await sendVerificationEmail(normalizedEmail, name, verifyToken);
        console.log(`Verification email to ${normalizedEmail}: ${emailResult.status}`);

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
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
