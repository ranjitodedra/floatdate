import { describe, expect, it } from "vitest";
import {
    canJoinScheduledDate,
    getGhostFillWindow,
    isJoinWindowPast,
    isWithinJoinWindow,
    isValidDuration,
    sanitizeExpectations,
} from "../float-live-scheduled";

describe("float-live-scheduled helpers", () => {
    it("validates durations", () => {
        expect(isValidDuration(15)).toBe(true);
        expect(isValidDuration(30)).toBe(true);
        expect(isValidDuration(60)).toBe(true);
        expect(isValidDuration(45)).toBe(false);
    });

    it("sanitizes expectations", () => {
        expect(sanitizeExpectations("<script>hi</script>")).toBe(
            "&lt;script&gt;hi&lt;/script&gt;"
        );
        expect(sanitizeExpectations("   ")).toBe(null);
    });

    it("detects join window", () => {
        const start = new Date("2026-06-27T21:00:00.000Z");
        const during = new Date("2026-06-27T21:15:00.000Z");
        const before = new Date("2026-06-27T20:59:00.000Z");
        const after = new Date("2026-06-27T21:31:00.000Z");

        expect(isWithinJoinWindow(start, 30, during)).toBe(true);
        expect(isWithinJoinWindow(start, 30, before)).toBe(false);
        expect(isJoinWindowPast(start, 30, after)).toBe(true);
    });

    it("builds ghost fill window", () => {
        const scheduledAt = new Date("2026-06-27T21:00:00.000Z");
        const { start, end } = getGhostFillWindow(scheduledAt);
        expect(end.getTime() - start.getTime()).toBe(60 * 60 * 1000);
    });

    it("checks claim compatibility via creator preference", () => {
        const date = {
            gender: "female",
            preference: "male",
            intention: "blind_date",
            universityId: "uni-1",
        };

        expect(
            canJoinScheduledDate(
                {
                    gender: "male",
                    preference: "female",
                    intention: "blind_date",
                    universityId: "uni-1",
                },
                date
            )
        ).toBe(true);

        expect(
            canJoinScheduledDate(
                {
                    gender: "male",
                    preference: "female",
                    intention: "friendship",
                    universityId: "uni-1",
                },
                date
            )
        ).toBe(false);
    });
});
