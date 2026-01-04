"use client";

import type { StimulusBlock } from "@/lib/authoring";
import InlineRender from "./InlineRender";
import katex from "katex";
import "katex/dist/katex.min.css";

function Latex({ latex }: { latex: string }) {
    const html = katex.renderToString(latex, { throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

type BlocksInput =
    | StimulusBlock[]
    | { content?: StimulusBlock[] }
    | null
    | undefined;

function normalizeBlocks(input: BlocksInput): StimulusBlock[] {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === "object" && Array.isArray((input as any).content)) return (input as any).content;
    return [];
}

export default function BlockRender({ blocks }: { blocks: BlocksInput }) {
    const arr = normalizeBlocks(blocks);

    return (
        <div className="space-y-4">
            {arr.map((b, i) => {
                if (b.type === "heading") {
                    const size =
                        b.level === 1 ? "text-xl" :
                            b.level === 2 ? "text-lg" :
                                b.level === 3 ? "text-base" :
                                    "text-sm";
                    return (
                        <div key={i} className={`${size} font-semibold`}>
                            <InlineRender nodes={b.content} />
                        </div>
                    );
                }

                if (b.type === "paragraph") {
                    return (
                        <p key={i} className="text-base leading-6">
                            <InlineRender nodes={b.content} />
                        </p>
                    );
                }

                if (b.type === "table") {
                    return (
                        <div key={i} className="space-y-2">
                            {b.label && <div className="text-xs font-semibold text-slate-600">{b.label}</div>}
                            <div className="overflow-x-auto">
                                <table className="min-w-full border rounded-xl overflow-hidden">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            {b.columns.map((c, j) => (
                                                <th key={j} className="text-left text-xs font-semibold p-2 border-b">
                                                    {c}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {b.rows.map((r, ri) => (
                                            <tr key={ri} className="odd:bg-white even:bg-slate-50">
                                                {r.map((cell, ci) => (
                                                    <td key={ci} className="text-xs p-2 border-b">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                }

                if (b.type === "image") {
                    return (
                        <div key={i} className="space-y-2">
                            {b.label && <div className="text-xs font-semibold text-slate-600">{b.label}</div>}
                            <img src={b.src} alt={b.alt} className="max-w-full rounded-xl border" />
                        </div>
                    );
                }

                if (b.type === "math_block") {
                    return (
                        <div key={i} className="space-y-2">
                            {b.label && <div className="text-xs font-semibold text-slate-600">{b.label}</div>}
                            <div className="text-lg">
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
