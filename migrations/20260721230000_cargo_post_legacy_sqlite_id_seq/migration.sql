-- Migration: create sequence for CargoPost.legacySqliteId
-- Used by createCargo to generate collision-safe legacy IDs via nextval().
-- Starts above the current max to avoid clashing with migrated SQLite rows.

CREATE SEQUENCE IF NOT EXISTS cargo_post_legacy_sqlite_id_seq
  START WITH 100000
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Advance the sequence to sit above any already-migrated rows.
SELECT setval(
  'cargo_post_legacy_sqlite_id_seq',
  GREATEST(
    (SELECT COALESCE(MAX("legacySqliteId"), 0) FROM "CargoPost"),
    99999
  )
);