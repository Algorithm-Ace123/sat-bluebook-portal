"use client";

import { useEffect, useState } from 'react';

export default function AdminConversionTables() {
  const [tables, setTables] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [section, setSection] = useState<'RW' | 'MATH'>('RW');
  const [payload, setPayload] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    const res = await fetch('/api/admin/conversion-tables/list');
    const json = await res.json();
    if (json.ok) setTables(json.tables || []);
  }

  async function onUpload() {
    setMsg(null);
    // Try parse payload as JSON; if it fails, try CSV
    let mapping: Record<string, number> | null = null;
    try {
      const parsed = JSON.parse(payload);
      if (typeof parsed === 'object') {
        mapping = parsed;
      }
    } catch (e) {
      // Try CSV: lines of raw,score
      const lines = payload.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      mapping = {};
      for (const ln of lines) {
        const parts = ln.split(',').map(p => p.trim());
        if (parts.length < 2) continue;
        const raw = Number(parts[0]);
        const score = Number(parts[1]);
        if (!Number.isFinite(raw) || !Number.isFinite(score)) continue;
        mapping[raw] = score;
      }
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      setMsg('Failed to parse mapping. Provide JSON object or CSV with raw,score rows.');
      return;
    }

    const maxRaw = Math.max(...Object.keys(mapping).map(k => Number(k)));

    const res = await fetch('/api/admin/conversion-tables/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, section, maxRaw, mapping })
    });
    const json = await res.json();
    if (!json.ok) {
      setMsg('Upload error: ' + (json.error || 'Unknown'));
      return;
    }
    setMsg('Upload successful');
    setName(''); setPayload('');
    fetchList();
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Conversion Tables (Admin)</h1>
      <div className="mb-6 grid grid-cols-3 gap-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="col-span-1 p-2 border" />
        <select value={section} onChange={(e) => setSection(e.target.value as 'RW'|'MATH')} className="col-span-1 p-2 border">
          <option value="RW">Reading & Writing</option>
          <option value="MATH">Math</option>
        </select>
        <button onClick={onUpload} className="col-span-1 bg-blue-600 text-white p-2 rounded">Upload</button>
      </div>

      <textarea value={payload} onChange={(e) => setPayload(e.target.value)} placeholder='Paste JSON object {"0":200,"10":300,...} or CSV lines `raw,score`' className="w-full h-40 p-2 border mb-4" />
      {msg && <div className="mb-4 text-sm text-red-600">{msg}</div>}

      <h2 className="text-xl font-semibold mt-6 mb-2">Existing Tables</h2>
      <div className="space-y-4">
        {tables.length === 0 && <div className="text-sm text-slate-500">No tables uploaded yet.</div>}
        {tables.map(t => (
          <div key={t.id} className="border rounded p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-slate-500">{t.section} • max raw {t.max_raw}</div>
              </div>
              <div className="text-xs">Created {new Date(t.created_at).toLocaleString()}</div>
            </div>
            <pre className="mt-2 text-xs overflow-auto max-h-40">{JSON.stringify(t.mapping, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}