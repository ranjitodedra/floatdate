import { toZonedTime } from 'date-fns-tz';
import { prisma } from '@/lib/db';

const TIMEZONE = 'America/Toronto';
const WARNING_MINUTES = 10; // Warn 10 min before end

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

export async function isFloatLiveActive(): Promise<{ active: boolean; minutesLeft: number; startsIn: number }> {
    const { startHour, endHour } = await getSettings();
    const now = new Date();
    const ontarioTime = toZonedTime(now, TIMEZONE);
    const hour = ontarioTime.getHours();
    const minutes = ontarioTime.getMinutes();

    if (hour >= startHour && hour < endHour) {
        const minutesLeft = (endHour - hour - 1) * 60 + (60 - minutes);
        return { active: true, minutesLeft, startsIn: 0 };
    }

    // Calculate time until next session
    let startsIn: number;
    if (hour < startHour) {
        startsIn = (startHour - hour - 1) * 60 + (60 - minutes);
    } else {
        startsIn = (24 - hour + startHour - 1) * 60 + (60 - minutes);
    }

    return { active: false, minutesLeft: 0, startsIn };
}

export async function shouldShowWarning(): Promise<boolean> {
    const { active, minutesLeft } = await isFloatLiveActive();
    return active && minutesLeft <= WARNING_MINUTES;
}

/**
 * Get the start and end times for today's Float Live session in UTC.
 */
export async function getTodaySessionTimes(): Promise<{ date: Date; startTime: Date; endTime: Date }> {
    const { startHour, endHour } = await getSettings();
    const now = new Date();
    const ontarioTime = toZonedTime(now, TIMEZONE);

    // Build today's date in Ontario timezone
    const year = ontarioTime.getFullYear();
    const month = ontarioTime.getMonth();
    const day = ontarioTime.getDate();

    // Create date-only (midnight Ontario time converted to UTC concept)
    const dateOnly = new Date(Date.UTC(year, month, day));

    // Calculate UTC offset for Ontario at this date
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
    const endTime = new Date(Date.UTC(year, month, day, endHour - offsetHours, 0, 0));

    return { date: dateOnly, startTime, endTime };
}
