import { afterEach, describe, expect, it, vi } from "vitest";

describe("checkRateLimit", () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    afterEach(() => {
        if (originalUrl === undefined) {
            delete process.env.UPSTASH_REDIS_REST_URL;
        } else {
            process.env.UPSTASH_REDIS_REST_URL = originalUrl;
        }
        if (originalToken === undefined) {
            delete process.env.UPSTASH_REDIS_REST_TOKEN;
        } else {
            process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
        }
        vi.resetModules();
    });

    it("degrades gracefully when UPSTASH_REDIS_REST_URL is not http(s)", async () => {
        process.env.UPSTASH_REDIS_REST_URL = "redis://default:token@host:6379";
        process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const { checkRateLimit } = await import("../rate-limit");

        const result = await checkRateLimit("signup", "user@example.com");

        expect(result).toBeNull();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("UPSTASH_REDIS_REST_URL must start with https://")
        );
        warn.mockRestore();
    });

    it("degrades gracefully when Upstash env vars are missing", async () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;

        const { checkRateLimit } = await import("../rate-limit");

        const result = await checkRateLimit("signup", "user@example.com");

        expect(result).toBeNull();
    });
});
