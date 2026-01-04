"use client";

import { useEffect } from "react";

export default function ReferenceSheetDrawer({
    open,
    onClose,
    url
}: {
    open: boolean;
    onClose: () => void;
    url?: string;
}) {
    // Esc to close
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
        <div className="fixed inset-0 z-50">
            <button
                aria-label="Close Reference Sheet"
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />

            <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[520px] bg-white shadow-2xl rounded-t-2xl md:rounded-none md:rounded-l-2xl overflow-hidden border md:border-l">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold text-sm">Reference</div>
                    <button onClick={onClose} className="rounded-xl border px-3 py-1 text-sm">
                        Close
                    </button>
                </div>

                <div className="h-[60vh] md:h-full p-3">
                    {url ? (
                        <iframe src={url} className="w-full h-full rounded-xl border" />
                    ) : (
                        <div className="text-sm text-slate-600">
                            No reference sheet URL set. Add{" "}
                            <code className="bg-slate-100 px-1 rounded">tools.referenceSheetUrl</code> in test JSON.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
