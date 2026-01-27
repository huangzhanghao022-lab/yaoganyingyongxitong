CREATE TABLE IF NOT EXISTS "fixed_storage_update_log" (
  "id" SERIAL PRIMARY KEY,
  "createTime" varchar(255),
  "updateTime" varchar(255),
  "tenantId" integer,
  "tableCode" integer,
  "tableName" varchar(64),
  "action" varchar(64) NOT NULL,
  "sourceType" varchar(32),
  "sourceApi" varchar(128),
  "requestId" varchar(64),
  "operator" varchar(64),
  "ip" varchar(64),
  "target" json,
  "change" json,
  "dataSource" json,
  "remark" varchar(255)
);

CREATE INDEX IF NOT EXISTS "idx_fixed_storage_update_log_tableCode" ON "fixed_storage_update_log" ("tableCode");
CREATE INDEX IF NOT EXISTS "idx_fixed_storage_update_log_tableName" ON "fixed_storage_update_log" ("tableName");
CREATE INDEX IF NOT EXISTS "idx_fixed_storage_update_log_action" ON "fixed_storage_update_log" ("action");
CREATE INDEX IF NOT EXISTS "idx_fixed_storage_update_log_sourceType" ON "fixed_storage_update_log" ("sourceType");
