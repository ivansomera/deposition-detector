import { NextResponse } from "next/server";
import { TRANSCRIPT_1, TRANSCRIPT_2 } from "@/data/transcripts";
import cachedData from "@/data/cached-extraction.json";
import { extractPairs } from "@/lib/gemini";
import { ExtractionSchema, Extraction } from "@/lib/schema";

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

        // Step 3 goes here: run classify() and score() on each pair

        return NextResponse.json({ source: source, pairs: extraction.pairs });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Analysis failed. Please try again." },
            { status: 500 }
        );
    }
}