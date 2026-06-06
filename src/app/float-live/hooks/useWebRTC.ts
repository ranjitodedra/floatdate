"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import { WebRTCService, type WebRTCCallState, type WebRTCStateSnapshot } from "@/lib/webrtc-service";

export interface UseWebRTCOptions {
    roomId: string;
    userId: string;
    participantId: string;
    partnerParticipantId: string;
    /** When true, the hook will auto-end the call. */
    chatEnded: boolean;
}

export interface UseWebRTCReturn {
    callState: WebRTCCallState;
    isMuted: boolean;
    error: string | null;
    startCall: () => Promise<void>;
    endCall: () => void;
    toggleMute: () => void;
}

/**
 * React hook that wraps WebRTCService for use in Float Live chat rooms.
 *
 * Does NOT auto-start the call — the user must explicitly invoke `startCall()`.
 * Auto-cleans up on unmount or when `chatEnded` becomes true.
 */
export function useWebRTC({
    roomId,
    userId,
    participantId,
    partnerParticipantId,
    chatEnded,
}: UseWebRTCOptions): UseWebRTCReturn {
    const serviceRef = useRef<WebRTCService | null>(null);
    const [callState, setCallState] = useState<WebRTCCallState>("idle");
    const [isMuted, setIsMuted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize the service once we have all the IDs
    useEffect(() => {
        if (!roomId || !userId || !participantId || !partnerParticipantId) return;

        const service = new WebRTCService();
        service.initialize(
            roomId,
            userId,
            participantId,
            partnerParticipantId,
            supabase,
            (state: WebRTCStateSnapshot) => {
                setCallState(state.callState);
                setIsMuted(state.isMuted);
                setError(state.error);
            }
        );
        serviceRef.current = service;

        return () => {
            service.dispose();
            serviceRef.current = null;
        };
    }, [roomId, userId, participantId, partnerParticipantId]);

    // Auto-end call when chat ends
    useEffect(() => {
        if (chatEnded && serviceRef.current) {
            const state = serviceRef.current.getState();
            if (
                state.callState !== "idle" &&
                state.callState !== "ended" &&
                state.callState !== "failed"
            ) {
                serviceRef.current.endCall();
            }
        }
    }, [chatEnded]);

    const startCall = useCallback(async () => {
        if (serviceRef.current) {
            await serviceRef.current.startCall();
        }
    }, []);

    const endCall = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.endCall();
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (serviceRef.current) {
            serviceRef.current.toggleMute();
        }
    }, []);

    return {
        callState,
        isMuted,
        error,
        startCall,
        endCall,
        toggleMute,
    };
}
