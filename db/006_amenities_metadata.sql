-- ================================================================
-- MIGRATION: 006_amenities_metadata.sql
-- Synchronize amenities table with backend Amenity entity
-- Adds category enum, Amharic name, display ordering, and timestamps
-- ================================================================

DO $$ BEGIN
    CREATE TYPE amenity_category AS ENUM (
        'ESSENTIALS', 'KITCHEN', 'SAFETY', 'OUTDOOR', 'WELLNESS', 'SERVICES'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE amenities 
    ADD COLUMN IF NOT EXISTS name_amharic VARCHAR(150),
    ADD COLUMN IF NOT EXISTS category amenity_category DEFAULT 'ESSENTIALS',
    ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_amenities_category ON amenities(category);
CREATE INDEX IF NOT EXISTS idx_amenities_is_active ON amenities(is_active);

