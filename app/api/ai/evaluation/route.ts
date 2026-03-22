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
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are Pramana Bot, a strict and expert AI SAT tutor. You dynamically evaluate mock test performances by analyzing which kinds of questions the student missed. Format your response beautifully with markdown, bolding, and italics. DO NOT under any circumstances mention ChatGPT or OpenAI. Do NOT estimate or generate a score out of 1600." },
                    { role: "user", content: `I just completed my mock test.\n\nHere is a list of my questions across all modules. Each entry shows if I got it right, wrong, or omitted, alongside a text preview of the question so you can independently infer its topic and difficulty:\n\n${JSON.stringify(testPerformance)}\n\nDo NOT score the test. Provide a rigorous automatic feedback evaluation highlighting my strengths and weaknesses based on the specific topics and types of questions I missed. Give highly actionable advice formatted nicely in markdown.` }
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
