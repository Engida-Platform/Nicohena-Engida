import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentSecurityAndPricingLifecycle1756000000000 implements MigrationInterface {
  name = 'PaymentSecurityAndPricingLifecycle1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Payments table additions: expires_at
    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ;
    `);

    // 2. Properties table additions: cleaning_fee and instant_book
    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD COLUMN IF NOT EXISTS "cleaning_fee" NUMERIC(12, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "instant_book" BOOLEAN NOT NULL DEFAULT false;
    `);

    // 3. Bookings table additions: price_breakdown and quote_version
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "price_breakdown" JSONB,
        ADD COLUMN IF NOT EXISTS "quote_version" VARCHAR(20);
    `);

    // 4. Backfill legacy price_breakdown for existing bookings
    await queryRunner.query(`
      UPDATE "bookings"
      SET "price_breakdown" = jsonb_build_object(
        'subtotal', "total_price",
        'cleaningFee', 0,
        'serviceFee', 0,
        'discount', COALESCE("discount_amount", 0),
        'total', "total_price",
        'currency', COALESCE("payment_currency", 'ETB'),
        'legacy', true
      ),
      "quote_version" = 'legacy'
      WHERE "price_breakdown" IS NULL;
    `);

    // 5. Backfill payment_method for PAID bookings from successful payments
    await queryRunner.query(`
      UPDATE "bookings" b
      SET "payment_method" = p."method"
      FROM (
        SELECT DISTINCT ON ("booking_id") "booking_id", "method"
        FROM "payments"
        WHERE "status" = 'SUCCEEDED'
        ORDER BY "booking_id", "created_at" DESC
      ) p
      WHERE b."id" = p."booking_id"
        AND b."payment_status" = 'PAID'
        AND (b."payment_method" IS NULL OR b."payment_method" = 'CASH_ON_ARRIVAL');
    `);

    // 6. Partial unique index for active payment sessions (INITIATED, PENDING)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_active_booking"
      ON "payments" ("booking_id")
      WHERE "status" IN ('INITIATED', 'PENDING');
    `);

    // 7. Partial unique index for successful payment per booking
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_payments_success_booking"
      ON "payments" ("booking_id")
      WHERE "status" = 'SUCCEEDED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_payments_success_booking";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_payments_active_booking";`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "quote_version";`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "price_breakdown";`);
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "instant_book";`);
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "cleaning_fee";`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "expires_at";`);
  }
}

