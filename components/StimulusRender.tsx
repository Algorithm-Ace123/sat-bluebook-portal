"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import type { StimulusBlock } from "../lib/authoring";
import RichTextRender from "./RichTextRender";
import Table from "./Table";

function Latex({ latex }: { latex: string }) {
    const html = katex.renderToString(latex, { throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function StimulusRender({
    blocks,
    variant = "stimulus",
    isMath = false
}: {
    blocks: StimulusBlock[];
    variant?: "stimulus" | "prompt";
    isMath?: boolean;
}) {
    const showLabels = variant === "stimulus"; // ✅ hide labels in prompt blocks

    return (
        <div className="space-y-4">
            {blocks.map((b, i) => {
                if (b.type === "heading") {
                    const size =
                        b.level === 1 ? "text-xl" :
                            b.level === 2 ? "text-lg" :
                                b.level === 3 ? "text-base" :
                                    "text-sm";

                    return (
                        <div key={i} className={`${size} font-semibold`}>
                            <RichTextRender nodes={b.content} />
                        </div>
                    );
                }

                if (b.type === "paragraph") {
                    return (
                        <p key={i} className="text-base leading-6">
                            <RichTextRender nodes={b.content} />
                        </p>
                    );
                }

                if (b.type === "table") {
                    return (
                        <div key={i} className="space-y-2">
                            {showLabels && b.label && (
                                <div className="text-xs text-slate-600 font-semibold">{b.label}</div>
                            )}
                            <Table table={{ columns: b.columns, rows: b.rows, caption: showLabels ? b.label : undefined }} />
                        </div>
                    );
                }

                if (b.type === "image") {
                    return (
                        <div key={i} className={cx("space-y-2", isMath && "flex flex-col items-center")}>
                            {showLabels && b.label && (
                                <div className="text-xs text-slate-600 font-semibold">{b.label}</div>
                            )}
                            <img
                                src={b.src}
                                alt={b.alt}
                                className={variant === "prompt" ? "max-w-full" : "max-w-full rounded-lg border"}
                            />
                        </div>
                    );
                }

                if (b.type === "math_block") {
                    return (
                        <div key={i} className={cx("space-y-2", isMath && "flex flex-col items-center text-center")}>
                            {showLabels && b.label && (
                                <div className="text-xs text-slate-600 font-semibold">{b.label}</div>
                            )}
                            <div className="text-lg w-full">
                                <Latex latex={b.latex} />
                            </div>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}
