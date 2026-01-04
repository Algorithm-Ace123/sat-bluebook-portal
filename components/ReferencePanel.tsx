"use client";

import DraggableResizablePanel from "./DraggableResizablePanel";

export default function ReferencePanel({
    open,
    onClose,
    url
}: {
    open: boolean;
    onClose: () => void;
    url?: string;
}) {
    return (
        <DraggableResizablePanel
            open={open}
            onClose={onClose}
            title="Reference"
            initialRect={{ x: 90, y: 90, w: 980, h: 640 }}
            minWidth={520}
            minHeight={420}
        >
            <div className="w-full h-full bg-white flex items-center justify-center">
                <img
                    src={url || "/reference.png"}
                    alt="Reference Sheet"
                    className="max-w-full max-h-full object-contain"
                />
            </div>
        </DraggableResizablePanel>
    );
}
