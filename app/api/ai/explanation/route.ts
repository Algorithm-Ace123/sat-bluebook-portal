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
                    { role: "system", content: "You are Pramana Bot, an expert AI SAT tutor. You must format your responses perfectly using bold keywords, italics, and clear paragraphs. Provide rationale for why the correct answer is correct and why other answers are wrong. DO NOT mention ChatGPT, OpenAI, or being an AI." },
                    { role: "user", content: `Question Info:\n${JSON.stringify(question)}\n\nStudent Answer:\n${JSON.stringify(answer)}\n\nIs Correct: ${isCorrect}\n\nPlease precisely explain the rationale for why the correct answer is correct, and specifically explain why the other options (including the student's answer) are wrong.` }
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
