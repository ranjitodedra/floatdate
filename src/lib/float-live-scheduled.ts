import { formatInTimeZone } from "date-fns-tz";
import type { FloatLiveScheduledDate, University } from "@prisma/client";
import { isFloatLiveCompatible, type FloatLiveMatchProfile } from "./float-live-matching";

export const TIMEZONE = "America/Toronto";
export const SCHEDULED_DURATIONS = [15, 30, 60] as const;
export const GHOST_FILL_WINDOW_MINUTES = 30;
export const MAX_EXPECTATIONS_LENGTH = 500;
export const MAX_CONCURRENT_SCHEDULED_DATES = 5;

export const VALID_PREFERENCES = ["male", "female", "nonbinary", "any"] as const;
export const VALID_INTENTIONS = ["blind_date", "friendship"] as const;
export const VALID_CHARACTERS = ["A", "B", "C", "D", "E", "F"] as const;

export type ScheduledDateStatus =
    | "open"
    | "claimed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "expired";

export interface PublicScheduledCard {
    id: string;
    scheduledAt: string;
    scheduledAtLabel: string;
    durationMinutes: number;
    creatorGender: string;
    creatorPreference: string;
    creatorPreferenceLabel: string;
    universityName: string;
    intention: string;
    intentionLabel: string;
    expectations: string | null;
    canJoin: boolean;
}

export function formatPreferenceLabel(preference: string): string {
    if (preference === "any") return "Looking for: Anyone";
    if (preference === "nonbinary") return "Looking for: Non-binary";
    return `Looking for: ${preference.charAt(0).toUpperCase()}${preference.slice(1)}`;
}

export interface JoinerProfile {
    gender: string;
    preference: string;
    intention: string;
    universityId: string;
}

export function sanitizeExpectations(text: string | null | undefined): string | null {
    if (!text) return null;
    const trimmed = text
        .toString()
        .slice(0, MAX_EXPECTATIONS_LENGTH)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function isValidDuration(minutes: number): boolean {
    return SCHEDULED_DURATIONS.includes(minutes as (typeof SCHEDULED_DURATIONS)[number]);
}

export function getScheduledEndTime(scheduledAt: Date, durationMinutes: number): Date {
    return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
}

export function isWithinJoinWindow(
    scheduledAt: Date,
    durationMinutes: number,
    now: Date = new Date()
): boolean {
    return now >= scheduledAt && now <= getScheduledEndTime(scheduledAt, durationMinutes);
}

export function isJoinWindowPast(
    scheduledAt: Date,
    durationMinutes: number,
    now: Date = new Date()
): boolean {
    return now > getScheduledEndTime(scheduledAt, durationMinutes);
}

export function getGhostFillWindow(scheduledAt: Date): { start: Date; end: Date } {
    const windowMs = GHOST_FILL_WINDOW_MINUTES * 60 * 1000;
    return {
        start: new Date(scheduledAt.getTime() - windowMs),
        end: new Date(scheduledAt.getTime() + windowMs),
    };
}

export function creatorProfileFromDate(
    date: Pick<FloatLiveScheduledDate, "gender" | "preference" | "intention" | "universityId">
): FloatLiveMatchProfile {
    return {
        gender: date.gender,
        preference: date.preference,
        intention: date.intention,
        universityId: date.universityId,
    };
}

export function canJoinScheduledDate(
    joiner: JoinerProfile,
    date: Pick<FloatLiveScheduledDate, "gender" | "preference" | "intention" | "universityId">
): boolean {
    if (joiner.intention !== date.intention) return false;
    return isFloatLiveCompatible(creatorProfileFromDate(date), joiner);
}

export function formatScheduledAtLabel(scheduledAt: Date): string {
    return formatInTimeZone(scheduledAt, TIMEZONE, "MMMM d 'at' h:mm a");
}

export function formatScheduledTimeLabel(scheduledAt: Date): string {
    return formatInTimeZone(scheduledAt, TIMEZONE, "h:mm a");
}

export function toPublicScheduledCard(
    date: FloatLiveScheduledDate & { university: Pick<University, "name"> },
    canJoin: boolean
): PublicScheduledCard {
    const intentionLabel = date.intention === "blind_date" ? "Blind Date" : "Friendship";
    return {
        id: date.id,
        scheduledAt: date.scheduledAt.toISOString(),
        scheduledAtLabel: formatScheduledAtLabel(date.scheduledAt),
        durationMinutes: date.durationMinutes,
        creatorGender: date.gender,
        creatorPreference: date.preference,
        creatorPreferenceLabel: formatPreferenceLabel(date.preference),
        universityName: date.university.name,
        intention: date.intention,
        intentionLabel,
        expectations: date.expectations,
        canJoin,
    };
}

export function userGenderPrefToFloatLivePref(genderPref: string): string {
    if (genderPref === "male" || genderPref === "female" || genderPref === "nonbinary") {
        return genderPref;
    }
    return "any";
}

export function buildCreatorMatchBanner(scheduledAt: Date): string {
    return `You have a scheduled date on ${formatScheduledAtLabel(scheduledAt)}. Someone has agreed to join you.`;
}

export function buildJoinerMatchBanner(scheduledAt: Date): string {
    return `You're matched for a date on ${formatScheduledAtLabel(scheduledAt)}.`;
}
