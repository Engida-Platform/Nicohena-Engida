import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCouponApprovalControls1793644111985 implements MigrationInterface {
    name = 'AddCouponApprovalControls1793644111985'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."coupons_approval_status_enum" AS ENUM('APPROVED', 'PENDING_APPROVAL', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD "approval_status" "public"."coupons_approval_status_enum" NOT NULL DEFAULT 'APPROVED'`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD "created_by_id" uuid`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD "approved_by_id" uuid`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD "approved_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "coupons" ADD "rejection_reason" text`);
        await queryRunner.query(`ALTER TYPE "public"."reviews_moderation_status_enum" RENAME TO "reviews_moderation_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reviews_moderation_status_enum" AS ENUM('VISIBLE', 'HIDDEN')`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "moderation_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "moderation_status" TYPE "public"."reviews_moderation_status_enum" USING "moderation_status"::"text"::"public"."reviews_moderation_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "moderation_status" SET DEFAULT 'VISIBLE'`);
        await queryRunner.query(`DROP TYPE "public"."reviews_moderation_status_enum_old"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reports_target"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reports_status_created"`);
        await queryRunner.query(`ALTER TYPE "public"."reports_target_type_enum" RENAME TO "reports_target_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reports_target_type_enum" AS ENUM('LISTING', 'REVIEW')`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "target_type" TYPE "public"."reports_target_type_enum" USING "target_type"::"text"::"public"."reports_target_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reports_target_type_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."reports_reason_enum" RENAME TO "reports_reason_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reports_reason_enum" AS ENUM('SCAM', 'MISREPRESENTATION', 'SAFETY', 'OFFENSIVE', 'SPAM', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "reason" TYPE "public"."reports_reason_enum" USING "reason"::"text"::"public"."reports_reason_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reports_reason_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."reports_status_enum" RENAME TO "reports_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reports_status_enum" AS ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "status" TYPE "public"."reports_status_enum" USING "status"::"text"::"public"."reports_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'OPEN'`);
        await queryRunner.query(`DROP TYPE "public"."reports_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "idx_reports_target" ON "reports" ("target_type", "target_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reports_status_created" ON "reports" ("status", "created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_reports_status_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reports_target"`);
        await queryRunner.query(`CREATE TYPE "public"."reports_status_enum_old" AS ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "status" TYPE "public"."reports_status_enum_old" USING "status"::"text"::"public"."reports_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "status" SET DEFAULT 'OPEN'`);
        await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reports_status_enum_old" RENAME TO "reports_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."reports_reason_enum_old" AS ENUM('SCAM', 'MISREPRESENTATION', 'SAFETY', 'OFFENSIVE', 'SPAM', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "reason" TYPE "public"."reports_reason_enum_old" USING "reason"::"text"::"public"."reports_reason_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."reports_reason_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reports_reason_enum_old" RENAME TO "reports_reason_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."reports_target_type_enum_old" AS ENUM('LISTING', 'REVIEW')`);
        await queryRunner.query(`ALTER TABLE "reports" ALTER COLUMN "target_type" TYPE "public"."reports_target_type_enum_old" USING "target_type"::"text"::"public"."reports_target_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."reports_target_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reports_target_type_enum_old" RENAME TO "reports_target_type_enum"`);
        await queryRunner.query(`CREATE INDEX "idx_reports_status_created" ON "reports" ("status", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_reports_target" ON "reports" ("target_type", "target_id") `);
        await queryRunner.query(`CREATE TYPE "public"."reviews_moderation_status_enum_old" AS ENUM('VISIBLE', 'HIDDEN')`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "moderation_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "moderation_status" TYPE "public"."reviews_moderation_status_enum_old" USING "moderation_status"::"text"::"public"."reviews_moderation_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "reviews" ALTER COLUMN "moderation_status" SET DEFAULT 'VISIBLE'`);
        await queryRunner.query(`DROP TYPE "public"."reviews_moderation_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reviews_moderation_status_enum_old" RENAME TO "reviews_moderation_status_enum"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "approved_at"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "approved_by_id"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "created_by_id"`);
        await queryRunner.query(`ALTER TABLE "coupons" DROP COLUMN "approval_status"`);
        await queryRunner.query(`DROP TYPE "public"."coupons_approval_status_enum"`);
    }

}
