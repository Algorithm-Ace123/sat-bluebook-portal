"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        Desmos?: any;
    }
}

type DesmosCalc = any;

function loadDesmosScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.Desmos) return resolve();

        const existing = document.querySelector<HTMLScriptElement>(
            'script[data-desmos="graphing-calculator"]'
        );
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Desmos script failed to load")));
            return;
        }

        const script = document.createElement("script");
        script.src = "https://www.desmos.com/api/v1.11/calculator.js?apiKey=pramana";
        script.async = true;
        script.defer = true;
        script.dataset.desmos = "graphing-calculator";

        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Desmos script failed to load"));

        document.head.appendChild(script);
    });
}

export default function Desmos() {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const calcRef = useRef<DesmosCalc | null>(null);

    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [errorMsg, setErrorMsg] = useState<string>("");

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setStatus("loading");
                await loadDesmosScript();
                if (cancelled) return;

                if (!hostRef.current || !window.Desmos?.GraphingCalculator) {
                    throw new Error("Desmos API not available after loading.");
                }

                // Destroy old instance if any
                if (calcRef.current) {
                    try {
                        calcRef.current.destroy();
                    } catch { }
                    calcRef.current = null;
                }

                // Create calculator instance (official Desmos UI)
                calcRef.current = window.Desmos.GraphingCalculator(hostRef.current, {
                    expressions: true,
                    settingsMenu: true,
                    zoomButtons: true,
                    keypad: true,
                    border: false,
                    invertedColors: false
                });

                setStatus("ready");
            } catch (e: any) {
                setStatus("error");
                setErrorMsg(e?.message ?? "Failed to initialize Desmos.");
            }
        })();

        return () => {
            cancelled = true;
            if (calcRef.current) {
                try {
                    calcRef.current.destroy();
                } catch { }
                calcRef.current = null;
            }
        };
    }, []);

    // Ensure Desmos resizes with container
    useEffect(() => {
        if (!calcRef.current) return;
        const el = hostRef.current;
        if (!el) return;

        const ro = new ResizeObserver(() => {
            try {
                calcRef.current.resize();
            } catch { }
        });
        ro.observe(el);

        return () => ro.disconnect();
    }, [status]);

    return (
        <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b flex items-center justify-between">
                <div className="text-sm font-semibold">Desmos</div>
                <div className="text-xs text-slate-500">
                    {status === "loading" ? "Loading…" : status === "ready" ? "Ready" : "Error"}
                </div>
            </div>

            {status === "error" ? (
                <div className="p-4 text-sm">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                        {errorMsg}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                        If you’re on a restricted network, desmos.com may be blocked.
                    </div>
                </div>
            ) : (
                <div className="h-[55vh] min-h-[340px] w-full">
                    {/* Desmos mounts here */}
                    <div ref={hostRef} className="h-full w-full" />
                </div>
            )}
        </div>
    );
}
