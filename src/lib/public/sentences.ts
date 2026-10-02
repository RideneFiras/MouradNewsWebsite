/**
 * Splits a block of text into sentences for read-aloud: ends at . ! ? ؟ … or a line break,
 * keeping the punctuation. Offsets are in the original string (for highlighting); empty
 * or punctuation-only pieces are dropped. Arabic commas don't end a sentence.
 */
export function splitSentences(text: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  const re = /[^.!?؟…\n]+(?:[.!?؟…]+|\n|$)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (!m[0]) {
      re.lastIndex++;
      continue;
    }
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const trimmed = raw.trim();
    if (!/[\p{L}\p{N}]/u.test(trimmed)) continue;
    const start = m.index + lead;
    out.push({ start, end: start + trimmed.length, text: trimmed });
  }
  return out;
}
