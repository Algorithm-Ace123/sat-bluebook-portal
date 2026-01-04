import { z } from "zod";

/**
 * Pramana Test JSON Schema (v1.0)
 * Now supports stimulus label blocks:
 *   { "type": "label", "text": "Text 1" }
 */

export const AssetSchema = z.object({
    id: z.string().min(1),
    type: z.enum(["image", "pdf"]),
    url: z.string().url()
});

export const TableSchema = z.object({
    type: z.literal("table"),
    caption: z.string().optional(),
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string()))
});

export const StimulusBlockSchema = z.union([
    z.object({ type: z.literal("label"), text: z.string().min(1) }), // NEW
    z.object({ type: z.literal("text"), text: z.string() }),
    z.object({ type: z.literal("latex"), latex: z.string() }),
    z.object({
        type: z.literal("image"),
        assetId: z.string().min(1),
        alt: z.string().optional()
    }),
    TableSchema
]);

export const StimulusSchema = z.object({
    type: z.enum(["passage", "none"]),
    content: z.array(StimulusBlockSchema).optional()
});

export const ChoiceSchema = z
    .object({
        id: z.string().min(1),
        text: z.string().optional(),
        latex: z.string().optional(),
        image: z
            .object({
                assetId: z.string().min(1),
                alt: z.string().optional()
            })
            .optional()
    })
    .refine((c) => c.text || c.latex || c.image, "Choice must have text OR latex OR image");

export const AnswerMCQSchema = z.object({
    correct: z.string().min(1)
});

export const AcceptedAnswerSchema = z.union([
    z.object({ type: z.literal("exact"), value: z.string().min(1) }),
    z.object({
        type: z.literal("numeric"),
        value: z.number(),
        tolerance: z.number().nonnegative().optional()
    }),
    z.object({ type: z.literal("fraction"), value: z.string().min(3) })
]);

export const AnswerFRQSchema = z.object({
    accepted: z.array(AcceptedAnswerSchema).min(1)
});

export const QuestionSchema = z
    .object({
        id: z.string().min(1),
        kind: z.enum(["mcq", "frq_math"]),
        stimulus: StimulusSchema,
        prompt: z.string().optional(),
        promptLatex: z.string().optional(),
        choices: z.array(ChoiceSchema).optional(),
        answer: z.union([AnswerMCQSchema, AnswerFRQSchema]),
        explanation: z.string().optional()
    })
    .refine((q) => q.prompt || q.promptLatex, "Question must have prompt or promptLatex")
    .refine((q) => (q.kind === "mcq" ? q.choices?.length === 4 : true), "MCQ must have exactly 4 choices")
    .refine((q) => (q.kind === "frq_math" ? !q.choices : true), "FRQ must not have choices");

export const ModuleSchema = z.object({
    id: z.string().min(1),
    timeLimitSec: z.number().int().positive(),
    items: z.array(QuestionSchema).min(1)
});

export const TestJsonSchema = z
    .object({
        version: z.literal("1.0"),
        title: z.string().min(1),
        section: z.enum(["RW", "MATH", "FULL"]),
        modules: z.array(ModuleSchema).min(1),
        assets: z.array(AssetSchema).optional(),
        tools: z
            .object({
                desmos: z.boolean().optional(),
                referenceSheetUrl: z.string().url().optional()
            })
            .optional()
    })
    .superRefine((test, ctx) => {
        const assets = new Set((test.assets ?? []).map((a) => a.id));
        for (const mod of test.modules) {
            for (const q of mod.items) {
                for (const block of q.stimulus.content ?? []) {
                    if ((block as any).type === "image") {
                        const id = (block as any).assetId;
                        if (!assets.has(id)) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: `Missing assetId "${id}" referenced in stimulus`,
                                path: ["modules", mod.id, "items", q.id, "stimulus"]
                            });
                        }
                    }
                }
                if (q.kind === "mcq") {
                    for (const c of q.choices ?? []) {
                        if (c.image?.assetId && !assets.has(c.image.assetId)) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: `Missing assetId "${c.image.assetId}" referenced in choice ${c.id}`,
                                path: ["modules", mod.id, "items", q.id, "choices"]
                            });
                        }
                    }
                }
            }
        }
    });

export type TestJson = z.infer<typeof TestJsonSchema>;
export type Question = z.infer<typeof QuestionSchema>;
