"use client";

import { useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };

export default function DraggableResizablePanel({
    open,
    title,
    onClose,
    children,
    initialRect,
    minWidth = 420,
    minHeight = 320
}: {
    open: boolean;
    title: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
    initialRect?: Partial<Rect>;
    minWidth?: number;
    minHeight?: number;
}) {
    const [rect, setRect] = useState<Rect>({
        x: initialRect?.x ?? 40,
        y: initialRect?.y ?? 40,
        w: initialRect?.w ?? 980,
        h: initialRect?.h ?? 640
    });

    const dragRef = useRef<{ startX: number; startY: number; startRect: Rect } | null>(null);
    const resizeRef = useRef<{ startX: number; startY: number; startRect: Rect } | null>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;

        const onMove = (e: MouseEvent) => {
            if (dragRef.current) {
                const dx = e.clientX - dragRef.current.startX;
                const dy = e.clientY - dragRef.current.startY;
                const nr = dragRef.current.startRect;
                setRect((r) => ({
                    ...r,
                    x: clamp(nr.x + dx, 8, window.innerWidth - r.w - 8),
                    y: clamp(nr.y + dy, 8, window.innerHeight - r.h - 8)
                }));
            } else if (resizeRef.current) {
                const dx = e.clientX - resizeRef.current.startX;
                const dy = e.clientY - resizeRef.current.startY;
                const nr = resizeRef.current.startRect;
                setRect((r) => ({
                    ...r,
                    w: Math.max(minWidth, nr.w + dx),
                    h: Math.max(minHeight, nr.h + dy)
                }));
            }
        };

        const onUp = () => {
            dragRef.current = null;
            resizeRef.current = null;
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [open, minWidth, minHeight]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* click outside closes */}
            <button className="absolute inset-0 bg-black/0 pointer-events-auto" onClick={onClose} aria-label="Close panel" />

            <div
                className="absolute pointer-events-auto bg-white border shadow-2xl rounded-lg overflow-hidden"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
            >
                {/* Header bar */}
                <div
                    className="h-12 bg-slate-900 text-white flex items-center justify-between px-3 select-none cursor-move"
                    onMouseDown={(e) => {
                        // drag
                        dragRef.current = { startX: e.clientX, startY: e.clientY, startRect: rect };
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
                            <div className="grid grid-cols-3 gap-[2px]">
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <div key={i} className="w-[3px] h-[3px] bg-white/80 rounded-sm" />
                                ))}
                            </div>
                        </div>
                        <div className="font-semibold text-sm">{title}</div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="w-9 h-9 rounded-md hover:bg-white/10 flex items-center justify-center"
                        aria-label="Close"
                        title="Close"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="w-full h-[calc(100%-3rem)] relative bg-white">
                    {children}

                    {/* Resize handle */}
                    <div
                        className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize bg-transparent"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            resizeRef.current = { startX: e.clientX, startY: e.clientY, startRect: rect };
                        }}
                        title="Resize"
                    />
                    <div className="absolute right-1 bottom-1 text-slate-300 pointer-events-none">⟂</div>
                </div>
            </div>
        </div>
    );
}

function clamp(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, n));
}
