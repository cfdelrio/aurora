-- operator-runtime schema-change (Implementation 043-D2-R). Plain SQL only; NO migration framework.
--
-- A single vendor-neutral row table backing the D1 RowStoreClient (PostgresRowStoreClient). It stores
-- ONLY operator-runtime OPERATIONAL rows — training session, operator session run, operator session
-- envelope, and decision capture link — as opaque scalar maps in row_data (jsonb). The logical D1 table
-- name is a column value (table_name), so there is no per-record table and no SQL-identifier injection.
--
-- This file defines NO Evidence, ObservationSet, Signal, AthleteDecision, delivery, object-storage/S3,
-- live-provider, or Garmin-metrics table. Redaction of the envelope is owned by the record factory and
-- the row mapper (whitelist); this schema stores only what they produce.
--   DB row != Evidence != ObservationSet != Signal != AthleteDecision · schema-change file != deployment.

CREATE TABLE IF NOT EXISTS operator_runtime_row (
  table_name text  NOT NULL,
  id         text  NOT NULL,
  row_data   jsonb NOT NULL,
  PRIMARY KEY (table_name, id)
);

CREATE INDEX IF NOT EXISTS operator_runtime_row_table_idx
  ON operator_runtime_row (table_name);
