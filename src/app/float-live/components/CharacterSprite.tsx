"use client";

import Image from "next/image";

interface CharacterSpriteProps {
    gender: string;
    side: "left" | "right";
    className?: string;
}

export default function CharacterSprite({ gender, side, className = "" }: CharacterSpriteProps) {
    const spriteMap: Record<string, string> = {
        male: "/assets/float-live/sprite-male.png",
        female: "/assets/float-live/sprite-female.png",
        nonbinary: "/assets/float-live/sprite-nonbinary.png",
    };

    const src = spriteMap[gender] || spriteMap.nonbinary;

    return (
        <div
            className={`relative ${className}`}
            style={{
                transform: side === "right" ? "scaleX(-1)" : "none",
            }}
        >
            <Image
                src={src}
                alt={`${gender} character`}
                width={96}
                height={144}
                className="pixel-scene"
                priority
            />
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-zinc-800/70 px-2 py-0.5 rounded whitespace-nowrap"
                style={{ transform: side === "right" ? "scaleX(-1)" : "none" }}
            >
                {side === "left" ? "You" : "Match"}
            </div>
        </div>
    );
}
