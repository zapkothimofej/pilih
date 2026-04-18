-- Prevent concurrent challenge generators from writing two rows for the
-- same user/day tuple. The existing count-based TOCTOU in
-- `POST /api/challenges/generate` relies on this constraint as the real
-- atomicity guard so we can pull the LLM call out of the Prisma
-- $transaction it was timing out inside.
ALTER TABLE "Challenge"
  ADD CONSTRAINT "Challenge_userId_dayNumber_key" UNIQUE ("userId", "dayNumber");

-- Range guards for LLM-influenced numeric columns. Prisma has no cross-
-- value arithmetic, but the abschluss raw UPDATE already clamps
-- currentDifficulty between 1 and 5; encode the invariant in the DB too
-- so a direct SQL tweak can't drift the adaptive loop out of bounds.
ALTER TABLE "Challenge"
  ADD CONSTRAINT "Challenge_difficulty_range" CHECK ("difficulty" BETWEEN 1 AND 5),
  ADD CONSTRAINT "Challenge_currentDifficulty_range" CHECK ("currentDifficulty" BETWEEN 1 AND 5);

ALTER TABLE "PromptAttempt"
  ADD CONSTRAINT "PromptAttempt_judgeScore_range" CHECK ("judgeScore" BETWEEN 0 AND 10);

-- Hot-path indices inferred from query shapes in heute/attempt/admin.
-- `(userId,status)` on DailySession lets the "last completed" lookup in
-- challenges/heute use an index-only scan. `companyId` on User backs
-- COMPANY_ADMIN listings that were sequential-scanning the whole User
-- table.
CREATE INDEX "DailySession_userId_status_idx" ON "DailySession"("userId", "status");
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- Needed for the cleanup job that will prune old webhook-dedup rows.
CREATE INDEX "ProcessedWebhook_createdAt_idx" ON "ProcessedWebhook"("createdAt");
