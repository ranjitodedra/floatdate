import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto';
const START_HOUR = 17; // 5:00 PM
const END_HOUR = 18;   // 6:00 PM
const WARNING_MINUTES = 10; // Warn at 5:50 PM

export function isFloatLiveActive(): { active: boolean; minutesLeft: number; startsIn: number } {
    const now = new Date();
    const ontarioTime = toZonedTime(now, TIMEZONE);
    const hour = ontarioTime.getHours();
    const minutes = ontarioTime.getMinutes();

    if (hour >= START_HOUR && hour < END_HOUR) {
        const minutesLeft = (END_HOUR - hour - 1) * 60 + (60 - minutes);
        return { active: true, minutesLeft, startsIn: 0 };
    }

    // Calculate time until next 5 PM
    let startsIn: number;
    if (hour < START_HOUR) {
        startsIn = (START_HOUR - hour - 1) * 60 + (60 - minutes);
    } else {
        startsIn = (24 - hour + START_HOUR - 1) * 60 + (60 - minutes);
    }

    return { active: false, minutesLeft: 0, startsIn };
}

export function shouldShowWarning(): boolean {
    const { active, minutesLeft } = isFloatLiveActive();
    return active && minutesLeft <= WARNING_MINUTES;
}

/**
 * Get the start and end times for today's Float Live session in UTC.
 */
export function getTodaySessionTimes(): { date: Date; startTime: Date; endTime: Date } {
    const now = new Date();
    const ontarioTime = toZonedTime(now, TIMEZONE);

    // Build today's date in Ontario timezone
    const year = ontarioTime.getFullYear();
    const month = ontarioTime.getMonth();
    const day = ontarioTime.getDate();

    // Create date-only (midnight Ontario time converted to UTC concept)
    const dateOnly = new Date(Date.UTC(year, month, day));

    // Calculate UTC offset for Ontario at this date
    // We use Intl to derive the offset
    const probe = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        day: '2-digit',
    }).formatToParts(new Date(Date.UTC(year, month, day, START_HOUR, 0, 0)));

    const probeHour = parseInt(probe.find(p => p.type === 'hour')?.value ?? '0', 10);
    const probeDay = parseInt(probe.find(p => p.type === 'day')?.value ?? '0', 10);

    let offsetHours = probeHour - START_HOUR;
    if (probeDay > day) offsetHours += 24;
    if (probeDay < day) offsetHours -= 24;

    // 5 PM Ontario = 5 PM UTC minus offset
    const startTime = new Date(Date.UTC(year, month, day, START_HOUR - offsetHours, 0, 0));
    const endTime = new Date(Date.UTC(year, month, day, END_HOUR - offsetHours, 0, 0));

    return { date: dateOnly, startTime, endTime };
}
