-- ================================================================
-- MIGRATION: 007_booking_coupons.sql
-- Adds coupon discount columns to bookings table
-- ================================================================

ALTER TABLE bookings 
    ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

