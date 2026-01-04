// lib/authoring.ts
import { z } from "zod";

/**
 * PRAMANA AUTHORING SCHEMA (v1.1)
 *
 * Key additions:
 * - question.promptBlocks?: StimulusBlock[]  (tables/images/paragraphs inside prompt area)
 *
 * This enables Bluebook-like Math behavior:
 * - Math MCQ: diagrams/tables belong to prompt area (not stimulus)
 * - Math FRQ: right prompt can also include blocks; left stimulus is fixed by runner
 */

export const MarkSchema = z.enum(["bold", "italic", "underline"]);
export type Mark = z.infer<typeof MarkSchema>;

export const InlineTextSchema = z.object({
    type: z.literal("text"),
    text: z.string(),
    marks: z.array(MarkSchema).optional()
});

export const InlineMathSchema = z.object({
    type: z.literal("math"),
    latex: z.string().min(1)
});

export const InlineNodeSchema = z.union([InlineTextSchema, InlineMathSchema]);
export type InlineNode = z.infer<typeof InlineNodeSchema>;

export const InlineContentSchema = z.array(InlineNodeSchema).min(1);

// -----------------------------
// Stimulus blocks (Option A)
// -----------------------------
export const HeadingBlockSchema = z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    content: InlineContentSchema
});

export const ParagraphBlockSchema = z.object({
    type: z.literal("paragraph"),
    content: InlineContentSchema
});

export const TableBlockSchema = z.object({
    type: z.literal("table"),
    label: z.string().optional(),
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string()))
}).superRefine((t, ctx) => {
    const cols = t.columns.length;
    for (let i = 0; i < t.rows.length; i++) {
        if (t.rows[i].length !== cols) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Row ${i + 1} length (${t.rows[i].length}) does not match columns (${cols})`
            });
        }
    }
});

export const ImageBlockSchema = z.object({
    type: z.literal("image"),
    label: z.string().optional(),
    src: z.string().min(1),
    alt: z.string().min(1)
});

export const MathBlockSchema = z.object({
    type: z.literal("math_block"),
    label: z.string().optional(),
    latex: z.string().min(1)
});

export const StimulusBlockSchema = z.union([
    HeadingBlockSchema,
    ParagraphBlockSchema,
    TableBlockSchema,
    ImageBlockSchema,
    MathBlockSchema
]);

export type StimulusBlock = z.infer<typeof StimulusBlockSchema>;

// -----------------------------
// Prompt + choices
// -----------------------------
export const PromptSchema = z.object({
    // inline prompt text (supports inline math)
    prompt: z.array(InlineNodeSchema).optional(),

    // optional standalone equation block for “math font only”
    promptLatex: z.string().optional(),

    // NEW: blocks that appear in the prompt area (tables/images/extra paragraphs)
    promptBlocks: z.array(StimulusBlockSchema).optional()
}).refine((p) => {
    const hasPrompt = p.prompt && p.prompt.length > 0;
    const hasLatex = p.promptLatex && p.promptLatex.trim().length > 0;
    const hasBlocks = p.promptBlocks && p.promptBlocks.length > 0;
    return hasPrompt || hasLatex || hasBlocks;
}, {
    message: "Provide prompt and/or promptLatex and/or promptBlocks"
});

export const ChoiceSchema = z.object({
    id: z.enum(["A", "B", "C", "D"]),
    content: InlineContentSchema,
    image: z.object({
        src: z.string().min(1),
        alt: z.string().min(1),
        label: z.string().optional()
    }).optional()
});

// -----------------------------
// Question types
// -----------------------------
export const MCQQuestionSchema = z.object({
    kind: z.literal("mcq"),
    stimulus: z.array(StimulusBlockSchema),
    question: PromptSchema,
    choices: z.array(ChoiceSchema).length(4),
    answer: z.object({ correct: z.enum(["A", "B", "C", "D"]) })
}).superRefine((q, ctx) => {
    const ids = q.choices.map((c) => c.id);
    const set = new Set(ids);
    if (set.size !== 4) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choices must have unique ids A, B, C, D" });
    }
});

export const FRQAcceptedSchema = z.union([
    z.object({ type: z.literal("exact"), value: z.string() }),
    z.object({ type: z.literal("numeric"), value: z.number(), tolerance: z.number().optional() }),
    z.object({ type: z.literal("fraction"), value: z.string() })
]);

export const FRQMathQuestionSchema = z.object({
    kind: z.literal("frq_math"),
    stimulus: z.array(StimulusBlockSchema),
    question: PromptSchema,
    answer: z.object({
        accepted: z.array(FRQAcceptedSchema).min(1)
    })
});

export const AuthoringQuestionSchema = z.union([MCQQuestionSchema, FRQMathQuestionSchema]);
export type AuthoringQuestion = z.infer<typeof AuthoringQuestionSchema>;

// -----------------------------
// Modules
// -----------------------------
export const ModuleKeySchema = z.enum(["RW_M1", "RW_M2", "MATH_M1", "MATH_M2"]);
export type ModuleKey = z.infer<typeof ModuleKeySchema>;
