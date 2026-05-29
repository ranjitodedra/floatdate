/**
 * Float Live presence timing and status derivation.
 * Client heartbeats update lastSeenAt; server derives online / away / timeout.
 */

export const HEARTBEAT_MS = 8_000;
export const ONLINE_WINDOW_S = 25;
export const GRACE_S = 480; // 8 minutes
export const QUEUE_STALE_S = 30;

export type PresenceStatus = "online" | "away" | "timeout";
export type ParticipantQueueStatus = "idle" | "waiting" | "matched" | "left";
export type RoomLifecycleStatus = "active" | "ended";
export type RoomEndReason = "user_exit" | "timeout" | "session_end";

export interface DerivedPresence {
    status: PresenceStatus;
    /** Seconds since last heartbeat (0 if never seen). */
    awaySeconds: number;
    /** Seconds remaining in 8-minute grace (0 if online or timed out). */
    graceSecondsLeft: number;
}

export function secondsSince(date: Date | null | undefined, now: Date = new Date()): number {
    if (!date) return Number.POSITIVE_INFINITY;
    return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
}

/**
 * Derive presence from lastSeenAt.
 * - online: gap <= ONLINE_WINDOW_S
 * - away: ONLINE_WINDOW_S < gap <= GRACE_S
 * - timeout: gap > GRACE_S
 */
export function derivePresence(
    lastSeenAt: Date | null | undefined,
    now: Date = new Date()
): DerivedPresence {
    const gap = secondsSince(lastSeenAt, now);

    if (gap <= ONLINE_WINDOW_S) {
        return { status: "online", awaySeconds: 0, graceSecondsLeft: GRACE_S };
    }

    if (gap <= GRACE_S) {
        return {
            status: "away",
            awaySeconds: gap,
            graceSecondsLeft: GRACE_S - gap,
        };
    }

    return {
        status: "timeout",
        awaySeconds: gap,
        graceSecondsLeft: 0,
    };
}

export function isQueueStale(lastSeenAt: Date | null | undefined, now: Date = new Date()): boolean {
    return secondsSince(lastSeenAt, now) > QUEUE_STALE_S;
}

export function canonicalParticipantPair(idA: string, idB: string): [string, string] {
    return idA < idB ? [idA, idB] : [idB, idA];
}

export function isRoomActive(room: { isActive: boolean; status?: string | null }): boolean {
    return room.isActive && (room.status == null || room.status === "active");
}
