"use client";

import Modal from "./Modal";

export default function HighlightsNotesModal({
    open,
    onClose,
    notes,
    setNotes,
    highlights
}: {
    open: boolean;
    onClose: () => void;
    notes: string;
    setNotes: (v: string) => void;
    highlights: Array<{ blockKey: string; preview: string }>;
}) {
    return (
        <Modal open={open} title="Highlights & Notes" onClose={onClose} maxWidthClass="max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border p-3">
                    <div className="text-sm font-semibold">Notes</div>
                    <textarea
                        className="mt-2 w-full h-[50vh] md:h-[60vh] rounded-xl border p-3 text-sm"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Write notes here…"
                    />
                </div>

                <div className="rounded-xl border p-3">
                    <div className="text-sm font-semibold">Highlights</div>
                    <div className="mt-2 text-xs text-slate-600">
                        In this MVP, highlighting works per paragraph/sentence block.
                    </div>

                    <div className="mt-3 space-y-2 max-h-[50vh] md:max-h-[60vh] overflow-auto">
                        {highlights.length === 0 ? (
                            <div className="text-sm text-slate-500">No highlights yet.</div>
                        ) : (
                            highlights.map((h) => (
                                <div key={h.blockKey} className="rounded-xl border bg-slate-50 p-3">
                                    <div className="text-xs text-slate-500">Block: {h.blockKey}</div>
                                    <div className="text-sm mt-1">{h.preview}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
