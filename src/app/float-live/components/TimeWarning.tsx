"use client";

import { useState, useEffect } from "react";

interface TimeWarningProps {
    minutesLeft: number;
}

export default function TimeWarning({ minutesLeft }: TimeWarningProps) {
    const [timeLeft, setTimeLeft] = useState(minutesLeft * 60);

    useEffect(() => {
        setTimeLeft(minutesLeft * 60);
    }, [minutesLeft]);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    if (minutesLeft > 10) return null;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    if (timeLeft <= 0) {
        return (
            <div className="bg-red-500 text-white text-center py-2 px-4 rounded-xl text-sm font-bold animate-pulse">
                🕐 Float Live has ended for today. See you tomorrow at 5 PM!
            </div>
        );
    }

    return (
        <div className="bg-amber-400 text-amber-900 text-center py-2 px-4 rounded-xl text-sm font-bold">
            🕐 Just {mins}:{secs.toString().padStart(2, "0")} left!
        </div>
    );
}
