"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        Desmos?: any;
    }
}

type DesmosCalc = any;

function loadDesmos(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.Desmos) return resolve();

        const existing = document.querySelector<HTMLScriptElement>('script[data-desmos="gc"]');
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Desmos failed to load")));
            return;
        }

        const script = document.createElement("script");
        script.src = "https://www.desmos.com/api/v1.11/calculator.js?apiKey=pramana";
        script.async = true;
        script.defer = true;
        script.dataset.desmos = "gc";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Desmos failed to load"));
        document.head.appendChild(script);
    });
}

export default function DesmosDrawer({
    open,
    onClose
}: {
    open: boolean;
    onClose: () => void;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const calcRef = useRef<DesmosCalc | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [err, setErr] = useState<string>("");

    // Esc to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    // Init Desmos on open (first time)
    useEffect(() => {
        let cancelled = false;
        if (!open) return;

        (async () => {
            try {
                if (status === "ready") return;
                setStatus("loading");
                await loadDesmos();
                if (cancelled) return;

                if (!hostRef.current || !window.Desmos?.GraphingCalculator) {
                    throw new Error("Desmos API not available.");
                }

                // fresh mount
                if (calcRef.current) {
                    try { calcRef.current.destroy(); } catch { }
                    calcRef.current = null;
                }

                calcRef.current = window.Desmos.GraphingCalculator(hostRef.current, {
                    expressions: true,
                    settingsMenu: true,
                    zoomButtons: true,
                    keypad: true,
                    border: false
                });

                setStatus("ready");
            } catch (e: any) {
                setStatus("error");
                setErr(e?.message ?? "Failed to initialize Desmos.");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [open, status]);

    // Resize
    useEffect(() => {
        if (!open || status !== "ready" || !calcRef.current || !hostRef.current) return;
        const ro = new ResizeObserver(() => {
            try { calcRef.current.resize(); } catch { }
        });
        ro.observe(hostRef.current);
        return () => ro.disconnect();
    }, [open, status]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay */}
            <button
                aria-label="Close Desmos"
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />

            {/* drawer: bottom sheet on mobile, right drawer on desktop */}
            <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[520px] bg-white shadow-2xl rounded-t-2xl md:rounded-none md:rounded-l-2xl overflow-hidden border md:border-l">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold text-sm">Calculator</div>
                    <button onClick={onClose} className="rounded-xl border px-3 py-1 text-sm">
                        Close
                    </button>
                </div>

                {status === "error" ? (
                    <div className="p-4 text-sm">
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>
                    </div>
                ) : (
                    <div className="h-[60vh] md:h-full">
                        <div className="h-full w-full" ref={hostRef} />
                        {status !== "ready" && (
                            <div className="absolute inset-x-0 bottom-0 md:inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-sm text-slate-600 bg-white/90 border rounded-xl px-4 py-2">
                                    Loading calculator…
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
