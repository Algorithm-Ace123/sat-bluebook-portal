"use client";

import { useEffect } from "react";

export default function FloatingPanel({
    open,
    title,
    onClose,
    onToggleFullscreen,
    isFullscreen,
    children,
    widthClass = "w-[92vw] sm:w-[900px]",
    heightClass = "h-[78vh] min-h-[520px]"
}: {
    open: boolean;
    title: React.ReactNode;
    onClose: () => void;
    onToggleFullscreen?: () => void;
    isFullscreen?: boolean;
    children: React.ReactNode;
    widthClass?: string;
    heightClass?: string;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* click-outside overlay */}
            <button
                aria-label="Close panel"
                onClick={onClose}
                className="absolute inset-0 bg-black/0 pointer-events-auto"
            />

            {/* panel */}
            <div
                className={[
                    "absolute right-4 top-4 sm:right-6 sm:top-6 pointer-events-auto",
                    "bg-white border shadow-2xl rounded-lg overflow-hidden",
                    widthClass,
                    heightClass
                ].join(" ")}
            >
                {/* header bar */}
                <div className="h-12 bg-slate-900 text-white flex items-center justify-between px-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
                            {/* 3x3 dots handle (visual only) */}
                            <div className="grid grid-cols-3 gap-[2px]">
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <div key={i} className="w-[3px] h-[3px] bg-white/80 rounded-sm" />
                                ))}
                            </div>
                        </div>
                        <div className="font-semibold text-sm">{title}</div>
                    </div>

                    <div className="flex items-center gap-2">
                        {onToggleFullscreen && (
                            <button
                                onClick={onToggleFullscreen}
                                className="w-9 h-9 rounded-md hover:bg-white/10 flex items-center justify-center"
                                aria-label="Toggle panel fullscreen"
                                title="Expand"
                            >
                                {/* expand icon */}
                                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 3h6v6" />
                                    <path d="M9 21H3v-6" />
                                    <path d="M21 3l-7 7" />
                                    <path d="M3 21l7-7" />
                                </svg>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-md hover:bg-white/10 flex items-center justify-center"
                            aria-label="Close panel"
                            title="Close"
                        >
                            {/* X */}
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18" />
                                <path d="M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* content */}
                <div className="w-full h-[calc(100%-3rem)] bg-white">{children}</div>
            </div>
        </div>
    );
}
