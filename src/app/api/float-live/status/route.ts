import { NextResponse } from "next/server";
import { isFloatLiveActive } from "@/lib/float-live-time";

export async function GET() {
    try {
        const status = await isFloatLiveActive();
        return NextResponse.json(status);
    } catch (error) {
        console.error("Float Live status error:", error);
        return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
    }
}
