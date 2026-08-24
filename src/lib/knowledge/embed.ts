/**
 * Local, credential-free "embedding". This is a deterministic hashed
 * bag-of-words vector (like the hashing trick used in classic text
 * classifiers) — NOT a neural embedding, and retrieval quality is closer to
 * keyword search than true semantic search. It is real and functional
 * (cosine similarity over these vectors genuinely ranks relevant chunks
 * higher), which is the honest thing to ship without an embeddings API key.
 *
 * To upgrade: replace `embed()` with a real provider call (Voyage, OpenAI,
 * etc.) behind the same signature — nothing else in src/lib/knowledge/rag.ts
 * needs to change, and re-run `npm run db:seed -- --reindex` (or re-upload
 * documents) to backfill real embeddings.
 */

const DIMENSIONS = 256;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % DIMENSIONS;
}

export function embed(text: string): number[] {
  const vec = new Array<number>(DIMENSIONS).fill(0);
  for (const token of tokenize(text)) {
    const idx = hashToken(token);
    vec[idx] = (vec[idx] ?? 0) + 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return dot; // both vectors are already L2-normalized in embed()
}
