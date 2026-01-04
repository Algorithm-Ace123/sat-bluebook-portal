"use client";

import Modal from "./Modal";

export default function ReferenceModal({
    open,
    onClose,
    url
}: {
    open: boolean;
    onClose: () => void;
    url?: string;
}) {
    return (
        <Modal open={open} title="Reference Sheet" onClose={onClose} maxWidthClass="max-w-5xl">
            {url ? (
                <iframe src={url} className="w-full h-[75vh] rounded-xl border" />
            ) : (
                <div className="text-sm text-slate-600">
                    No reference sheet URL set. Add{" "}
                    <code className="bg-slate-100 px-1 rounded">tools.referenceSheetUrl</code> in test JSON.
                </div>
            )}
        </Modal>
    );
}
