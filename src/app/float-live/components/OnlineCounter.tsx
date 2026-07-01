"use client";

interface OnlineCounterProps {
    count: number;
}

export default function OnlineCounter({ count }: OnlineCounterProps) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted font-medium">
                {count} {count === 1 ? "person" : "people"} online
            </span>
        </div>
    );
}
