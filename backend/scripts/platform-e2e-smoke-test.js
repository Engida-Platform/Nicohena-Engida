/**
 * ENGIDA Platform — Production End-to-End Smoke Test Suite
 * Validates Phases 1 through 9:
 * 1. Health & Database Connectivity
 * 2. Public Catalog & Architectural Discovery
 * 3. Host Profile & Superhost Performance Diagnostics
 * 4. In-Platform Guest-Host Messaging & Thread Engine
 * 5. Host Treasury, Multi-Bank Accounts & Payout System
 * 6. Guest & Host Dispute Management & Escrow Holds
 * 7. Admin Dispute Resolution & Settlement Capability
 * 8. Universal In-App Notification Center & Activity Feed
 */

const jwt = require('../node_modules/jsonwebtoken');
const { Client } = require('../node_modules/pg');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-to-a-secure-random-string';
const DB_URL = process.env.DATABASE_URL || 'postgresql://engida:1921@localhost:5433/engida';

const HOST_USER = {
  id: 'ee9818dc-959f-49ad-bb04-813518a77086',
  email: 'host-onboard1@example.com',
  role: 'USER',
};

const ADMIN_USER = {
  id: 'a0000000-0000-0000-0000-000000000001',
  email: 'admin@engida.com',
  role: 'ADMIN',
};

const hostToken = jwt.sign(
  { sub: HOST_USER.id, email: HOST_USER.email, role: HOST_USER.role },
  JWT_SECRET,
  { expiresIn: '2h' }
);

const adminToken = jwt.sign(
  { sub: ADMIN_USER.id, email: ADMIN_USER.email, role: ADMIN_USER.role },
  JWT_SECRET,
  { expiresIn: '2h' }
);

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName} ${details ? '— ' + details : ''}`);
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '— ' + details : ''}`);
  }
}

