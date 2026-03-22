// app/api/ai/evaluation/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { rwScaled, mathScaled, testPerformance } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: "No OPENAI_API_KEY configured in environment variables." }, { status: 500 });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are Pramana Bot, a strict and expert AI SAT tutor. You dynamically evaluate mock test performances by analyzing which kinds of questions the student missed." },
                    { role: "user", content: `I just completed my mock test.\n\nHere is a list of my questions across all modules. Each entry shows if I got it right, wrong, or omitted, alongside a text preview of the question so you can independently infer its topic and difficulty:\n\n${JSON.stringify(testPerformance)}\n\nFirst, act like the strict digital SAT scoring algorithm. Estimate/infer the relative difficulty of the questions I missed or omitted. Deduct MORE points if I made errors on what you determine to be easy questions, and deduct fewer points if the questions are extremely hard. Generate a strictly-graded estimated final score out of 1600, showing precisely the score per section (RW out of 800, Math out of 800) using your own algorithmic estimation.\n\nThen, provide a rigorous evaluation highlighting my weaknesses based on the specific questions I missed, and give highly actionable advice formatted nicely in markdown.` }
                ]
            })
        });

        const data = await response.json();
        if (data.error) {
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }
        return NextResponse.json({ evaluation: data.choices[0].message.content });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
