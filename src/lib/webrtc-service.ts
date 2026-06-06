/**
 * WebRTC audio service for Float Live.
 *
 * Responsibilities:
 *  - Manage a single RTCPeerConnection for 1-to-1 audio calls
 *  - Use Supabase Realtime Broadcast channels for signaling (ephemeral, no DB)
 *  - Handle ICE candidate batching, reconnection, and cleanup
 *
 * Design:
 *  - "Polite / Impolite" peer pattern (offerer = lexicographically smaller participantId)
 *  - Audio-only, Opus codec preferred, constrained for low bandwidth
 *  - No data ever written to the database — signaling is fully ephemeral
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WebRTCCallState =
    | "idle"
    | "requesting_mic"
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "failed"
    | "mic_denied"
    | "ended";

export interface WebRTCStateSnapshot {
    callState: WebRTCCallState;
    isMuted: boolean;
    error: string | null;
}

type StateChangeCallback = (state: WebRTCStateSnapshot) => void;

// Signaling message types sent over Supabase Broadcast
interface SignalOffer {
    type: "offer";
    sdp: string;
    from: string;
}

interface SignalAnswer {
    type: "answer";
    sdp: string;
    from: string;
}

interface SignalIceCandidates {
    type: "ice-candidates";
    candidates: RTCIceCandidateInit[];
    from: string;
}

interface SignalEndCall {
    type: "end-call";
    from: string;
}

type SignalMessage = SignalOffer | SignalAnswer | SignalIceCandidates | SignalEndCall;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

const ICE_BATCH_INTERVAL_MS = 150;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// Audio constraints for low latency, low bandwidth
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1,
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class WebRTCService {
    private supabase: SupabaseClient | null = null;
    private channel: RealtimeChannel | null = null;
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteAudio: HTMLAudioElement | null = null;

    private roomId = "";
    private myUserId = "";
    private myParticipantId = "";
    private isOfferer = false; // true if I am the "impolite" peer (I create the offer)

    private callState: WebRTCCallState = "idle";
    private isMuted = false;
    private error: string | null = null;
    private onStateChange: StateChangeCallback | null = null;

    // ICE candidate batching
    private pendingIceCandidates: RTCIceCandidateInit[] = [];
    private iceBatchTimer: ReturnType<typeof setTimeout> | null = null;

    // Reconnection
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    // Track whether we've been disposed to prevent operations after cleanup
    private disposed = false;

    // Track if we've already set remote description (for glare prevention)
    private hasRemoteDescription = false;
    private pendingRemoteCandidates: RTCIceCandidateInit[] = [];

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Initialize the service with room and user context.
     * Does NOT start a call — call `startCall()` for that.
     */
    initialize(
        roomId: string,
        userId: string,
        participantId: string,
        partnerParticipantId: string,
        supabaseClient: SupabaseClient,
        onStateChange: StateChangeCallback
    ): void {
        this.roomId = roomId;
        this.myUserId = userId;
        this.myParticipantId = participantId;
        this.supabase = supabaseClient;
        this.onStateChange = onStateChange;
        this.disposed = false;

        // Deterministic offerer: lexicographically smaller participantId is offerer
        this.isOfferer = participantId < partnerParticipantId;
    }

    /**
     * Start a voice call: request mic, set up peer connection, begin signaling.
     */
    async startCall(): Promise<void> {
        if (this.disposed) return;
        if (this.callState !== "idle" && this.callState !== "failed" && this.callState !== "ended") {
            return;
        }

        this.reconnectAttempts = 0;
        this.setState("requesting_mic");

        // 1. Get microphone
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: AUDIO_CONSTRAINTS,
                video: false,
            });
        } catch (err) {
            const mediaErr = err as DOMException;
            if (
                mediaErr.name === "NotAllowedError" ||
                mediaErr.name === "PermissionDeniedError"
            ) {
                this.setError("Microphone access denied. Please allow microphone access in your browser settings.");
                this.setState("mic_denied");
            } else if (mediaErr.name === "NotFoundError") {
                this.setError("No microphone found. Please connect a microphone and try again.");
                this.setState("mic_denied");
            } else {
                this.setError("Could not access microphone. Please check your device settings.");
                this.setState("failed");
            }
            return;
        }

        // Apply mute state in case the user toggled mute before connecting
        if (this.isMuted && this.localStream) {
            this.localStream.getAudioTracks().forEach((t) => (t.enabled = false));
        }

        // 2. Set up signaling channel
        this.setupSignalingChannel();

        // 3. Create peer connection
        this.createPeerConnection();

        // 4. Add local audio track
        if (this.localStream && this.peerConnection) {
            this.localStream.getAudioTracks().forEach((track) => {
                this.peerConnection!.addTrack(track, this.localStream!);
            });
        }

        this.setState("connecting");

        // 5. If I'm the offerer, create and send offer
        if (this.isOfferer) {
            await this.createAndSendOffer();
        }
        // If I'm the answerer, I wait for an offer via the signaling channel
    }

    /**
     * End the current call and clean up resources.
     */
    endCall(): void {
        // Signal the other peer (best-effort)
        this.sendSignal({ type: "end-call", from: this.myUserId });

        this.cleanupCall();
        this.setState("ended");
    }

    /**
     * Toggle local audio mute.
     */
    toggleMute(): boolean {
        this.isMuted = !this.isMuted;

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((track) => {
                track.enabled = !this.isMuted;
            });
        }

        this.emitState();
        return this.isMuted;
    }

    /**
     * Get current state snapshot.
     */
    getState(): WebRTCStateSnapshot {
        return {
            callState: this.callState,
            isMuted: this.isMuted,
            error: this.error,
        };
    }

    /**
     * Full teardown. Call when leaving the chat room entirely.
     */
    dispose(): void {
        this.disposed = true;
        this.cleanupCall();
        this.onStateChange = null;
    }

    // -----------------------------------------------------------------------
    // Signaling
    // -----------------------------------------------------------------------

    private setupSignalingChannel(): void {
        if (!this.supabase || this.disposed) return;

        // Use Supabase Broadcast — no database, purely ephemeral pub/sub
        const channelName = `webrtc-signal-${this.roomId}`;

        this.channel = this.supabase.channel(channelName, {
            config: { broadcast: { self: false } },
        });

        this.channel
            .on("broadcast", { event: "signal" }, (payload) => {
                if (this.disposed) return;
                const msg = payload.payload as SignalMessage;
                // Ignore our own messages (shouldn't happen with self:false, but defensive)
                if (msg.from === this.myUserId) return;
                this.handleSignalMessage(msg);
            })
            .subscribe();
    }

    private sendSignal(message: SignalMessage): void {
        if (!this.channel || this.disposed) return;

        this.channel.send({
            type: "broadcast",
            event: "signal",
            payload: message,
        });
    }

    private async handleSignalMessage(msg: SignalMessage): Promise<void> {
        if (this.disposed) return;

        switch (msg.type) {
            case "offer":
                await this.handleOffer(msg);
                break;
            case "answer":
                await this.handleAnswer(msg);
                break;
            case "ice-candidates":
                await this.handleIceCandidates(msg);
                break;
            case "end-call":
                this.handleRemoteEndCall();
                break;
        }
    }

    // -----------------------------------------------------------------------
    // Peer Connection
    // -----------------------------------------------------------------------

    private createPeerConnection(): void {
        if (this.disposed) return;

        this.hasRemoteDescription = false;
        this.pendingRemoteCandidates = [];

        const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            // Prefer Opus and constrain to audio
            // Relay-only would be `iceTransportPolicy: "relay"` but we want P2P
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.bufferIceCandidate(event.candidate.toJSON());
            }
        };

        pc.ontrack = (event) => {
            if (this.disposed) return;
            // Play remote audio
            if (!this.remoteAudio) {
                this.remoteAudio = new Audio();
                this.remoteAudio.autoplay = true;
            }
            this.remoteAudio.srcObject = event.streams[0] || new MediaStream([event.track]);
        };

        pc.oniceconnectionstatechange = () => {
            if (this.disposed) return;
            this.handleIceConnectionStateChange(pc.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
            if (this.disposed) return;
            if (pc.connectionState === "connected") {
                this.reconnectAttempts = 0;
                this.setState("connected");
            } else if (pc.connectionState === "failed") {
                this.attemptReconnect();
            }
        };

        this.peerConnection = pc;
    }

    private async createAndSendOffer(): Promise<void> {
        if (!this.peerConnection || this.disposed) return;

        try {
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false,
            });
            await this.peerConnection.setLocalDescription(offer);

            this.sendSignal({
                type: "offer",
                sdp: offer.sdp!,
                from: this.myUserId,
            });
        } catch (err) {
            console.error("[WebRTC] Failed to create offer:", err);
            this.setError("Failed to start voice call. Please try again.");
            this.setState("failed");
        }
    }

    private async handleOffer(msg: SignalOffer): Promise<void> {
        if (this.disposed) return;

        // If I'm the offerer too (glare), the impolite peer (offerer) ignores incoming offers
        if (this.isOfferer && this.peerConnection?.signalingState === "have-local-offer") {
            // I'm impolite — ignore this offer, my offer takes precedence
            return;
        }

        // If we don't have a peer connection yet (we're the answerer), create one
        if (!this.peerConnection || this.peerConnection.signalingState === "closed") {
            this.createPeerConnection();
            if (this.localStream && this.peerConnection) {
                this.localStream.getAudioTracks().forEach((track) => {
                    this.peerConnection!.addTrack(track, this.localStream!);
                });
            }
        }

        try {
            await this.peerConnection!.setRemoteDescription(
                new RTCSessionDescription({ type: "offer", sdp: msg.sdp })
            );
            this.hasRemoteDescription = true;

            // Flush any pending ICE candidates
            await this.flushPendingRemoteCandidates();

            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            this.sendSignal({
                type: "answer",
                sdp: answer.sdp!,
                from: this.myUserId,
            });

            this.setState("connecting");
        } catch (err) {
            console.error("[WebRTC] Failed to handle offer:", err);
            this.setError("Failed to connect voice call.");
            this.setState("failed");
        }
    }

    private async handleAnswer(msg: SignalAnswer): Promise<void> {
        if (!this.peerConnection || this.disposed) return;

        if (this.peerConnection.signalingState !== "have-local-offer") {
            // Not expecting an answer right now
            return;
        }

        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription({ type: "answer", sdp: msg.sdp })
            );
            this.hasRemoteDescription = true;

            // Flush any pending ICE candidates
            await this.flushPendingRemoteCandidates();
        } catch (err) {
            console.error("[WebRTC] Failed to handle answer:", err);
        }
    }

    // -----------------------------------------------------------------------
    // ICE Candidates
    // -----------------------------------------------------------------------

    /** Buffer local ICE candidates and send in batches to reduce signaling traffic. */
    private bufferIceCandidate(candidate: RTCIceCandidateInit): void {
        this.pendingIceCandidates.push(candidate);

        if (!this.iceBatchTimer) {
            this.iceBatchTimer = setTimeout(() => {
                this.flushIceCandidates();
            }, ICE_BATCH_INTERVAL_MS);
        }
    }

    private flushIceCandidates(): void {
        if (this.iceBatchTimer) {
            clearTimeout(this.iceBatchTimer);
            this.iceBatchTimer = null;
        }

        if (this.pendingIceCandidates.length === 0 || this.disposed) return;

        const batch = [...this.pendingIceCandidates];
        this.pendingIceCandidates = [];

        this.sendSignal({
            type: "ice-candidates",
            candidates: batch,
            from: this.myUserId,
        });
    }

    private async handleIceCandidates(msg: SignalIceCandidates): Promise<void> {
        if (!this.peerConnection || this.disposed) return;

        for (const candidate of msg.candidates) {
            if (!this.hasRemoteDescription) {
                // Queue candidates until remote description is set
                this.pendingRemoteCandidates.push(candidate);
                continue;
            }

            try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (err) {
                // Non-critical: candidate may be redundant
                console.warn("[WebRTC] Failed to add ICE candidate:", err);
            }
        }
    }

    private async flushPendingRemoteCandidates(): Promise<void> {
        if (!this.peerConnection || this.disposed) return;

        const candidates = [...this.pendingRemoteCandidates];
        this.pendingRemoteCandidates = [];

        for (const candidate of candidates) {
            try {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (err) {
                console.warn("[WebRTC] Failed to add queued ICE candidate:", err);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Connection State Management
    // -----------------------------------------------------------------------

    private handleIceConnectionStateChange(state: RTCIceConnectionState): void {
        switch (state) {
            case "connected":
            case "completed":
                this.reconnectAttempts = 0;
                this.setState("connected");
                break;
            case "disconnected":
                this.setState("disconnected");
                // Start reconnection after a brief wait (transient disconnects are common)
                this.reconnectTimer = setTimeout(() => {
                    if (this.callState === "disconnected") {
                        this.attemptReconnect();
                    }
                }, RECONNECT_DELAY_MS);
                break;
            case "failed":
                this.attemptReconnect();
                break;
            case "closed":
                // Connection was closed intentionally or unrecoverably
                break;
        }
    }

    private async attemptReconnect(): Promise<void> {
        if (this.disposed) return;

        this.reconnectAttempts++;

        if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            this.setError("Voice connection lost. Click to try again.");
            this.setState("failed");
            return;
        }

        this.setState("reconnecting");

        // ICE restart: create a new offer with iceRestart flag
        if (this.peerConnection && this.isOfferer) {
            try {
                this.hasRemoteDescription = false;
                this.pendingRemoteCandidates = [];
                const offer = await this.peerConnection.createOffer({
                    iceRestart: true,
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false,
                });
                await this.peerConnection.setLocalDescription(offer);

                this.sendSignal({
                    type: "offer",
                    sdp: offer.sdp!,
                    from: this.myUserId,
                });
            } catch (err) {
                console.error("[WebRTC] ICE restart failed:", err);
                // Retry after delay
                this.reconnectTimer = setTimeout(() => {
                    this.attemptReconnect();
                }, RECONNECT_DELAY_MS);
            }
        } else if (!this.isOfferer) {
            // As the polite peer, wait for the offerer to send a new offer
            // Set a timeout in case it doesn't come
            this.reconnectTimer = setTimeout(() => {
                if (this.callState === "reconnecting") {
                    this.attemptReconnect();
                }
            }, RECONNECT_DELAY_MS * 2);
        }
    }

    private handleRemoteEndCall(): void {
        if (this.disposed) return;
        this.cleanupCall();
        this.setState("ended");
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    private cleanupCall(): void {
        // Clear timers
        if (this.iceBatchTimer) {
            clearTimeout(this.iceBatchTimer);
            this.iceBatchTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Flush remaining ICE candidates
        this.pendingIceCandidates = [];
        this.pendingRemoteCandidates = [];

        // Stop local media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                track.stop();
            });
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.onicecandidate = null;
            this.peerConnection.ontrack = null;
            this.peerConnection.oniceconnectionstatechange = null;
            this.peerConnection.onconnectionstatechange = null;
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Stop remote audio
        if (this.remoteAudio) {
            this.remoteAudio.srcObject = null;
            this.remoteAudio = null;
        }

        // Unsubscribe from signaling channel
        if (this.channel && this.supabase) {
            this.supabase.removeChannel(this.channel);
            this.channel = null;
        }

        this.hasRemoteDescription = false;
        this.isMuted = false;
    }

    // -----------------------------------------------------------------------
    // State Helpers
    // -----------------------------------------------------------------------

    private setState(state: WebRTCCallState): void {
        this.callState = state;
        if (state !== "failed" && state !== "mic_denied") {
            this.error = null;
        }
        this.emitState();
    }

    private setError(message: string): void {
        this.error = message;
    }

    private emitState(): void {
        if (this.onStateChange && !this.disposed) {
            this.onStateChange(this.getState());
        }
    }
}
