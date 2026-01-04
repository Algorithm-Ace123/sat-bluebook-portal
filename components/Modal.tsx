"use client";

import { useEffect } from "react";

export default function Modal({
    open,
    title,
    onClose,
    children,
    maxWidthClass = "max-w-5xl"
}: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidthClass?: string;
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
        <div className="fixed inset-0 z-50">
            <button
                aria-label="Close modal"
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />
            <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
                <div className={`w-full ${maxWidthClass} bg-white rounded-2xl shadow-2xl border overflow-hidden`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="font-semibold text-sm">{title}</div>
                        <button onClick={onClose} className="rounded-xl border px-3 py-1 text-sm hover:bg-slate-50">
                            Close
                        </button>
                    </div>
                    <div className="p-3 sm:p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}
