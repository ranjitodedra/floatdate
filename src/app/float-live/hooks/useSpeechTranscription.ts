"use client";

import { useEffect, useRef, useState } from "react";
import type { WebRTCCallState } from "@/lib/webrtc-service";

interface UseSpeechTranscriptionOptions {
    callState: WebRTCCallState;
    roomId: string;
    userId: string;
}

export function useSpeechTranscription({
    callState,
    roomId,
    userId,
}: UseSpeechTranscriptionOptions) {
    const [isSupported, setIsSupported] = useState(true);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const recognitionRef = useRef<any>(null);
    const lineBufferRef = useRef<string[]>([]);
    const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Web Speech API if supported
    useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false; // We only care about final, settled lines
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const transcript = event.results[i][0].transcript.trim();
                    if (transcript) {
                        lineBufferRef.current.push(transcript);
                    }
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.warn("Speech recognition error:", event.error);
            // It often errors on "no-speech" if silent for too long. 
            // In a continuous loop, we just let it restart.
        };

        recognition.onend = () => {
            // If the call is still connected, restart it to keep listening
            if (isTranscribing) {
                try {
                    recognition.start();
                } catch (e) {
                    // Ignore already-started errors
                }
            }
        };

        recognitionRef.current = recognition;

        return () => {
            setIsTranscribing(false);
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {}
            }
        };
    }, []); // Run once on mount

    // Start/stop transcription based on call state
    useEffect(() => {
        if (!recognitionRef.current) return;

        if (callState === "connected") {
            setIsTranscribing(true);
            try {
                recognitionRef.current.start();
            } catch (e) {
                // Ignore if already started
            }
        } else {
            setIsTranscribing(false);
            try {
                recognitionRef.current.stop();
            } catch (e) {}
            // Flush any remaining immediately
            flushBuffer();
        }
    }, [callState]);

    // Timer to periodically flush buffer to the backend
    useEffect(() => {
        if (!isTranscribing) return;

        flushTimerRef.current = setInterval(() => {
            flushBuffer();
        }, 5000); // Send every 5 seconds if there's data

        return () => {
            if (flushTimerRef.current) {
                clearInterval(flushTimerRef.current);
            }
        };
    }, [isTranscribing, roomId]);

    const flushBuffer = async () => {
        if (lineBufferRef.current.length === 0) return;

        // Take snapshot and clear buffer
        const linesToSend = [...lineBufferRef.current];
        lineBufferRef.current = [];

        try {
            await fetch("/api/float-live/chat/voice-transcript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chatRoomId: roomId,
                    lines: linesToSend.map(content => ({ content }))
                }),
            });
        } catch (error) {
            console.error("Failed to save transcript chunk", error);
            // If it failed, put them back to try again next time (basic retry)
            lineBufferRef.current = [...linesToSend, ...lineBufferRef.current];
        }
    };

    return { isSupported, isTranscribing };
}
