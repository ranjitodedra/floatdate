import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const applicationSchema = z
    .object({
        role: z.enum(["spotlight", "panel", "either"], {
            message: "Please select a role",
        }),
        fullName: z.string().min(1, "Full name is required").max(200),
        age: z.number().int().min(18, "You must be 18 or older"),
        pronouns: z.string().max(50).optional().nullable(),
        yearOfStudy: z.enum(
            ["1st year", "2nd year", "3rd year", "4th year", "Graduate", "Other"],
            { message: "Please select your year of study" }
        ),
        program: z.string().min(1, "Program / major is required").max(200),
        email: z.string().email("Invalid email address"),
        socialHandle: z.string().min(1, "Instagram or TikTok handle is required").max(100),
        datingGenders: z
            .array(z.enum(["men", "women", "nonbinary", "all"]))
            .min(1, "Select at least one gender preference"),
        ageRangeMin: z.number().int().min(18).max(40),
        ageRangeMax: z.number().int().min(18).max(40),
        lookingFor: z.enum(["casual", "serious", "either"], {
            message: "Please select what you are looking for",
        }),
        threeWords: z.string().min(1, "Three words are required").max(30),
        unexpected: z.string().min(1, "This field is required").max(300),
        bringToRelationship: z.string().min(1, "This field is required").max(300),
        dealbreaker: z.string().min(1, "This field is required").max(400),
        questionToAsk: z.string().min(1, "This field is required").max(200),
        controversialOpinion: z.string().min(1, "This field is required").max(300),
        balloonPoppedFeeling: z.string().min(1, "This field is required").max(400),
        inRelationship: z.boolean(),
        partnerKnows: z.enum(["yes", "no"]).optional().nullable(),
        previousHistory: z.enum(["yes", "no", "not_sure"], {
            message: "Please answer the previous history question",
        }),
        uncomfortableWith: z.string().max(200).optional().nullable(),
        availability: z
            .array(
                z.enum([
                    "late_august",
                    "early_september",
                    "late_september",
                    "october",
                ])
            )
            .min(1, "Select at least one availability window"),
        cannotAttendDates: z.string().max(500).optional().nullable(),
        preShowBriefing: z.enum(["yes", "no", "maybe"], {
            message: "Please answer the pre-show briefing question",
        }),
        anythingElse: z.string().max(400).optional().nullable(),
        consentRecorded: z.literal(true, {
            message: "You must agree to all required consent items",
        }),
        consentNoDiscrimination: z.literal(true, {
            message: "You must agree to all required consent items",
        }),
        consentPhotography: z.literal(true, {
            message: "You must agree to all required consent items",
        }),
        consentLiveFormat: z.literal(true, {
            message: "You must agree to all required consent items",
        }),
        consentVoluntary: z.literal(true, {
            message: "You must agree to all required consent items",
        }),
        waitlistOptIn: z.boolean().optional().default(false),
    })
    .superRefine((data, ctx) => {
        if (data.ageRangeMin > data.ageRangeMax) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Minimum age cannot exceed maximum age",
                path: ["ageRangeMin"],
            });
        }
        if (data.inRelationship && !data.partnerKnows) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please indicate whether your partner knows you are applying",
                path: ["partnerKnows"],
            });
        }
    });

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAuth();
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const result = applicationSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues[0].message },
                { status: 400 }
            );
        }

        const data = result.data;

        const application = await prisma.campusShowApplication.create({
            data: {
                userId: auth.userId,
                role: data.role,
                fullName: data.fullName.trim(),
                age: data.age,
                pronouns: data.pronouns?.trim() || null,
                yearOfStudy: data.yearOfStudy,
                program: data.program.trim(),
                email: data.email.toLowerCase().trim(),
                socialHandle: data.socialHandle.trim(),
                datingGenders: data.datingGenders,
                ageRangeMin: data.ageRangeMin,
                ageRangeMax: data.ageRangeMax,
                lookingFor: data.lookingFor,
                threeWords: data.threeWords.trim(),
                unexpected: data.unexpected.trim(),
                bringToRelationship: data.bringToRelationship.trim(),
                dealbreaker: data.dealbreaker.trim(),
                questionToAsk: data.questionToAsk.trim(),
                controversialOpinion: data.controversialOpinion.trim(),
                balloonPoppedFeeling: data.balloonPoppedFeeling.trim(),
                inRelationship: data.inRelationship,
                partnerKnows: data.inRelationship ? data.partnerKnows ?? null : null,
                previousHistory: data.previousHistory,
                uncomfortableWith: data.uncomfortableWith?.trim() || null,
                availability: data.availability,
                cannotAttendDates: data.cannotAttendDates?.trim() || null,
                preShowBriefing: data.preShowBriefing,
                anythingElse: data.anythingElse?.trim() || null,
                consentRecorded: data.consentRecorded,
                consentNoDiscrimination: data.consentNoDiscrimination,
                consentPhotography: data.consentPhotography,
                consentLiveFormat: data.consentLiveFormat,
                consentVoluntary: data.consentVoluntary,
                waitlistOptIn: data.waitlistOptIn ?? false,
            },
        });

        // TODO: send confirmation email via @/lib/email when ready

        return NextResponse.json(
            {
                success: true,
                message: "You're in the pool! We'll be in touch before the event.",
                application: { id: application.id },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Campus show application error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
