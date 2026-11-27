CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "subjectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "metadata" JSONB,
    "content" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "KnowledgeChunk_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "KnowledgeChunk_subjectId_idx" ON "KnowledgeChunk"("subjectId");
CREATE INDEX "KnowledgeChunk_embedding_hnsw_idx" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE "SemanticCache" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "subjectId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'chat',
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SemanticCache_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SemanticCache_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SemanticCache_subjectId_requestType_query_key" ON "SemanticCache"("subjectId", "requestType", "query");
CREATE INDEX "SemanticCache_embedding_hnsw_idx" ON "SemanticCache" USING hnsw ("embedding" vector_cosine_ops);
