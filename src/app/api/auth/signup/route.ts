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

        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);
        const verifyToken = randomUUID();
        const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name,
                age,
                gender,
                genderPref,
                city,
                bio: bio || null,
                passwordHash,
                verifyToken,
                verifyTokenExpiry,
                emailVerified: false,
            },
        });

        // Send verification email
        const emailResult = await sendVerificationEmail(user.email, user.name, verifyToken);
        console.log(`Verification email to ${user.email}: ${emailResult.status}`);

        return NextResponse.json(
            {
                success: true,
                message: "Account created. Please check your email to verify your account.",
                requiresVerification: true,
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
