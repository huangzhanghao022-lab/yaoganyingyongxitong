ALTER TABLE "task_log_imaging_as02" ADD COLUMN IF NOT EXISTS "storageAppliedAt" timestamp;
ALTER TABLE "task_log_imaging_as03" ADD COLUMN IF NOT EXISTS "storageAppliedAt" timestamp;
ALTER TABLE "task_log_transmit_as02" ADD COLUMN IF NOT EXISTS "storageAppliedAt" timestamp;
ALTER TABLE "task_log_transmit_as03" ADD COLUMN IF NOT EXISTS "storageAppliedAt" timestamp;
ALTER TABLE "task_log_delete_as02" ADD COLUMN IF NOT EXISTS "storageAppliedAt" timestamp;
ALTER TABLE "task_log_delete_as03" ADD COLUMN IF NOT EXISTS "storageAppliedAt" timestamp;
