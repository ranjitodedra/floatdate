"use client";

interface FiltersBarProps {
    userGender: string;
    universityName: string;
    preference: string;
    intention: string;
    onPreferenceChange: (val: string) => void;
    onIntentionChange: (val: string) => void;
    disabled?: boolean;
}

export default function FiltersBar({
    userGender,
    universityName,
    preference,
    intention,
    onPreferenceChange,
    onIntentionChange,
    disabled = false,
}: FiltersBarProps) {
    const selectClass =
        "bg-zinc-800 text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer";

    return (
        <div className="flex flex-wrap items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl">
            {/* Gender (read-only) */}
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-xs">You:</span>
                <span className="bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg capitalize">
                    {userGender}
                </span>
            </div>

            {/* University (read-only) */}
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-xs">University:</span>
                <span className="bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg max-w-[180px] truncate">
                    {universityName}
                </span>
            </div>

            {/* Preference */}
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-xs">Prefer:</span>
                <select
                    value={preference}
                    onChange={(e) => onPreferenceChange(e.target.value)}
                    disabled={disabled}
                    className={selectClass}
                >
                    <option value="any">Any</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="nonbinary">Non-binary</option>
                </select>
            </div>

            {/* Intention */}
            <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-xs">Mode:</span>
                <select
                    value={intention}
                    onChange={(e) => onIntentionChange(e.target.value)}
                    disabled={disabled}
                    className={selectClass}
                >
                    <option value="blind_date">Blind Date 💜</option>
                    <option value="friendship">Friendship 🤝</option>
                </select>
            </div>
        </div>
    );
}
