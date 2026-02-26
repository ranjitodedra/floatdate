import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

const TORONTO_TZ = "America/Toronto";
const WEDNESDAY = 3; // Day of week: 0=Sun, 1=Mon, ..., 3=Wed

/**
 * Returns the most recent Wednesday 9:00 PM America/Toronto as a UTC Date.
 *
 * If `now` is before Wed 9 PM ET this week, returns the *previous* Wednesday 9 PM ET.
 * If `now` is on or after Wed 9 PM ET, returns *this* Wednesday 9 PM ET.
 *
 * DST is handled automatically via the IANA "America/Toronto" zone.
 */
export function getWeekStart(now: Date = new Date()): Date {
    // Convert "now" to Toronto local time to determine day-of-week and hour
    const torontoNow = toZonedTime(now, TORONTO_TZ);

    const dayOfWeek = torontoNow.getDay(); // 0-6 in Toronto local time
    const hour = torontoNow.getHours();

    // How many days back to the most recent Wednesday?
    // If today is Wednesday and it's before 21:00 local, we need LAST Wednesday.
    // If today is Wednesday and it's >= 21:00 local, we need THIS Wednesday.
    let daysBack: number;
    if (dayOfWeek === WEDNESDAY) {
        daysBack = hour >= 21 ? 0 : 7;
    } else if (dayOfWeek > WEDNESDAY) {
        // Thu=4 → 1, Fri=5 → 2, Sat=6 → 3
        daysBack = dayOfWeek - WEDNESDAY;
    } else {
        // Sun=0 → 4, Mon=1 → 5, Tue=2 → 6
        daysBack = dayOfWeek + 4;
    }

    // Build "Wednesday 21:00:00" in Toronto local time, then convert to UTC
    // We use the Toronto-local date components to construct the target
    const targetYear = torontoNow.getFullYear();
    const targetMonth = torontoNow.getMonth();
    const targetDay = torontoNow.getDate() - daysBack;

    // Create a Date representing "YYYY-MM-DD 21:00:00" in Toronto timezone
    // fromZonedTime() interprets the given date as if it's in the specified timezone
    // and returns the equivalent UTC Date.
    const localWednesday = new Date(targetYear, targetMonth, targetDay, 21, 0, 0, 0);
    const utcWednesday = fromZonedTime(localWednesday, TORONTO_TZ);

    return utcWednesday;
}

/**
 * Returns the *next* Wednesday 9:00 PM America/Toronto as a UTC Date.
 * This is the end of the current cycle / start of the next cycle.
 */
export function getNextWeekStart(now: Date = new Date()): Date {
    const currentStart = getWeekStart(now);
    // Add exactly 7 days worth of milliseconds
    return new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * Format a UTC Date in America/Toronto local time for user display.
 * Example output: "Wednesday, 9:00 PM ET"
 */
export function formatTorontoTime(date: Date): string {
    const formatted = formatInTimeZone(date, TORONTO_TZ, "EEEE, h:mm a");
    return `${formatted} ET`;
}

/**
 * Check whether the current time in Toronto is within a tolerance window
 * around Wednesday 9:00 PM. Used by the cron handler to guard against
 * the wrong cron firing during DST transitions.
 */
export function isMatchingTime(now: Date = new Date(), toleranceMinutes = 10): boolean {
    const torontoNow = toZonedTime(now, TORONTO_TZ);
    const day = torontoNow.getDay();
    const hour = torontoNow.getHours();
    const minute = torontoNow.getMinutes();

    if (day !== WEDNESDAY) return false;

    const minutesSince9PM = (hour - 21) * 60 + minute;
    return minutesSince9PM >= 0 && minutesSince9PM <= toleranceMinutes;
}
