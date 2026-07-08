-- CreateIndex
CREATE INDEX "users_resetToken_idx" ON "users"("resetToken");

-- CreateIndex
CREATE INDEX "users_emailVerificationToken_idx" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_isValid_idx" ON "refresh_tokens"("expiresAt", "isValid");

-- CreateIndex
CREATE INDEX "job_alerts_userId_idx" ON "job_alerts"("userId");

-- CreateIndex
CREATE INDEX "job_alerts_userId_createdAt_idx" ON "job_alerts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "jobs_jobAlertId_createdAt_idx" ON "jobs"("jobAlertId", "createdAt");
