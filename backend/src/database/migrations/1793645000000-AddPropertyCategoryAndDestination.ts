import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyCategoryAndDestination1793645000000 implements MigrationInterface {
  name = 'AddPropertyCategoryAndDestination1793645000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add category_id and destination_id columns to properties table
    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD COLUMN IF NOT EXISTS "category_id" UUID,
        ADD COLUMN IF NOT EXISTS "destination_id" UUID;

      CREATE INDEX IF NOT EXISTS "idx_properties_category_id" ON "properties"("category_id");
      CREATE INDEX IF NOT EXISTS "idx_properties_destination_id" ON "properties"("destination_id");
    `);

    // 2. Safe Foreign Key additions
    await queryRunner.query(`
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
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties" DROP CONSTRAINT IF EXISTS "fk_properties_destination";
      ALTER TABLE "properties" DROP CONSTRAINT IF EXISTS "fk_properties_category";
      DROP INDEX IF EXISTS "idx_properties_destination_id";
      DROP INDEX IF EXISTS "idx_properties_category_id";
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "destination_id";
      ALTER TABLE "properties" DROP COLUMN IF EXISTS "category_id";
    `);
  }
}
