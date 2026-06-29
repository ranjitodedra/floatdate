"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { storeRef } from "@/lib/referral-client";

export default function ReferralCapture() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const ref = searchParams.get("ref");
        if (ref?.trim()) {
            storeRef(ref);
        }
    }, [searchParams]);

    return null;
}