async function runSmokeTests() {
  console.log('\n======================================================');
  console.log('       ENGIDA PLATFORM PRODUCTION SMOKE TEST SUITE    ');
  console.log('======================================================\n');
  console.log(`Target Backend: ${BASE_URL}`);
  console.log(`Target Database: ${DB_URL}\n`);

  // 1. HEALTH & SYSTEM CHECK
  console.log('--- 1. System Health & Infrastructure Diagnostics ---');
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'GET /health returns 200 OK', `Status: ${healthData.status}`);
  } catch (err) {
    assert(false, 'GET /health connectivity', err.message);
  }

  // 2. DISCOVERY & CATALOG
  console.log('\n--- 2. Public Catalog & Architectural Discovery ---');
  let samplePropertyId = null;
  try {
    const propertiesRes = await fetch(`${BASE_URL}/properties`);
    const propertiesData = await propertiesRes.json();
    const isArrayOrPaginated = Array.isArray(propertiesData) || Array.isArray(propertiesData.data);
    assert(propertiesRes.status === 200 && isArrayOrPaginated, 'GET /properties returns listings collection');

    const listings = Array.isArray(propertiesData) ? propertiesData : propertiesData.data;
    if (listings && listings.length > 0) {
      samplePropertyId = listings[0].id;
      assert(Boolean(samplePropertyId), 'Listings catalog contains active properties', `Sample ID: ${samplePropertyId}`);
    }

    const amenitiesRes = await fetch(`${BASE_URL}/amenities`);
    const amenities = await amenitiesRes.json();
    assert(amenitiesRes.status === 200 && Array.isArray(amenities), 'GET /amenities returns active platform amenities array', `Count: ${amenities.length}`);

    const adminCatalogRes = await fetch(`${BASE_URL}/admin/catalog/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCatalogRes.status === 200, 'GET /admin/catalog/categories authorized for ADMIN');
  } catch (err) {
    assert(false, 'Public catalog discovery', err.message);
  }

  // 3. PROPERTY DETAIL
  if (samplePropertyId) {
    console.log('\n--- 3. Property Detail & Pricing Specs ---');
    try {
      const propDetailRes = await fetch(`${BASE_URL}/properties/${samplePropertyId}`);
      const propDetail = await propDetailRes.json();
      assert(propDetailRes.status === 200 && propDetail.id === samplePropertyId, 'GET /properties/:id returns detailed property spec', `Title: "${propDetail.title}"`);
    } catch (err) {
      assert(false, 'Property detail endpoint', err.message);
    }
  }

  // 4. HOST DASHBOARD & SUPERHOST PERFORMANCE DIAGNOSTICS (PHASE 8)
  console.log('\n--- 4. Host Profile & Superhost Performance Diagnostics (Phase 8) ---');
  try {
    const summaryRes = await fetch(`${BASE_URL}/host/dashboard/summary`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const summary = await summaryRes.json();
    assert(summaryRes.status === 200, 'GET /host/dashboard/summary authorized with Bearer token');
    assert(typeof summary.acceptanceRatePercent === 'number', 'Summary includes acceptanceRatePercent diagnostic', `${summary.acceptanceRatePercent}%`);
    assert(typeof summary.averageRating === 'number', 'Summary includes averageRating diagnostic', `${summary.averageRating}★`);
    assert(typeof summary.reviewCount === 'number', 'Summary includes reviewCount diagnostic', `${summary.reviewCount} reviews`);
    assert(typeof summary.superhostEligible === 'boolean', 'Summary evaluates superhostEligible tier', `Eligible: ${summary.superhostEligible}`);
  } catch (err) {
    assert(false, 'Host performance diagnostics', err.message);
  }

  // 5. IN-PLATFORM MESSAGING & THREADS (PHASE 4)
  console.log('\n--- 5. In-Platform Guest-Host Messaging & Thread Engine (Phase 4) ---');
  try {
    const convosRes = await fetch(`${BASE_URL}/messages/conversations`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const convos = await convosRes.json();
    assert(convosRes.status === 200 && Array.isArray(convos), 'GET /messages/conversations returns thread inbox array');
  } catch (err) {
    assert(false, 'Messaging conversations endpoint', err.message);
  }

  // 6. HOST TREASURY & PAYOUTS (PHASE 5)
  console.log('\n--- 6. Host Treasury, Multi-Bank Accounts & Payout System (Phase 5) ---');
  try {
    const accountsRes = await fetch(`${BASE_URL}/host/payout-accounts`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const accounts = await accountsRes.json();
    assert(accountsRes.status === 200 && Array.isArray(accounts), 'GET /host/payout-accounts returns host banking accounts array');

    const payoutsRes = await fetch(`${BASE_URL}/host/payouts`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const payouts = await payoutsRes.json();
    assert(payoutsRes.status === 200 && Array.isArray(payouts), 'GET /host/payouts returns host payout history array');
  } catch (err) {
    assert(false, 'Host treasury and payouts endpoints', err.message);
  }

  // 7. GUEST & HOST DISPUTES (PHASE 6)
  console.log('\n--- 7. Guest & Host Dispute Filing & Evidence Locker (Phase 6) ---');
  try {
    const disputesRes = await fetch(`${BASE_URL}/disputes/mine`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const disputes = await disputesRes.json();
    assert(disputesRes.status === 200 && Array.isArray(disputes), 'GET /disputes/mine returns authenticated user disputes array');
  } catch (err) {
    assert(false, 'Disputes endpoint', err.message);
  }

  // 8. ADMIN CASES & DISPUTE SETTLEMENT (PHASE 7)
  console.log('\n--- 8. Admin Dispute Settlement & Escrow Resolution Engine (Phase 7) ---');
  try {
    const casesRes = await fetch(`${BASE_URL}/admin/cases`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const casesData = await casesRes.json();
    const isCasesValid = casesRes.status === 200 && (Array.isArray(casesData) || Array.isArray(casesData.data));
    assert(isCasesValid, 'GET /admin/cases authorized for ADMIN role with structured case list', `Found: ${casesData.total ?? casesData.data?.length ?? 0} cases`);
  } catch (err) {
    assert(false, 'Admin cases endpoint', err.message);
  }

  // 9. UNIVERSAL NOTIFICATIONS CENTER (PHASE 9)
  console.log('\n--- 9. Universal In-App Notification Center & Activity Feed (Phase 9) ---');
  try {
    const notifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const notifs = await notifsRes.json();
    assert(notifsRes.status === 200 && Array.isArray(notifs.data), 'GET /notifications returns paginated notification feed');

    const unreadRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const unread = await unreadRes.json();
    assert(unreadRes.status === 200 && typeof unread.unreadCount === 'number', 'GET /notifications/unread-count returns integer counter', `Count: ${unread.unreadCount}`);

    const readAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert(readAllRes.status === 200, 'PATCH /notifications/read-all executes successfully');
  } catch (err) {
    assert(false, 'Notifications center endpoints', err.message);
  }

  // 10. DATABASE INTEGRITY
  console.log('\n--- 10. PostgreSQL Schema & Vault Consistency ---');
  try {
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('users', 'properties', 'bookings', 'messages', 'notifications', 'reviews', 'payout_accounts', 'payouts', 'escrow_holds', 'cases');
    `);
    const foundTables = tablesRes.rows.map(r => r.table_name);
    assert(foundTables.includes('properties'), 'PostgreSQL table "properties" exists');
    assert(foundTables.includes('bookings'), 'PostgreSQL table "bookings" exists');
    assert(foundTables.includes('messages'), 'PostgreSQL table "messages" exists');
    assert(foundTables.includes('notifications'), 'PostgreSQL table "notifications" exists');
    assert(foundTables.includes('payout_accounts'), 'PostgreSQL table "payout_accounts" exists');
    assert(foundTables.includes('escrow_holds'), 'PostgreSQL table "escrow_holds" exists');
    assert(foundTables.includes('cases'), 'PostgreSQL table "cases" exists');

    await client.end();
  } catch (err) {
    assert(false, 'Database schema consistency check', err.message);
  }

  console.log('\n======================================================');
  console.log(`SMOKE TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('STATUS: [ALL SYSTEMS VERIFIED & PRODUCTION READY]');
  } else {
    console.log('STATUS: [SOME TESTS FAILED - REVIEW REQUIRED]');
  }
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSmokeTests().catch(err => {
  console.error('Smoke test suite fatal error:', err);
  process.exit(1);
});
