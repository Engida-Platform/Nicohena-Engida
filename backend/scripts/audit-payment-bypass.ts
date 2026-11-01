import AppDataSource from '../src/database/data-source';

export interface SuspiciousBooking {
  id: string;
  reference: string;
  total_price: string | number;
  payment_reference: string | null;
  paid_at: string | Date | null;
  reason?: string;
}

export interface DuplicatePayment {
  booking_id: string;
  successes: string | number;
}

export async function runPaymentAudit(dataSource = AppDataSource) {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const suspiciousBookings: SuspiciousBooking[] = await dataSource.query(`
    SELECT b.id, b.reference, b.total_price, b.payment_reference, b.paid_at
    FROM bookings b
    WHERE b.payment_status = 'PAID'
      AND NOT EXISTS (
        SELECT 1
        FROM payments p
        WHERE p.booking_id = b.id
          AND p.status = 'SUCCEEDED'
          AND p.amount_minor = (b.total_price * 100)::bigint
      )
    ORDER BY b.created_at DESC;
  `);

  const duplicateSuccesses: DuplicatePayment[] = await dataSource.query(`
    SELECT booking_id, COUNT(*) AS successes
    FROM payments
    WHERE status = 'SUCCEEDED'
    GROUP BY booking_id
    HAVING COUNT(*) > 1;
  `);

  console.log('========================================================');
  console.log('ENGIDA PAYMENT SECURITY AUDIT REPORT');
  console.log('========================================================');
  console.log(`Suspicious PAID Bookings (no matching SUCCEEDED payment): ${suspiciousBookings.length}`);
  if (suspiciousBookings.length > 0) {
    console.table(suspiciousBookings);
  } else {
    console.log('✓ No suspicious client-bypassed bookings found.');
  }

  console.log('--------------------------------------------------------');
  console.log(`Duplicate Successful Payments: ${duplicateSuccesses.length}`);
  if (duplicateSuccesses.length > 0) {
    console.table(duplicateSuccesses);
  } else {
    console.log('✓ No duplicate successful payments found.');
  }
  console.log('========================================================');

  return {
    suspiciousBookings,
    duplicateSuccesses,
  };
}

if (require.main === module) {
  runPaymentAudit()
    .then(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Audit failed:', err);
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(1);
    });
}
