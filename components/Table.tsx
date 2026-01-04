export default function Table({ table }: { table: any }) {
    return (
        <div className="overflow-x-auto">
            {table.caption && <div className="text-xs text-slate-600 mb-2">{table.caption}</div>}
            <table className="min-w-full border rounded-xl overflow-hidden">
                <thead className="bg-slate-100">
                    <tr>
                        {table.columns.map((c: string) => (
                            <th key={c} className="text-left text-xs font-semibold p-2 border-b">
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((r: string[], idx: number) => (
                        <tr key={idx} className="odd:bg-white even:bg-slate-50">
                            {r.map((cell: string, j: number) => (
                                <td key={j} className="text-xs p-2 border-b">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
