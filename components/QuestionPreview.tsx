"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import StimulusRender from "./StimulusRender";
import RichTextRender from "./RichTextRender";

function Latex({ latex }: { latex: string }) {
    const html = katex.renderToString(latex, { throwOnError: false });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function getPromptBlocks(q: any) {
    if (Array.isArray(q?.question?.promptBlocks)) return q.question.promptBlocks;
    if (Array.isArray(q?.promptBlocks)) return q.promptBlocks;
    return [];
}

export default function QuestionPreview({ q }: { q: any }) {
    const promptBlocks = getPromptBlocks(q);

    return (
        <div className="rounded-2xl border bg-white p-4 space-y-4">
            <div className="text-sm font-semibold text-slate-700">Live Preview</div>

            {/* ✅ RW Stimulus Preview (required) */}
            {Array.isArray(q?.stimulus) && q.stimulus.length > 0 && (
                <div className="rounded-xl border p-3 bg-slate-50">
                    <StimulusRender blocks={q.stimulus} variant="stimulus" />
                </div>
            )}

            {/* Prompt */}
            <div className="space-y-3">
                {q?.question?.prompt?.length ? (
                    <div className="text-base">
                        <RichTextRender nodes={q.question.prompt} />
                    </div>
                ) : null}

                {q?.question?.promptLatex ? (
                    <div className="text-lg">
                        <Latex latex={q.question.promptLatex} />
                    </div>
                ) : null}

                {/* ✅ promptBlocks shown plain (no label/header box) */}
                {promptBlocks.length > 0 ? (
                    <div>
                        <StimulusRender blocks={promptBlocks} variant="prompt" />
                    </div>
                ) : null}
            </div>

            {/* Choices */}
            {q?.kind === "mcq" ? (
                <div className="space-y-2">
                    <div className="text-sm font-semibold">Choices</div>
                    {(q.choices ?? []).map((c: any) => (
                        <div key={c.id} className="rounded-xl border p-3 flex gap-3 bg-white">
                            <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold">
                                {c.id}
                            </div>
                            <div className="flex-1">
                                {c.content ? <RichTextRender nodes={c.content} /> : <div>{c.text}</div>}
                            </div>
                        </div>
                    ))}
                    {q?.answer?.correct && (
                        <div className="text-xs text-slate-600">
                            Correct: <b>{q.answer.correct}</b>
                        </div>
                    )}
                </div>
            ) : q?.kind === "frq_math" ? (
                <div className="rounded-xl border p-3">
                    <div className="text-sm font-semibold">FRQ Accepted Answers</div>
                    <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(q.answer?.accepted ?? [], null, 2)}</pre>
                </div>
            ) : null}
        </div>
    );
}
