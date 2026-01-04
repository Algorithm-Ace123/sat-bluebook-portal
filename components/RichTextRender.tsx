"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

import type { InlineNode } from "../lib/authoring";

function Latex({ latex }: { latex: string }) {
    const html = katex.renderToString(latex, { throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function RichTextRender({ nodes }: { nodes: InlineNode[] }) {
    return (
        <>
            {nodes.map((n, idx) => {
                if (n.type === "math") {
                    return (
                        <span key={idx} className="mx-1">
                            <Latex latex={n.latex} />
                        </span>
                    );
                }

                const marks = new Set(n.marks ?? []);
                const cls = [
                    marks.has("bold") ? "font-semibold" : "",
                    marks.has("italic") ? "italic" : "",
                    marks.has("underline") ? "underline underline-offset-2" : ""
                ]
                    .filter(Boolean)
                    .join(" ");

                return (
                    <span key={idx} className={cls}>
                        {n.text}
                    </span>
                );
            })}
        </>
    );
}
