export function buildPrompt(transcript1: string, transcript2: string): string {
    return `You are helping a lawyer compare two deposition transcripts from the same witness. Transcript 1 is the earlier deposition and transcript 2 is the later one.

Find every place where the witness's statements might conflict between transcript 1 and transcript 2. Include possible conflicts even if they could turn out to be harmless. Another system will verify each one, so do not judge how serious or how certain they are.

Rules for each pair:
- One pair per conflict. If two separate things conflict, make two pairs.
- quote1 and quote2: copy only the sentence or sentences that conflict, word for word, exactly as written. Do not paraphrase.
- relation: "opposes" if the statements directly contradict each other. "needs_assumption" if they only conflict once you assume something unstated.
- assumption: if relation is "needs_assumption", state the assumption in one sentence. Otherwise null.
- times1 and times2: copy any time expressions from that quote exactly as written, including words like "around" or "maybe" (for example "around 7pm"). Use an empty array if there are none.

Return only JSON in this shape, with no other text:
{"pairs": [{"quote1": "", "quote2": "", "relation": "opposes", "assumption": null, "times1": [], "times2": []}]}

TRANSCRIPT 1 (EARLIER):
${transcript1}

TRANSCRIPT 2 (LATER):
${transcript2}`;
}