import { NextResponse } from "next/server";
import { TRANSCRIPT_1, TRANSCRIPT_2 } from "@/data/transcripts";
import cachedData from "@/data/cached-extraction.json";
import { extractPairs } from "@/lib/gemini";
import { ExtractionSchema, Extraction } from "@/lib/schema";
import { classify, score } from "@/lib/scoring";

export async function POST() {
    try {
        let extraction: Extraction;
        let source: string;

        if (process.env.GEMINI_API_KEY) {
            extraction = await extractPairs(TRANSCRIPT_1, TRANSCRIPT_2);
            source = "live";
        } else {
            // No key: use saved Gemini output so the app still runs
            extraction = ExtractionSchema.parse(cachedData);
            source = "cached";
        }

        // Run every pair through classify, then score
        const results = [];
        for (const pair of extraction.pairs) {
            const type = classify(pair, TRANSCRIPT_1, TRANSCRIPT_2);
            if (type === "DROP") {
                continue; // quote wasn't found in the transcript
            }
            const scored = score(pair, type);
            results.push({
                ...pair,
                type: type,
                confidence: scored.confidence,
                reasons: scored.reasons,
            });
        }

        return NextResponse.json({ source: source, results: results });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Analysis failed. Please try again." },
            { status: 500 }
        );
    }
}