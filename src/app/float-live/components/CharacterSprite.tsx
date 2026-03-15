"use client";

import Image from "next/image";

interface CharacterSpriteProps {
    character: string; // "A" | "B" | "C" | "D" | "E" | "F"
    side: "left" | "right"; // left = partner (looking right), right = user (mirrored to look left)
    className?: string;
}

export default function CharacterSprite({ character, side, className = "" }: CharacterSpriteProps) {
    const validChars = ["A", "B", "C", "D", "E", "F"];
    const charLetter = validChars.includes(character) ? character : "A";
    const src = `/assets/Characters/${charLetter}_looking_Right.png`;

    return (
        <div
            className={`relative ${className}`}
            style={{
                width: "clamp(160px, 22vw, 280px)",
                height: "clamp(160px, 22vw, 280px)",
                // Mirror for user's character (right side) since image looks right by default
                transform: side === "right" ? "scaleX(-1)" : "none",
                overflow: "hidden",
                // Pixelated rendering for that crisp pixel-art look
                imageRendering: "pixelated",
            }}
        >
            <Image
                src={src}
                alt={`Character ${charLetter}`}
                width={560}
                height={560}
                className="absolute top-0 left-0"
                style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "cover",
                    objectPosition: "top",
                    imageRendering: "pixelated",
                }}
                priority
            />
        </div>
    );
}
