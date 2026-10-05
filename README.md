# Deposition Contradiction Detector

Compares two depositions from the same witness and flags where their story changed. Each contradiction is classified as **direct**, **inferential**, or **false positive**, with a confidence score computed by the app's own rules, not by the LLM.

## Run it

```
npm run demo
```

Then open http://localhost:3000.

No API key is needed. Without one, the app uses a saved real Gemini response. To run live analysis, copy `.env.example` to `.env.local` and add a free key from Google AI Studio.

## How it works

1. **Extract:** Gemini reads both transcripts and returns candidate pairs: exact quotes, any time phrases, and whether the statements oppose each other or need an assumption to conflict. It does not judge type or confidence.
2. **Validate:** Zod checks the response shape, with one retry on bad output.
3. **Classify** (`src/lib/scoring.ts`):
    - Quotes not found word for word in the transcripts are dropped
    - If both quotes have times and the time ranges overlap, it's a false positive
    - Otherwise, the model's suggestion decides direct or inferential
4. **Score:** each type starts at a base confidence (direct 0.9, false positive 0.8, inferential 0.6), lowered 10% per hedge word ("maybe", "I think", "I don't remember"...), capped at 40%. Every score lists its reasons.

## Known limitations

- The model's direct/inferential label is the least reliable input, and live runs can pair statements differently.
- Times are compared on a 12-hour clock, so "7am" and "7pm" look the same.
- Hedge detection is word matching, so "about" in "talked about it" counts as a hedge.