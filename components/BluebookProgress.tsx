"use client";

export default function BluebookProgress({
    total,
    currentIndex,
    answeredSet,
    markedSet
}: {
    total: number;
    currentIndex: number;
    answeredSet: Set<number>;
    markedSet: Set<number>;
}) {
    const getClass = (i: number) => {
        if (i === currentIndex) return "bg-blue-600";
        if (markedSet.has(i)) return "bg-yellow-400"; // Striped line in bluebook usually, but solid yellow is fine
        if (answeredSet.has(i)) return "bg-sky-300"; // Usually a lighter blue/grey? Screenshot shows standard dashed line.
        // Actually, in the screenshot:
        // Most are gray dashes.
        // Current is ?
        // Let's stick to the user's logic but style the bar itself.
        return "bg-slate-300";
    };

    // Refined logic for screenshot matching (approximate):
    // Current: Blue
    // Marked: Yellow (or orange-ish)
    // Answered: Gray/Black? Or solid?
    // Unvisited: Dashed Outline?

    // Let's stick to the color logic we had but change the shape.
    // Dashed line = flex gap-x-1

    return (
        <div className="w-full flex gap-0.5 h-1.5 mt-2">
            {Array.from({ length: total }).map((_, i) => {
                let colorClass = "bg-slate-300";
                if (i === currentIndex) colorClass = "bg-blue-600";
                else if (markedSet.has(i)) colorClass = "bg-yellow-400";
                else if (answeredSet.has(i)) colorClass = "bg-slate-400"; // Answered is usually filled

                return (
                    <div key={i} className={`flex-1 rounded-full ${colorClass}`} />
                );
            })}
        </div>
    );
}
