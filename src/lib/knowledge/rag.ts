import { prisma } from "@/lib/prisma";
import { toJson, fromJson } from "@/lib/json";
import { embed, cosineSimilarity } from "@/lib/knowledge/embed";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 120;

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/** Document -> Chunk -> Embed -> Index (spec §33). */
export async function indexDocument(documentId: string): Promise<number> {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  if (!doc.content) return 0;

  await prisma.knowledgeChunk.deleteMany({ where: { documentId } });

  const chunks = chunkText(doc.content);
  await prisma.$transaction(
    chunks.map((content, i) =>
      prisma.knowledgeChunk.create({
        data: {
          documentId,
          chunkIndex: i,
          content,
          embedding: toJson(embed(content)),
          sourceType: doc.sourceType,
          metadata: toJson({ documentTitle: doc.title }),
        },
      })
    )
  );
  return chunks.length;
}

export interface KnowledgeSearchHit {
  documentId: string;
  documentTitle: string;
  sourceType: string;
  chunkIndex: number;
  content: string;
  score: number;
}

/**
 * Retrieval + Citation (spec §33-34). Only returns chunks that actually
 * exist in the database — there is no path here that lets an agent cite a
 * document it didn't retrieve.
 */
export async function searchKnowledge(params: {
  workspaceId: string;
  query: string;
  limit?: number;
  sourceTypes?: string[];
}): Promise<KnowledgeSearchHit[]> {
  const { workspaceId, query, limit = 5, sourceTypes } = params;
  const queryVec = embed(query);

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      document: { workspaceId },
      ...(sourceTypes && sourceTypes.length ? { sourceType: { in: sourceTypes } } : {}),
    },
    include: { document: true },
    take: 2000, // local cosine scan cap; swap for pgvector ANN index at scale (see schema.prisma note)
  });

  const scored = chunks
    .map((c) => ({
      documentId: c.documentId,
      documentTitle: c.document.title,
      sourceType: c.sourceType,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: cosineSimilarity(queryVec, fromJson<number[]>(c.embedding, [])),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
