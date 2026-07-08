-- Remove exact duplicate scraped jobs before enforcing idempotency.
WITH duplicate_jobs AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "jobAlertId", "link"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "jobs"
)
DELETE FROM "jobs"
WHERE "id" IN (
  SELECT "id"
  FROM duplicate_jobs
  WHERE row_number > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_jobAlertId_link_key" ON "jobs"("jobAlertId", "link");
