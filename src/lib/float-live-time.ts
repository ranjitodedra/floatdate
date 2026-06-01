import { toZonedTime } from 'date-fns-tz';
import { prisma } from '@/lib/db';

const TIMEZONE = 'America/Toronto';

// Cache settings for 60 seconds to avoid DB query on every call
let cachedSettings: { startHour: number; endHour: number } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function getSettings(): Promise<{ startHour: number; endHour: number }> {
    const now = Date.now();
    if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
        return cachedSettings;
    }

    try {
        const settings = await prisma.floatLiveSettings.findUnique({
            where: { id: 'singleton' },
        });

        if (settings) {
            cachedSettings = { startHour: settings.startHour, endHour: settings.endHour };
        } else {
            // Default: 5-6 PM
            cachedSettings = { startHour: 17, endHour: 18 };
        }
    } catch {
        // Fallback to defaults if DB is unavailable
        cachedSettings = { startHour: 17, endHour: 18 };
    }

    cacheTimestamp = now;
    return cachedSettings;
}

/**
 * Float Live is now available 24/7. The previous admin-controlled daily time
 * window has been removed, so this always reports active. `minutesLeft` is kept
 * as a large sentinel so the time-warning banner and session-end logic stay
 * inert without needing changes in the API routes that call this.
 */
export async function isFloatLiveActive(): Promise<{ active: boolean; minutesLeft: number; startsIn: number }> {
    return { active: true, minutesLeft: 999, startsIn: 0 };
}

export async function shouldShowWarning(): Promise<boolean> {
    return false;
}

/**
 * Get the start and end times for today's Float Live session in UTC.
 * For overnight windows (startHour > endHour), endTime is on the next calendar day.
 */
export async function getTodaySessionTimes(): Promise<{ date: Date; startTime: Date; endTime: Date }> {
    const { startHour, endHour } = await getSettings();
    const now = new Date();
    const ontarioTime = toZonedTime(now, TIMEZONE);

    const year = ontarioTime.getFullYear();
    const month = ontarioTime.getMonth();
    const day = ontarioTime.getDate();

    const dateOnly = new Date(Date.UTC(year, month, day));

    const probe = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        day: '2-digit',
    }).formatToParts(new Date(Date.UTC(year, month, day, startHour, 0, 0)));

    const probeHour = parseInt(probe.find(p => p.type === 'hour')?.value ?? '0', 10);
    const probeDay = parseInt(probe.find(p => p.type === 'day')?.value ?? '0', 10);

    let offsetHours = probeHour - startHour;
    if (probeDay > day) offsetHours += 24;
    if (probeDay < day) offsetHours -= 24;

    const startTime = new Date(Date.UTC(year, month, day, startHour - offsetHours, 0, 0));

    const isOvernight = startHour > endHour;
    let endTime: Date;
    if (isOvernight) {
        const endProbe = new Intl.DateTimeFormat('en-US', {
            timeZone: TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            day: '2-digit',
        }).formatToParts(new Date(Date.UTC(year, month, day + 1, endHour, 0, 0)));
        const endProbeHour = parseInt(endProbe.find(p => p.type === 'hour')?.value ?? '0', 10);
        const endProbeDay = parseInt(endProbe.find(p => p.type === 'day')?.value ?? '0', 10);
        let endOffsetHours = endProbeHour - endHour;
        if (endProbeDay > day + 1) endOffsetHours += 24;
        if (endProbeDay < day + 1) endOffsetHours -= 24;
        endTime = new Date(Date.UTC(year, month, day + 1, endHour - endOffsetHours, 0, 0));
    } else {
        endTime = new Date(Date.UTC(year, month, day, endHour - offsetHours, 0, 0));
    }

    return { date: dateOnly, startTime, endTime };
}
