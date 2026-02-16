import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const protectedPaths = ["/dashboard", "/questions"];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
    if (!isProtected) return NextResponse.next();

    const token = req.cookies.get("floatdate_session")?.value;
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.next();
    } catch {
        return NextResponse.redirect(new URL("/login", req.url));
    }
}

export const config = {
    matcher: ["/dashboard/:path*", "/questions/:path*"],
};
