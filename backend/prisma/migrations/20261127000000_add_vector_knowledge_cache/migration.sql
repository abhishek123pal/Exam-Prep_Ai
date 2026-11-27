CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
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

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_subjectId_idx" ON "KnowledgeChunk"("subjectId");
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx" ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);

-- SemanticCache may already exist in installations created with `prisma db push`.
-- It is disposable, so clear global/legacy entries before switching to scoped keys.
CREATE TABLE IF NOT EXISTS "SemanticCache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subjectId" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'chat',
    "query" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SemanticCache_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SemanticCache_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SemanticCache" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE "SemanticCache" ADD COLUMN IF NOT EXISTS "requestType" TEXT NOT NULL DEFAULT 'chat';
DELETE FROM "SemanticCache";
DROP INDEX IF EXISTS "SemanticCache_query_key";
DROP INDEX IF EXISTS "semantic_cache_embedding_idx";
DROP INDEX IF EXISTS "SemanticCache_embedding_idx";
ALTER TABLE "SemanticCache" DROP CONSTRAINT IF EXISTS "SemanticCache_query_key";
ALTER TABLE "SemanticCache" ALTER COLUMN "subjectId" SET NOT NULL;
ALTER TABLE "SemanticCache" ALTER COLUMN "embedding" TYPE vector(768) USING "embedding"::vector(768);
ALTER TABLE "SemanticCache" ALTER COLUMN "embedding" SET NOT NULL;
ALTER TABLE "SemanticCache" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SemanticCache" ALTER COLUMN "createdAt" SET NOT NULL;

-- Discard invalid legacy chunks that do not belong to an existing subject.
DELETE FROM "KnowledgeChunk" kc
WHERE NOT EXISTS (SELECT 1 FROM "Subject" s WHERE s."id" = kc."subjectId");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KnowledgeChunk_subjectId_fkey') THEN
        ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_subjectId_fkey"
            FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SemanticCache_subjectId_fkey') THEN
        ALTER TABLE "SemanticCache" ADD CONSTRAINT "SemanticCache_subjectId_fkey"
            FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SemanticCache_subjectId_requestType_query_key" ON "SemanticCache"("subjectId", "requestType", "query");
CREATE INDEX IF NOT EXISTS "SemanticCache_embedding_hnsw_idx" ON "SemanticCache" USING hnsw ("embedding" vector_cosine_ops);
