import { describe, expect, it } from "vitest";
import { isFloatLiveCompatible } from "../float-live-matching";

const base = {
    gender: "male",
    preference: "any",
    intention: "blind_date",
    universityId: "uni-1",
};

describe("isFloatLiveCompatible", () => {
    it("matches same university with compatible gender and intention", () => {
        const a = { ...base };
        const b = { ...base, gender: "female", preference: "male" };

        expect(isFloatLiveCompatible(a, b)).toBe(true);
    });

    it("rejects different universities", () => {
        const a = { ...base };
        const b = { ...base, universityId: "uni-2" };

        expect(isFloatLiveCompatible(a, b)).toBe(false);
    });

    it("rejects same university with different intention", () => {
        const a = { ...base };
        const b = { ...base, intention: "friendship" };

        expect(isFloatLiveCompatible(a, b)).toBe(false);
    });

    it("rejects same university with incompatible gender preferences", () => {
        const a = { ...base, gender: "male", preference: "female" };
        const b = { ...base, gender: "male", preference: "female" };

        expect(isFloatLiveCompatible(a, b)).toBe(false);
    });

    it("allows any preference to match any gender", () => {
        const a = { ...base, gender: "nonbinary", preference: "any" };
        const b = { ...base, gender: "female", preference: "any" };

        expect(isFloatLiveCompatible(a, b)).toBe(true);
    });
});
