"use client";

import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface ProgressPoint {
    name: string;
    rw: number;
    math: number;
    total: number;
    date: string;
}

interface DeltaInfo {
    diff: number;
    trend: 'up' | 'down' | 'flat';
}

export function PulseCard({ 
    label, 
    score, 
    delta, 
    color = "blue" 
}: { 
    label: string; 
    score: number; 
    delta: DeltaInfo | null;
    color?: "blue" | "emerald" | "purple"
}) {
    const colorClasses = {
        blue: "text-blue-600 bg-blue-50",
        emerald: "text-emerald-600 bg-emerald-50",
        purple: "text-purple-600 bg-purple-50"
    };

    return (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{label}</div>
                <div className="text-5xl font-black text-slate-900 tracking-tight">{score}</div>
            </div>
            
            <div className="mt-8 flex items-center justify-between">
                {delta ? (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black ${
                        delta.trend === 'up' ? "bg-emerald-50 text-emerald-600" : (delta.trend === 'down' ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500")
                    }`}>
                        {delta.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : (delta.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />)}
                        {delta.diff > 0 ? `+${delta.diff}` : delta.diff} Since Previous
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 text-slate-400 italic">
                        Baseline Score
                    </div>
                )}
                
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Info className="w-5 h-5 opacity-40" />
                </div>
            </div>
        </div>
    );
}

export default function StudentProgressCharts({ history }: { history: ProgressPoint[] }) {
    if (!history || history.length === 0) return null;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">{label}</p>
                    <div className="space-y-1">
                        {payload.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-8">
                                <span className="text-xs font-bold opacity-80">{p.name}:</span>
                                <span className="text-sm font-black" style={{ color: p.name === "Total" && p.color === "#0f172a" ? "#ffffff" : p.color }}>{p.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Progress Trajectory</h3>
                    <p className="text-slate-500 font-medium">Visualization of your academic growth across all completed mock sessions.</p>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        <span className="text-xs font-bold text-slate-600">English</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-600" />
                        <span className="text-xs font-bold text-slate-600">Math</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-900" />
                        <span className="text-xs font-bold text-slate-600">Total</span>
                    </div>
                </div>
            </div>

            <div className="h-[400px] w-full mt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRW" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorMath" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis 
                            domain={[200, 1600]} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        <Area 
                            name="RW"
                            type="monotone" 
                            dataKey="rw" 
                            stroke="#2563eb" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRW)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <Area 
                            name="Math"
                            type="monotone" 
                            dataKey="math" 
                            stroke="#9333ea" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorMath)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                        <TrendLine 
                            name="Total"
                            dataKey="total" 
                            stroke="#0f172a" 
                            strokeWidth={4}
                            fillOpacity={1} 
                            fill="url(#colorTotal)" 
                            activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// Recharts Area with a trend line feel
function TrendLine(props: any) {
    return <Area {...props} type="monotone" />;
}
