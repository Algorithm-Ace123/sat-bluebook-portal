// app/api/ai/explanation/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { question, answer, isCorrect } = await req.json();

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
                    { role: "system", content: "You are Pramana Bot, an expert AI SAT tutor. Provide a concise, highly accurate explanation for the student." },
                    { role: "user", content: `Question Info:\n${JSON.stringify(question)}\n\nStudent Answer:\n${JSON.stringify(answer)}\n\nIs Correct: ${isCorrect}\n\nPlease explain why the correct answer is correct, why the student's answer (if they answered) is incorrect, and provide helpful tips. Format nicely with markdown.` }
                ]
            })
        });

        const data = await response.json();
        if (data.error) {
            return NextResponse.json({ error: data.error.message }, { status: 500 });
        }
        return NextResponse.json({ explanation: data.choices[0].message.content });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
