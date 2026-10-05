import { GoogleGenAI } from "@google/genai";
import { ExtractionSchema, Extraction } from "./schema";
import { buildPrompt } from "./prompt";

export async function extractPairs(transcript1: string, transcript2: string): Promise<Extraction> {
    const model = process.env.GEMINI_MODEL;
    if (!model) {
        throw new Error("GEMINI_MODEL is not set in .env.local");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = buildPrompt(transcript1, transcript2);

    // Try twice, since models occasionally return malformed output
    for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",  // ask for JSON only
                temperature: 0,                         // as consistent as possible
            },
        });

        const text = response.text ?? "";

        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch {
            console.warn("Attempt " + attempt + ": reply was not valid JSON");
            continue;
        }

        const result = ExtractionSchema.safeParse(json);
        if (result.success) {
            return result.data;
        }
        console.warn("Attempt " + attempt + ": reply did not match the schema");
    }

    throw new Error("Gemini returned invalid data twice");
}