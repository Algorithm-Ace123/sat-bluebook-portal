"use client";

export default function QuestionPopover({
    open,
    onClose,
    title,
    currentIndex,
    total,
    markedSet,
    answeredSet,
    onJump
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    currentIndex: number;
    total: number;
    markedSet: Set<number>;
    answeredSet: Set<number>;
    onJump: (index: number) => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40">
            <button className="absolute inset-0 bg-black/0" onClick={onClose} aria-label="Close" />

            <div className="absolute left-1/2 -translate-x-1/2 bottom-20 w-[92vw] max-w-[720px]">
                <div className="bg-white rounded-2xl border shadow-2xl p-6 relative">
                    <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-700" aria-label="Close">
                        ✕
                    </button>

                    <div className="text-2xl font-bold text-center">{title}</div>

                    <div className="mt-4 border-t" />

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm font-semibold">
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-3 h-3 rounded-full border-2 border-slate-900" />
                            Current
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border border-dashed border-slate-700" />
                            Unanswered
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 bg-blue-600" />
                            Answered
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-block w-4 h-4 bg-red-600" />
                            For Review
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {Array.from({ length: total }).map((_, i) => {
                            const current = i === currentIndex;
                            const answered = answeredSet.has(i);
                            const marked = markedSet.has(i);

                            const base = "w-12 h-12 flex items-center justify-center font-bold text-lg border-2";
                            const style = marked
                                ? "border-red-600 bg-red-600 text-white"
                                : answered
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-dashed border-slate-300 text-slate-400 bg-white";

                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        onJump(i);
                                        onClose();
                                    }}
                                    className={`${base} ${style} relative`}
                                >
                                    {i + 1}
                                    {current && (
                                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-slate-900">
                                            ⦿
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* pointer */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[18px] border-t-white" />
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-[19px] w-0 h-0 border-l-[19px] border-l-transparent border-r-[19px] border-r-transparent border-t-[19px] border-t-slate-200/90" />
                </div>
            </div>
        </div>
    );
}
