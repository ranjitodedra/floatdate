"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavTab {
    href: string;
    label: string;
    subtitle: string;
    match: (pathname: string) => boolean;
}

const TABS: NavTab[] = [
    {
        href: "/dashboard",
        label: "FloatDate",
        subtitle: "Intentional dating",
        match: (p) => p.startsWith("/dashboard"),
    },
    {
        href: "/float-live",
        label: "FloatLive",
        subtitle: "Anonymous chat",
        match: (p) => p.startsWith("/float-live"),
    },
];

const STORAGE_KEY = "floatdate-sidenav-open";

export default function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname() || "";
    const [open, setOpen] = useState(true);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored !== null) setOpen(stored === "true");
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (hydrated) window.localStorage.setItem(STORAGE_KEY, String(open));
    }, [open, hydrated]);

    function handleNavClick() {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            setOpen(false);
        }
    }

    return (
        <>
            {/* Open button — shown when the sidebar is closed */}
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                    className="fixed top-4 left-4 z-50 flex flex-col items-center justify-center gap-1 w-10 h-10 rounded-lg bg-white border border-zinc-200 text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
                >
                    <span className="block w-4 h-0.5 bg-current" />
                    <span className="block w-4 h-0.5 bg-current" />
                    <span className="block w-4 h-0.5 bg-current" />
                </button>
            )}

            {open && (
                <>
                    {/* Mobile backdrop */}
                    <div
                        onClick={() => setOpen(false)}
                        className="md:hidden fixed inset-0 z-40 bg-black/30"
                    />
                    <aside className="fixed left-0 top-0 h-screen w-56 z-50 bg-white border-r border-zinc-200 px-4 py-6 flex flex-col">
                        <div className="flex items-center justify-between mb-8 px-1">
                            <span className="text-zinc-900 font-bold text-lg">FloatDate</span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close menu"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition text-xl leading-none"
                            >
                                &lsaquo;
                            </button>
                        </div>
                        <nav className="flex flex-col gap-1.5">
                            {TABS.map((tab) => {
                                const active = tab.match(pathname);
                                return (
                                    <Link
                                        key={tab.href}
                                        href={tab.href}
                                        onClick={handleNavClick}
                                        className={`flex flex-col rounded-xl px-3 py-2.5 border transition-all ${
                                            active
                                                ? "bg-indigo-50 border-indigo-200"
                                                : "border-transparent hover:bg-zinc-50"
                                        }`}
                                    >
                                        <span
                                            className={`text-sm font-semibold ${
                                                active ? "text-indigo-700" : "text-zinc-700"
                                            }`}
                                        >
                                            {tab.label}
                                        </span>
                                        <span className="text-[11px] text-zinc-400">
                                            {tab.subtitle}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>
                </>
            )}

            <div className={open ? "md:pl-56" : ""}>{children}</div>
        </>
    );
}
