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
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: "You are Pramana Bot, an expert AI SAT tutor. You must ONLY return a raw JSON object. NO markdown fences outside the JSON. The JSON must exactly follow this schema: { \"correct_rationale\": \"string explaining why correct answer is correct\", \"incorrect_rationales\": [{ \"option\": \"string (e.g. A, B, C, D or the value)\", \"rationale\": \"string explaining why it is wrong\" }], \"tips\": \"string with helpful tip\" }." },
                    { role: "user", content: `Question Info:\n${JSON.stringify(question)}\n\nStudent Answer:\n${JSON.stringify(answer)}\n\nIs Correct: ${isCorrect}\n\nPlease generate the JSON exactly as requested.` }
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
