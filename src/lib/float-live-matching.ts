export interface FloatLiveMatchProfile {
    gender: string;
    preference: string;
    intention: string;
    universityId: string;
}

/**
 * Returns true when two Float Live queue participants can be matched.
 * Requires same university, same intention, and mutual gender preference.
 */
export function isFloatLiveCompatible(
    userA: FloatLiveMatchProfile,
    userB: FloatLiveMatchProfile
): boolean {
    if (userA.universityId !== userB.universityId) return false;
    if (userA.intention !== userB.intention) return false;

    const aPrefersB = userA.preference === "any" || userA.preference === userB.gender;
    const bPrefersA = userB.preference === "any" || userB.preference === userA.gender;

    return aPrefersB && bPrefersA;
}
