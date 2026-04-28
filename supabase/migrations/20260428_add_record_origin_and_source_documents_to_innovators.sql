-- Sprint 1: prepare innovators table for EOI ingestion alongside existing RFP records.
-- Adds record_origin (typed origin marker) and source_documents (attached file metadata).
-- Backfill: existing rows are RFP extractions, so the column is created with that as the
-- default, which fills all current rows; the default is then switched to 'manual_entry'
-- for future inserts so any record created outside the EOI/RFP pipelines is flagged manual
-- unless application code sets the value explicitly.

ALTER TABLE innovators
  ADD COLUMN IF NOT EXISTS record_origin text NOT NULL DEFAULT 'rfp_extraction';

ALTER TABLE innovators
  ALTER COLUMN record_origin SET DEFAULT 'manual_entry';

ALTER TABLE innovators
  DROP CONSTRAINT IF EXISTS innovators_record_origin_check;

ALTER TABLE innovators
  ADD CONSTRAINT innovators_record_origin_check
  CHECK (record_origin IN ('rfp_extraction', 'eoi_extraction', 'manual_entry'));

ALTER TABLE innovators
  ADD COLUMN IF NOT EXISTS source_documents jsonb NOT NULL DEFAULT '[]'::jsonb;
