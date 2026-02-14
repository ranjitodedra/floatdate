import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, isValidLaurierEmail } from "@/lib/auth";

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
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        const passwordHash = await hashPassword(password);

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
            },
        });

        await createSession(user.id);

        return NextResponse.json(
            { success: true, userId: user.id },
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
