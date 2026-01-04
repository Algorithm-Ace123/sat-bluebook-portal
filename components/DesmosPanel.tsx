"use client";

import { useState } from "react";
import DraggableResizablePanel from "./DraggableResizablePanel";

export default function DesmosPanel({
    open,
    onClose
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"graphing" | "scientific">("graphing");

    return (
        <DraggableResizablePanel
            open={open}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setTab("graphing");
                        }}
                        className={[
                            "px-2 py-1 rounded-md text-xs font-semibold border",
                            tab === "graphing"
                                ? "bg-white text-slate-900 border-white"
                                : "bg-transparent text-white/90 border-white/30"
                        ].join(" ")}
                    >
                        Graphing
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setTab("scientific");
                        }}
                        className={[
                            "px-2 py-1 rounded-md text-xs font-semibold border",
                            tab === "scientific"
                                ? "bg-white text-slate-900 border-white"
                                : "bg-transparent text-white/90 border-white/30"
                        ].join(" ")}
                    >
                        Scientific
                    </button>
                </div>
            }
            initialRect={{ x: 60, y: 60, w: 980, h: 640 }}
            minWidth={520}
            minHeight={420}
        >
            {tab === "graphing" ? (
                <iframe
                    title="Desmos Graphing"
                    src="https://www.desmos.com/testing/cb-sat-ap/graphing?lang=el"
                    className="w-full h-full"
                />
            ) : (
                <iframe
                    title="Desmos Scientific"
                    src="https://www.desmos.com/scientific"
                    className="w-full h-full"
                />
            )}
        </DraggableResizablePanel>
    );
}
