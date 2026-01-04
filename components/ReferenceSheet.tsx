"use client";

export default function ReferenceSheet({
    open,
    onClose,
    url
}: {
    open: boolean;
    onClose: () => void;
    url?: string;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow">
                <div className="flex items-center justify-between p-3 border-b">
                    <div className="font-semibold text-sm">Reference Sheet</div>
                    <button onClick={onClose} className="rounded-xl border px-3 py-1 text-sm">
                        Close
                    </button>
                </div>
                <div className="p-3">
                    {url ? (
                        <iframe src={url} className="w-full h-[70vh] rounded-xl border" />
                    ) : (
                        <div className="text-sm text-slate-600">
                            No reference sheet URL found. Set <code className="bg-slate-100 px-1 rounded">tools.referenceSheetUrl</code> in test JSON.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
