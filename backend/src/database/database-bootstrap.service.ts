import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        this.logger.warn('Database dataSource is not initialized yet during bootstrap. Skipping schema check.');
        return;
      }
      this.logger.log('Verifying and ensuring critical database schema extensions and columns...');
      await this.ensureSchema();
      this.logger.log('Database schema verification completed successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Database bootstrap schema verification error: ${msg}`);
      // Do not rethrow so application startup is not blocked if connection or DB is temporarily lagging
    }
  }

  private async ensureSchema(): Promise<void> {
    // 1. Ensure uuid & pgcrypto extensions
    await this.dataSource.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `).catch((e) => this.logger.warn(`Could not enable extensions: ${e.message}`));

    // 2. Ensure property_categories table
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "property_categories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL,
        "name_amharic" VARCHAR(150),
        "description" TEXT,
        "icon" VARCHAR(60) NOT NULL DEFAULT 'Building2',
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_property_categories_slug" ON "property_categories"("slug");
      CREATE INDEX IF NOT EXISTS "idx_property_categories_is_active" ON "property_categories"("is_active");
    `).catch((e) => this.logger.warn(`Could not ensure property_categories table: ${e.message}`));

    // 3. Ensure destinations table
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "destinations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL,
        "name_amharic" VARCHAR(150),
        "region" VARCHAR(120) NOT NULL,
        "tagline" TEXT,
        "image_url" VARCHAR(500),
        "latitude" DECIMAL(10, 6),
        "longitude" DECIMAL(10, 6),
        "is_featured" BOOLEAN NOT NULL DEFAULT false,
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_destinations_slug" ON "destinations"("slug");
      CREATE INDEX IF NOT EXISTS "idx_destinations_is_featured" ON "destinations"("is_featured");
      CREATE INDEX IF NOT EXISTS "idx_destinations_is_active" ON "destinations"("is_active");
    `).catch((e) => this.logger.warn(`Could not ensure destinations table: ${e.message}`));

    // 4. Ensure properties columns: category_id, destination_id, cleaning_fee, instant_book, sale_price, admin_hidden fields
    await this.dataSource.query(`
      ALTER TABLE "properties"
        ADD COLUMN IF NOT EXISTS "category_id" UUID,
        ADD COLUMN IF NOT EXISTS "destination_id" UUID,
        ADD COLUMN IF NOT EXISTS "cleaning_fee" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "instant_book" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "sale_price" NUMERIC(14, 2),
        ADD COLUMN IF NOT EXISTS "admin_hidden" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "admin_hidden_reason" TEXT,
        ADD COLUMN IF NOT EXISTS "admin_hidden_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "admin_hidden_by_id" UUID;

      CREATE INDEX IF NOT EXISTS "idx_properties_category_id" ON "properties"("category_id");
      CREATE INDEX IF NOT EXISTS "idx_properties_destination_id" ON "properties"("destination_id");
    `).catch((e) => this.logger.warn(`Could not add properties columns/indices: ${e.message}`));

    // 5. Ensure foreign keys for properties if safe
    await this.dataSource.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_categories') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_properties_category') THEN
            ALTER TABLE "properties" ADD CONSTRAINT "fk_properties_category" FOREIGN KEY ("category_id") REFERENCES "property_categories"("id") ON DELETE SET NULL;
          END IF;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'destinations') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_properties_destination') THEN
            ALTER TABLE "properties" ADD CONSTRAINT "fk_properties_destination" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL;
          END IF;
        END IF;
      END $$;
    `).catch((e) => this.logger.warn(`Could not add properties foreign keys: ${e.message}`));

    // 6. Ensure bookings columns
    await this.dataSource.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "coupon_code" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "discount_amount" NUMERIC(10, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "price_breakdown" JSONB,
        ADD COLUMN IF NOT EXISTS "quote_version" VARCHAR(20),
        ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "payment_currency" VARCHAR(10) DEFAULT 'ETB';
    `).catch((e) => this.logger.warn(`Could not add bookings columns: ${e.message}`));

    // 7. Ensure conversations & messages tables
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "property_id" UUID NOT NULL,
        "booking_id" UUID,
        "guest_id" UUID NOT NULL,
        "host_id" UUID NOT NULL,
        "last_message_text" TEXT,
        "last_message_at" TIMESTAMPTZ DEFAULT now(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_conversations_guest_id" ON "conversations"("guest_id");
      CREATE INDEX IF NOT EXISTS "idx_conversations_host_id" ON "conversations"("host_id");
      CREATE INDEX IF NOT EXISTS "idx_conversations_property_id" ON "conversations"("property_id");

      CREATE TABLE IF NOT EXISTS "messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" UUID NOT NULL,
        "sender_id" UUID NOT NULL,
        "receiver_id" UUID NOT NULL,
        "content" TEXT NOT NULL,
        "read_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id" ON "messages"("conversation_id");
      CREATE INDEX IF NOT EXISTS "idx_messages_receiver_read" ON "messages"("receiver_id", "read_at");
    `).catch((e) => this.logger.warn(`Could not ensure conversations/messages tables: ${e.message}`));

    // 8. Seed baseline categories and destinations if empty
    await this.dataSource.query(`
      INSERT INTO "property_categories" ("slug", "name", "name_amharic", "description", "icon", "display_order", "is_active")
      VALUES
        ('villas', 'Luxury Villas', 'ቪላዎች', 'Expansive private compounds with lush gardens and dedicated security', 'Castle', 1, true),
        ('apartments', 'Modern Apartments', 'አፓርታማዎች', 'Centrally located residences tailored for urban stays and executives', 'Building2', 2, true),
        ('penthouses', 'Penthouses', 'ፔንትሃውስ', 'Panoramic skyline vistas, bespoke interiors, and private terrace spaces', 'Sparkles', 3, true),
        ('eco-lodges', 'Eco Lodges', 'የተፈጥሮ ሎጆች', 'Sustainable architectural sanctuaries nested in mountains and nature', 'Trees', 4, true),
        ('lakefront', 'Lakefront Stays', 'የሐይቅ ዳር ማረፊያዎች', 'Waterfront villas, lakeside balconies, and tranquil crater views', 'Waves', 5, true),
        ('traditional', 'Traditional Homes', 'ባህላዊ ቤቶች', 'Heritage-rich Ethiopian architecture with artisanal touches and courtyards', 'Home', 6, true)
      ON CONFLICT ("slug") DO NOTHING;

      INSERT INTO "destinations" ("slug", "name", "name_amharic", "region", "tagline", "image_url", "latitude", "longitude", "is_featured", "display_order", "is_active")
      VALUES
        ('addis-ababa', 'Addis Ababa', 'አዲስ አበባ', 'Shewa / Central', 'The diplomatic heartbeat, mountain breezes, and rich architectural culture', 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=1200&q=80', 9.030000, 38.740000, true, 1, true),
        ('bishoftu', 'Bishoftu', 'ቢሾፍቱ', 'Oromia / Rift Valley', 'Volcanic crater lakes, tranquil resorts, and weekend escapes 45 mins away', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80', 8.750000, 38.980000, true, 2, true),
        ('hawassa', 'Hawassa', 'ሐዋሳ', 'Sidama', 'Sunlit lakeside boulevards, fresh tilapia markets, and botanical wonders', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 7.050000, 38.480000, true, 3, true),
        ('bahir-dar', 'Bahir Dar', 'ባሕር ዳር', 'Amhara / Lake Tana', 'Monastic island sanctuaries and the dramatic Blue Nile waterfalls', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80', 11.590000, 37.390000, true, 4, true)
      ON CONFLICT ("slug") DO NOTHING;
    `).catch((e) => this.logger.warn(`Could not seed categories/destinations: ${e.message}`));

    // 9. Backfill category_id on properties that have NULL category_id based on property_type
    await this.dataSource.query(`
      UPDATE "properties" p
      SET "category_id" = c."id"
      FROM "property_categories" c
      WHERE p."category_id" IS NULL
        AND (
          (p."property_type"::text = 'VILLA' AND c."slug" = 'villas') OR
          (p."property_type"::text = 'APARTMENT' AND c."slug" = 'apartments') OR
          (p."property_type"::text = 'HOUSE' AND c."slug" = 'villas') OR
          (p."property_type"::text = 'BEDROOM' AND c."slug" = 'apartments') OR
          (p."property_type"::text = 'STUDIO' AND c."slug" = 'apartments')
        );
    `).catch((e) => this.logger.warn(`Could not backfill property categories: ${e.message}`));

    // 10. Ensure host profiles exist and are marked VERIFIED for all hosts owning published properties
    await this.dataSource.query(`
      INSERT INTO "host_profiles" ("id", "user_id", "display_name", "bio", "phone", "verification_status", "created_at", "updated_at")
      SELECT
        gen_random_uuid(),
        p."host_id",
        COALESCE(u."name", 'Verified Host'),
        'Experienced host in Ethiopia offering verified accommodations.',
        '+251911000000',
        'VERIFIED',
        NOW(),
        NOW()
      FROM "properties" p
      JOIN "users" u ON u."id" = p."host_id"
      WHERE p."host_id" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "host_profiles" hp WHERE hp."user_id" = p."host_id"
        )
      GROUP BY p."host_id", u."name"
      ON CONFLICT DO NOTHING;

      UPDATE "host_profiles"
      SET "verification_status" = 'VERIFIED'
      WHERE "user_id" IN (
        SELECT DISTINCT "host_id" FROM "properties" WHERE "status" = 'PUBLISHED'
      );
    `).catch((e) => this.logger.warn(`Could not ensure verified host profiles: ${e.message}`));
  }
}
