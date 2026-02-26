import { describe, it, expect } from "vitest";
import { getWeekStart, getNextWeekStart, isMatchingTime, formatTorontoTime } from "../week-cycle";

/**
 * Helper: build a UTC Date from an ISO string.
 */
function utc(iso: string): Date {
    return new Date(iso);
}

describe("getWeekStart", () => {
    it("Wednesday before 9 PM ET (EST) → returns previous Wednesday 9 PM ET", () => {
        // Wed 2026-01-14 at 3:00 PM EST = 20:00 UTC
        const now = utc("2026-01-14T20:00:00Z"); // Wed 3 PM EST (before 9 PM)
        const result = getWeekStart(now);
        // Should return previous Wed Jan 7 at 9 PM EST = Jan 8 02:00 UTC
        expect(result.toISOString()).toBe("2026-01-08T02:00:00.000Z");
    });

    it("Wednesday after 9 PM ET (EST) → returns this Wednesday 9 PM ET", () => {
        // Wed 2026-01-14 at 10:00 PM EST = 03:00 UTC Thu Jan 15
        const now = utc("2026-01-15T03:00:00Z"); // Wed 10 PM EST
        const result = getWeekStart(now);
        // Should return Wed Jan 14 at 9 PM EST = Jan 15 02:00 UTC
        expect(result.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });

    it("Thursday → returns most recent Wednesday 9 PM ET", () => {
        // Thu 2026-01-15 at 10:00 AM EST = 15:00 UTC
        const now = utc("2026-01-15T15:00:00Z");
        const result = getWeekStart(now);
        // Should return Wed Jan 14 at 9 PM EST = Jan 15 02:00 UTC
        expect(result.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });

    it("Monday → returns most recent Wednesday 9 PM ET (previous week)", () => {
        // Mon 2026-01-19 at noon EST = 17:00 UTC
        const now = utc("2026-01-19T17:00:00Z");
        const result = getWeekStart(now);
        // Should return Wed Jan 14 at 9 PM EST = Jan 15 02:00 UTC
        expect(result.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });

    it("Sunday → returns most recent Wednesday 9 PM ET (previous week)", () => {
        // Sun 2026-01-18 at noon EST = 17:00 UTC
        const now = utc("2026-01-18T17:00:00Z");
        const result = getWeekStart(now);
        // Should return Wed Jan 14 at 9 PM EST = Jan 15 02:00 UTC
        expect(result.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });

    it("Saturday → returns most recent Wednesday 9 PM ET", () => {
        // Sat 2026-01-17 at noon EST = 17:00 UTC
        const now = utc("2026-01-17T17:00:00Z");
        const result = getWeekStart(now);
        // Should return Wed Jan 14 at 9 PM EST = Jan 15 02:00 UTC
        expect(result.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });

    // DST transitions
    it("handles DST spring forward (March 2026) — EST to EDT", () => {
        // DST starts Sun Mar 8 2026 at 2:00 AM EST → clocks spring forward to 3:00 AM EDT.
        // Wed Mar 11 2026 at 9 PM EDT = Mar 12 01:00 UTC (offset -4)
        const now = utc("2026-03-12T02:00:00Z"); // Wed Mar 11 10 PM EDT
        const result = getWeekStart(now);
        expect(result.toISOString()).toBe("2026-03-12T01:00:00.000Z");
    });

    it("handles DST fall back (November 2026) — EDT to EST", () => {
        // DST ends Sun Nov 1 2026 at 2:00 AM EDT → clocks fall back to 1:00 AM EST.
        // Wed Nov 4 2026 at 9 PM EST = Nov 5 02:00 UTC (offset -5)
        const now = utc("2026-11-05T03:00:00Z"); // Wed Nov 4 10 PM EST
        const result = getWeekStart(now);
        expect(result.toISOString()).toBe("2026-11-05T02:00:00.000Z");
    });

    it("Wednesday exactly at 9 PM ET → returns this Wednesday (at boundary)", () => {
        // Wed 2026-01-14 at exactly 9 PM EST = Jan 15 02:00 UTC
        const now = utc("2026-01-15T02:00:00Z");
        const result = getWeekStart(now);
        expect(result.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });
});

describe("getNextWeekStart", () => {
    it("returns exactly 7 days after getWeekStart", () => {
        const now = utc("2026-01-15T15:00:00Z"); // Thu Jan 15
        const current = getWeekStart(now);
        const next = getNextWeekStart(now);
        const diffMs = next.getTime() - current.getTime();
        expect(diffMs).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("from Wednesday before 9 PM ET, next is this Wednesday 9 PM ET", () => {
        // Wed 2026-01-14 at 3:00 PM EST = 20:00 UTC
        const now = utc("2026-01-14T20:00:00Z");
        const next = getNextWeekStart(now);
        // weekStart = prev Wed Jan 8 02:00 UTC, next = Jan 15 02:00 UTC
        expect(next.toISOString()).toBe("2026-01-15T02:00:00.000Z");
    });
});

describe("isMatchingTime", () => {
    it("returns true at exactly 9 PM Wednesday ET", () => {
        // Wed Jan 14 2026, 9:00 PM EST = Jan 15 02:00 UTC
        const now = utc("2026-01-15T02:00:00Z");
        expect(isMatchingTime(now)).toBe(true);
    });

    it("returns true within tolerance window (5 min after)", () => {
        // Wed Jan 14 2026, 9:05 PM EST = Jan 15 02:05 UTC
        const now = utc("2026-01-15T02:05:00Z");
        expect(isMatchingTime(now, 10)).toBe(true);
    });

    it("returns false on Wednesday before 9 PM ET", () => {
        // Wed Jan 14 2026, 3:00 PM EST = 20:00 UTC
        const now = utc("2026-01-14T20:00:00Z");
        expect(isMatchingTime(now)).toBe(false);
    });

    it("returns false on Thursday", () => {
        const now = utc("2026-01-15T15:00:00Z"); // Thu
        expect(isMatchingTime(now)).toBe(false);
    });
});

describe("formatTorontoTime", () => {
    it("formats a UTC date to Toronto local time string", () => {
        // Wed Jan 14 2026, 9 PM EST = Jan 15 02:00 UTC
        const date = utc("2026-01-15T02:00:00Z");
        const formatted = formatTorontoTime(date);
        expect(formatted).toContain("Wednesday");
        expect(formatted).toContain("9:00");
        expect(formatted).toContain("PM");
        expect(formatted).toContain("ET");
    });
});
