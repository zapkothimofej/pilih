-- Add xpEarned column to DailySession (nullable, backfill-safe)
ALTER TABLE "DailySession" ADD COLUMN "xpEarned" INTEGER;

-- FK performance indices
CREATE INDEX "Challenge_userId_idx" ON "Challenge"("userId");
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX "DailySession_userId_idx" ON "DailySession"("userId");
CREATE INDEX "DailySession_status_idx" ON "DailySession"("status");
CREATE INDEX "PromptAttempt_userId_idx" ON "PromptAttempt"("userId");
CREATE INDEX "PromptAttempt_sessionId_idx" ON "PromptAttempt"("sessionId");
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX "OnboardingProfile_userId_idx" ON "OnboardingProfile"("userId");

-- Webhook idempotency table
CREATE TABLE "ProcessedWebhook" (
  "id"        TEXT NOT NULL,
  "svixId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProcessedWebhook_svixId_key" ON "ProcessedWebhook"("svixId");
