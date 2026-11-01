-- ============================================================================
-- Migration 009: Catalog Property Categories & Curated Destinations
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  name_amharic VARCHAR(150),
  description TEXT,
  icon VARCHAR(60) DEFAULT 'Building2',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_categories_slug ON property_categories (slug);
CREATE INDEX IF NOT EXISTS idx_property_categories_is_active ON property_categories (is_active);

CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  name_amharic VARCHAR(150),
  region VARCHAR(120) NOT NULL,
  tagline TEXT,
  image_url VARCHAR(500),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destinations_slug ON destinations (slug);
CREATE INDEX IF NOT EXISTS idx_destinations_is_featured ON destinations (is_featured);
CREATE INDEX IF NOT EXISTS idx_destinations_is_active ON destinations (is_active);

-- Seed Initial Curated Property Categories
INSERT INTO property_categories (slug, name, name_amharic, description, icon, display_order, is_active)
VALUES
  ('lakefront', 'Lakefront Retreats', 'የሐይቅ ዳር ማረፊያዎች', 'Bishoftu & Hawassa volcanic lakefront architectural villas', 'Waves', 1, true),
  ('mountain', 'Mountain Lodges', 'የተራራ ሎጆች', 'Entoto, Simien and highland forest sanctuaries', 'Mountain', 2, true),
  ('urban-luxury', 'Urban Luxury Suites', 'የከተማ የቅንጦት ቤቶች', 'Curated Bole, Kazanchis and Old Airport penthouses', 'Building2', 3, true),
  ('heritage', 'Heritage & Historic Estates', 'የታሪክና ባህል ማረፊያዎች', 'Lalibela and Gondar historical residences', 'Landmark', 4, true),
  ('eco-resort', 'Eco-Lodges & Nature Sanctuaries', 'የተፈጥሮና ኢኮ-ሎጆች', 'Sustainable lodges immersed in natural sanctuaries', 'Trees', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Curated Destinations
INSERT INTO destinations (slug, name, name_amharic, region, tagline, is_featured, display_order, is_active)
VALUES
  ('addis-ababa', 'Addis Ababa', 'አዲስ አበባ', 'Addis Ababa', 'Capital City & Diplomatic Hub', true, 1, true),
  ('bishoftu', 'Bishoftu', 'ቢሾፍቱ', 'Oromia', 'Crater Lakes & Resort Getaways', true, 2, true),
  ('hawassa', 'Hawassa', 'ሀዋሳ', 'Sidama', 'Rift Valley Lakeside Haven', true, 3, true),
  ('bahir-dar', 'Bahir Dar', 'ባሕር ዳር', 'Amhara', 'Lake Tana Monasteries & Blue Nile', false, 4, true),
  ('lalibela', 'Lalibela', 'ላሊበላ', 'Amhara', 'Ancient Monolithic Rock-Hewn Churches', false, 5, true)
ON CONFLICT (slug) DO NOTHING;
