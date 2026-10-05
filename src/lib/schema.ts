import { z } from "zod";

// One candidate contradiction, as Gemini returns it
export const PairSchema = z.object({
    quote1: z.string(),
    quote2: z.string(),
    relation: z.enum(["opposes", "needs_assumption"]),
    assumption: z.string().nullish(),          // may be missing or null
    times1: z.array(z.string()).default([]),
    times2: z.array(z.string()).default([]),
});

// The whole reply: a list of pairs
export const ExtractionSchema = z.object({
    pairs: z.array(PairSchema),
});

// TypeScript types generated from the schemas
export type Pair = z.infer<typeof PairSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;