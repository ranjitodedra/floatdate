import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get or create settings
        let settings = await prisma.floatLiveSettings.findUnique({
            where: { id: "singleton" },
        });

        if (!settings) {
            settings = await prisma.floatLiveSettings.create({
                data: { id: "singleton", startHour: 17, endHour: 18 },
            });
        }

        return NextResponse.json({
            startHour: settings.startHour,
            endHour: settings.endHour,
        });
    } catch (error) {
        console.error("Float Live settings GET error:", error);
        return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const admin = await requireAdmin();
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { startHour, endHour } = body;

        // Validate
        if (typeof startHour !== "number" || typeof endHour !== "number") {
            return NextResponse.json({ error: "startHour and endHour must be numbers" }, { status: 400 });
        }
        if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
            return NextResponse.json({ error: "Hours must be between 0 and 23" }, { status: 400 });
        }
        if (startHour >= endHour) {
            return NextResponse.json({ error: "startHour must be less than endHour" }, { status: 400 });
        }

        const settings = await prisma.floatLiveSettings.upsert({
            where: { id: "singleton" },
            update: { startHour, endHour },
            create: { id: "singleton", startHour, endHour },
        });

        return NextResponse.json({
            startHour: settings.startHour,
            endHour: settings.endHour,
            message: "Settings updated successfully",
        });
    } catch (error) {
        console.error("Float Live settings PATCH error:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
