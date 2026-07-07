-- Migration : ajout d'un champ "chemin / lien des supports" par élément
-- À exécuter avec : node run-schema.js <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN> migration_001_resource_path.sql

ALTER TABLE work_items ADD COLUMN resource_path TEXT;
