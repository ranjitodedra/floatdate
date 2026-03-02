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
    userGender: string;
    partnerGender: string;
    userId: string;
    messages: Message[];
}

export default function PixelScene({
    userGender,
    partnerGender,
    userId,
    messages,
}: PixelSceneProps) {
    // Show only the last 3 messages as speech bubbles
    const recentMessages = messages.slice(-3);

    return (
        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden border border-zinc-200 shadow-lg">
            {/* Background */}
            <Image
                src="/assets/float-live/background.png"
                alt="Café scene"
                fill
                className="object-cover pixel-scene"
                priority
            />

            {/* Overlay gradient for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

            {/* Characters */}
            <div className="absolute bottom-12 left-[15%]">
                <CharacterSprite gender={userGender} side="left" />
            </div>
            <div className="absolute bottom-12 right-[15%]">
                <CharacterSprite gender={partnerGender} side="right" />
            </div>

            {/* Speech bubbles */}
            <div className="absolute top-4 left-4 right-4 space-y-2 max-h-[140px] overflow-hidden">
                {recentMessages.map((msg) => (
                    <ChatBubble
                        key={msg.id}
                        content={msg.content}
                        side={msg.senderId === userId ? "right" : "left"}
                    />
                ))}
            </div>
        </div>
    );
}
