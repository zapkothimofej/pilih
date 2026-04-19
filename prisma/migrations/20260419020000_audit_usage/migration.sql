-- Per-attempt Anthropic usage — enables cost dashboards and cache-hit
-- ratio monitoring without needing to reconstruct billing from logs.
ALTER TABLE "PromptAttempt"
  ADD COLUMN "tokensIn" INTEGER,
  ADD COLUMN "tokensOut" INTEGER,
  ADD COLUMN "cacheReadTokens" INTEGER,
  ADD COLUMN "cacheCreateTokens" INTEGER,
  ADD COLUMN "latencyMs" INTEGER;

-- Audit trail for admin actions. The pre-existing adminOverride JSON
-- inside FinalSubmission.llmReview was clobber-prone; this is
-- append-only.
CREATE TABLE "AuditEvent" (
  "id"         TEXT         NOT NULL,
  "actorId"    TEXT         NOT NULL,
  "action"     TEXT         NOT NULL,
  "targetType" TEXT         NOT NULL,
  "targetId"   TEXT         NOT NULL,
  "diff"       JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent" ("actorId", "createdAt");
CREATE INDEX "AuditEvent_targetType_targetId_idx" ON "AuditEvent" ("targetType", "targetId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent" ("createdAt");
