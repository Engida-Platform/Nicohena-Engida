import { DataSource } from 'typeorm';
import AppDataSource from '../data-source';

async function insertCouponSettings() {
  let connection: DataSource | undefined;

  try {
    connection = await AppDataSource.initialize();
    console.log('Database connection established');

    const settings = [
      {
        key: 'finance.coupon_max_percentage_discount',
        value: '50',
        type: 'int',
      },
      {
        key: 'finance.coupon_max_fixed_discount_minor',
        value: '10000',
        type: 'bigint',
      },
      {
        key: 'finance.coupon_max_redemptions_limit',
        value: '100',
        type: 'int',
      },
    ];

    for (const setting of settings) {
      const existing = await connection.query(
        'SELECT * FROM finance_settings WHERE key = $1',
        [setting.key],
      );

      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO finance_settings (key, value, type, updated_at) 
           VALUES ($1, $2, $3, NOW())`,
          [setting.key, setting.value, setting.type],
        );
        console.log(`✓ Inserted setting: ${setting.key}`);
      } else {
        console.log(`⊗ Setting already exists: ${setting.key}`);
      }
    }

    console.log('\nCoupon control settings inserted successfully!');
  } catch (error) {
    console.error('Error inserting settings:', error);
    process.exit(1);
  } finally {
    if (connection?.isInitialized) {
      await connection.destroy();
    }
  }
}

insertCouponSettings();
