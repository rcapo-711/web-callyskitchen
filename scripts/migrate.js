import fs from 'fs'
import path from 'path'
import pg from 'pg'

const isFresh = process.argv.includes('--fresh')
const envPath = path.resolve('.env')

let databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const match =
    envContent.match(/^DATABASE_URL=(.*)$/m) ||
    envContent.match(/^POSTGRES_URL=(.*)$/m) ||
    envContent.match(/^SUPABASE_DB_URL=(.*)$/m)
  if (!databaseUrl && match?.[1]) {
    databaseUrl = match[1].trim()
  }
}

const migrationFilePath = path.resolve('supabase/migrations/20261018000000_calls_kitchen_schema.sql')
const seedUsersFilePath = path.resolve('supabase/seed_users.sql')

const dropPublicSchemaSql = `
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.store_settings CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.decrement_product_stock(TEXT, INTEGER) CASCADE;
`

async function runMigration() {
  console.log('====================================================')
  console.log(`CALLS KITCHEN - DATABASE ${isFresh ? 'MIGRATE:FRESH' : 'MIGRATE'}`)
  console.log('====================================================\n')

  if (!databaseUrl) {
    console.warn('[INFO] DATABASE_URL tidak ditemukan di file .env')
    console.warn('Untuk menjalankan migrasi langsung dari terminal:')
    console.warn('1. Buka Supabase Dashboard -> Project Settings -> Database')
    console.warn('2. Salin Connection String (URI / Session Mode)')
    console.warn('3. Tambahkan ke file .env:')
    console.warn('   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\n')

    // Generate consolidated SQL files for 1-click execution in Supabase SQL Editor
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf-8')
    const seedSql = fs.readFileSync(seedUsersFilePath, 'utf-8')
    
    if (isFresh) {
      const freshSqlPath = path.resolve('supabase/migrate_fresh.sql')
      fs.writeFileSync(freshSqlPath, `${dropPublicSchemaSql}\n\n${migrationSql}\n\n${seedSql}`)
      console.log(`[FILE READY] File gabungan telah dibuat: supabase/migrate_fresh.sql`)
      console.log('Anda dapat langsung menyalin dan menjalankan file tersebut di Supabase SQL Editor.')
    } else {
      const migrateSqlPath = path.resolve('supabase/migrate.sql')
      fs.writeFileSync(migrateSqlPath, `${migrationSql}\n\n${seedSql}`)
      console.log(`[FILE READY] File gabungan telah dibuat: supabase/migrate.sql`)
      console.log('Anda dapat langsung menyalin dan menjalankan file tersebut di Supabase SQL Editor.')
    }
    console.log('====================================================\n')
    return
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('Menghubungkan ke database PostgreSQL...')
    await client.connect()
    console.log('[CONNECTED] Berhasil terhubung ke database.')

    if (isFresh) {
      console.log('Menghapus seluruh tabel dan fungsi lama (Fresh)...')
      await client.query(dropPublicSchemaSql)
      console.log('[CLEANED] Schema public berhasil dibersihkan.')
    }

    console.log('Mengeksekusi migrasi skema tabel & seed produk...')
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf-8')
    await client.query(migrationSql)
    console.log('[MIGRATED] Skema tabel dan data awal berhasil diterapkan.')

    console.log('Mengeksekusi seeder pengguna (Admin & Pelanggan)...')
    const seedSql = fs.readFileSync(seedUsersFilePath, 'utf-8')
    await client.query(seedSql)
    console.log('[SEEDED] Akun Admin dan Pelanggan berhasil dibuat.')

    console.log('\n====================================================')
    console.log('MIGRASI SUKSES 100%!')
    console.log('====================================================\n')
  } catch (err) {
    console.error('[ERROR] Gagal menjalankan migrasi:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
