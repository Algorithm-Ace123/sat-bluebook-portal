"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";

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
        script.src = "https://www.desmos.com/api/v1.11/calculator.js?apiKey=pramana&lang=en";
        script.async = true;
        script.defer = true;
        script.dataset.desmos = "gc";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Desmos failed to load"));
        document.head.appendChild(script);
    });
}

export default function DesmosModal({
    open,
    onClose
}: {
    open: boolean;
    onClose: () => void;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const calcRef = useRef<DesmosCalc | null>(null);
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [err, setErr] = useState("");

    useEffect(() => {
        let cancelled = false;
        if (!open) return;

        (async () => {
            try {
                setStatus("loading");
                await loadDesmos();
                if (cancelled) return;

                if (!hostRef.current || !window.Desmos?.GraphingCalculator) {
                    throw new Error("Desmos API not available.");
                }

                // (Re)mount
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
                setErr(e?.message ?? "Failed to initialize Desmos");
            }
        })();

        return () => {
            cancelled = true;
            // keep instance alive while modal open; destroy on close for MVP simplicity
        };
    }, [open]);

    // Resize on container changes
    useEffect(() => {
        if (!open || status !== "ready" || !calcRef.current || !hostRef.current) return;
        const ro = new ResizeObserver(() => {
            try { calcRef.current.resize(); } catch { }
        });
        ro.observe(hostRef.current);
        return () => ro.disconnect();
    }, [open, status]);

    return (
        <Modal open={open} title="Calculator" onClose={onClose} maxWidthClass="max-w-6xl">
            {status === "error" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
            ) : (
                <div className="h-[75vh] min-h-[420px] w-full rounded-xl border overflow-hidden">
                    <div ref={hostRef} className="h-full w-full" />
                    {status !== "ready" && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-sm text-slate-600 bg-white/90 border rounded-xl px-4 py-2">
                                Loading calculator…
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
