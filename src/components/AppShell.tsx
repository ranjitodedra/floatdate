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
    {
        href: "/float-pop-or-match",
        label: "Float Pop or Match",
        subtitle: "Live show casting",
        match: (p) => p.startsWith("/float-pop-or-match"),
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
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                    className="fixed top-4 left-4 z-50 flex flex-col items-center justify-center gap-1 w-10 h-10 rounded-lg glass-panel text-cream-muted hover:text-cream transition"
                >
                    <span className="block w-4 h-0.5 bg-current" />
                    <span className="block w-4 h-0.5 bg-current" />
                    <span className="block w-4 h-0.5 bg-current" />
                </button>
            )}

            {open && (
                <>
                    <div
                        onClick={() => setOpen(false)}
                        className="md:hidden fixed inset-0 z-40 bg-mahogany-deep/60"
                    />
                    <aside className="fixed left-0 top-0 h-screen w-56 z-50 glass-panel-strong px-4 py-6 flex flex-col">
                        <div className="flex items-center justify-between mb-8 px-1">
                            <span className="text-cream font-bold text-lg">FloatDate</span>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Close menu"
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-cream-faint hover:text-cream hover:bg-cream/10 transition text-xl leading-none"
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
                                        className={`flex flex-col rounded-xl px-3 py-2.5 transition-all ${
                                            active
                                                ? "bg-gold-soft"
                                                : "hover:bg-cream/5"
                                        }`}
                                    >
                                        <span
                                            className={`text-sm font-semibold ${
                                                active ? "text-cream" : "text-cream-muted"
                                            }`}
                                        >
                                            {tab.label}
                                        </span>
                                        <span className="text-[11px] text-cream-faint">
                                            {tab.subtitle}
                                        </span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>
                </>
            )}

            <div className={`min-h-screen ${open ? "md:pl-56" : ""}`}>
                {children}
            </div>
        </>
    );
}
