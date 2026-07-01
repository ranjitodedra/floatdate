import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type RateLimitBucket =
    | "chat_message"
    | "voice_transcript"
    | "find_match"
    | "reveal_email"
    | "report"
    | "signup"
    | "application_submit";

interface BucketConfig {
    requests: number;
    window: `${number} s` | `${number} m` | `${number} h`;
}

const BUCKET_CONFIG: Record<RateLimitBucket, BucketConfig> = {
    chat_message: { requests: 1, window: "1 s" },
    voice_transcript: { requests: 1, window: "3 s" },
    find_match: { requests: 10, window: "1 m" },
    reveal_email: { requests: 5, window: "1 m" },
    report: { requests: 3, window: "1 h" },
    signup: { requests: 5, window: "1 h" },
    application_submit: { requests: 3, window: "1 h" },
};

let redis: Redis | null = null;
const limiters = new Map<RateLimitBucket, Ratelimit>();

function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

function getLimiter(bucket: RateLimitBucket): Ratelimit | null {
    const existing = limiters.get(bucket);
    if (existing) return existing;

    const client = getRedis();
    if (!client) return null;

    const config = BUCKET_CONFIG[bucket];
    const limiter = new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `floatdate:rl:${bucket}`,
    });

    limiters.set(bucket, limiter);
    return limiter;
}

export async function checkRateLimit(
    bucket: RateLimitBucket,
    identifier: string
): Promise<NextResponse | null> {
    const limiter = getLimiter(bucket);
    if (!limiter) {
        // Graceful degradation when Upstash is not configured (e.g. local dev)
        return null;
    }

    const { success, reset } = await limiter.limit(identifier);

    if (!success) {
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
                status: 429,
                headers: { "Retry-After": String(retryAfter) },
            }
        );
    }

    return null;
}
