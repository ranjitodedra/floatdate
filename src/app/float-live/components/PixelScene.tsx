"use client";

import Image from "next/image";
import CharacterSprite from "./CharacterSprite";
import ChatBubble from "./ChatBubble";

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
}

interface PixelSceneProps {
    userCharacter: string;
    partnerCharacter: string;
    userId: string;
    messages: Message[];
}

export default function PixelScene({
    userCharacter,
    partnerCharacter,
    userId,
    messages,
}: PixelSceneProps) {
    // Get latest message from each side
    const partnerMessages = messages.filter((m) => m.senderId !== userId);
    const userMessages = messages.filter((m) => m.senderId === userId);
    const latestPartnerMsg = partnerMessages.length > 0 ? partnerMessages[partnerMessages.length - 1] : null;
    const latestUserMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;

    return (
        <div
            className="scene-container"
            style={{
                position: "relative",
                width: "100%",
                maxWidth: "1000px",
                margin: "0 auto",
                borderRadius: "16px",
                overflow: "hidden",
                border: "2px solid #3f3f46",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
        >
            {/* Background — show the room scene, cropped to show table area */}
            <div style={{ position: "relative", width: "100%", paddingBottom: "45%" }}>
                <Image
                    src="/assets/Characters/Background.jpg"
                    alt="Scene background"
                    fill
                    style={{
                        objectFit: "cover",
                        objectPosition: "center 70%",
                    }}
                    priority
                />

                {/* Subtle vignette overlay */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)",
                        pointerEvents: "none",
                    }}
                />

                {/* Chat bubble above partner — layered in front of table */}
                {latestPartnerMsg && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: "52%",
                            left: "calc(3% + clamp(80px, 11vw, 140px))",
                            zIndex: 10,
                            transform: "translateX(-50%)",
                        }}
                    >
                        <ChatBubble content={latestPartnerMsg.content} side="left" />
                    </div>
                )}

                {/* Chat bubble above user — layered in front of table */}
                {latestUserMsg && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: "52%",
                            right: "calc(3% + clamp(80px, 11vw, 140px))",
                            zIndex: 10,
                            transform: "translateX(50%)",
                        }}
                    >
                        <ChatBubble content={latestUserMsg.content} side="right" />
                    </div>
                )}

                {/* Partner character — left side, seated at left chair */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "-18%",
                        left: "3%",
                        zIndex: 2,
                    }}
                >
                    <CharacterSprite character={partnerCharacter} side="left" />
                </div>

                {/* User character — right side, seated at right chair */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "-18%",
                        right: "3%",
                        zIndex: 2,
                    }}
                >
                    <CharacterSprite character={userCharacter} side="right" />
                </div>
            </div>
        </div>
    );
}
