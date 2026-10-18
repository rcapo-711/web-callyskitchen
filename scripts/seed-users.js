import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve('.env')
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
let supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  ''
let supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || ''

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const urlMatch = envContent.match(/^(?:VITE_)?SUPABASE_URL=(.*)$/m)
  const anonMatch =
    envContent.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/m) ||
    envContent.match(/^(?:VITE_)?SUPABASE_PUBLISHABLE_KEY=(.*)$/m)
  const secretMatch = envContent.match(/^SUPABASE_SECRET_KEY=(.*)$/m)

  if (!supabaseUrl && urlMatch?.[1]) supabaseUrl = urlMatch[1].trim()
  if (!supabaseAnonKey && anonMatch?.[1]) supabaseAnonKey = anonMatch[1].trim()
  if (!supabaseSecretKey && secretMatch?.[1]) supabaseSecretKey = secretMatch[1].trim()
}

if (!supabaseUrl || (!supabaseAnonKey && !supabaseSecretKey)) {
  console.error('[Seeder] Error: Konfigurasi Supabase URL/Key tidak ditemukan di .env atau environment.')
  process.exit(1)
}

const clientKey = supabaseSecretKey || supabaseAnonKey
const hasAdminPrivilege = Boolean(supabaseSecretKey)

const supabase = createClient(supabaseUrl, clientKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const seedUsers = [
  {
    email: 'admin@gmail.com',
    password: 'Password123!',
    fullName: 'Administrator Calls Kitchen',
    phone: '081234567890',
    address: 'Jl. Dapur Pusat No. 1, Jakarta Selatan',
    targetRole: 'admin',
  },
  {
    email: 'admin.callskitchen@gmail.com',
    password: 'Password123!',
    fullName: 'Administrator Calls Kitchen',
    phone: '081234567890',
    address: 'Jl. Dapur Pusat No. 1, Jakarta Selatan',
    targetRole: 'admin',
  },
  {
    email: 'budi.santoso@gmail.com',
    password: 'Password123!',
    fullName: 'Budi Santoso',
    phone: '081298765432',
    address: 'Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan',
    targetRole: 'customer',
  },
  {
    email: 'siti.rahma@gmail.com',
    password: 'Password123!',
    fullName: 'Siti Rahma',
    phone: '081387654321',
    address: 'Jl. Anggrek No. 8, Bandung, Jawa Barat',
    targetRole: 'customer',
  },
]

async function runSeeder() {
  console.log('====================================================')
  console.log('CALLS KITCHEN - USER SEEDER')
  console.log('Target URL :', supabaseUrl)
  console.log('Admin Mode :', hasAdminPrivilege ? 'Aktif (Service Secret Key)' : 'Publik (Anon Key)')
  console.log('====================================================\n')

  for (const item of seedUsers) {
    try {
      if (hasAdminPrivilege) {
        let userId = null
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: item.email,
          password: item.password,
          email_confirm: true,
          user_metadata: {
            full_name: item.fullName,
            phone: item.phone,
            address: item.address,
          },
        })

        if (createError) {
          if (createError.message.includes('already registered')) {
            console.log(`[EXISTING] ${item.email} sudah terdaftar, memperbarui data...`)
            const { data: listData } = await supabase.auth.admin.listUsers()
            const existing = listData?.users?.find((u) => u.email === item.email)
            if (existing) {
              userId = existing.id
              await supabase.auth.admin.updateUserById(userId, {
                password: item.password,
                email_confirm: true,
              })
            }
          } else {
            console.warn(`[FAILED]   ${item.email} -> ${createError.message}`)
            continue
          }
        } else if (createData.user) {
          userId = createData.user.id
          console.log(`[SUCCESS]  ${item.email} berhasil dibuat (ID: ${userId}).`)
        }

        if (userId) {
          // Upsert Profile
          await supabase.from('profiles').upsert({
            id: userId,
            full_name: item.fullName,
            phone: item.phone,
            address: item.address,
            updated_at: new Date().toISOString(),
          })

          // Assign Role
          await supabase.from('user_roles').delete().eq('user_id', userId)
          await supabase.from('user_roles').insert({
            user_id: userId,
            role: item.targetRole,
          })
          console.log(`[ROLE]     Role "${item.targetRole}" ditetapkan untuk ${item.email}.`)
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: item.email,
          password: item.password,
          options: {
            data: {
              full_name: item.fullName,
              phone: item.phone,
              address: item.address,
            },
          },
        })

        if (error) {
          if (error.message.includes('already registered')) {
            console.log(`[EXISTING] ${item.email} sudah terdaftar.`)
          } else {
            console.warn(`[FAILED]   ${item.email} -> ${error.message}`)
          }
        } else if (data.user) {
          console.log(`[SUCCESS]  ${item.email} berhasil didaftarkan (ID: ${data.user.id}).`)
        }
      }
    } catch (err) {
      console.error(`[ERROR]    ${item.email} ->`, err.message)
    }
  }

  console.log('\n====================================================')
  console.log('AKUN SEEDER SIAP DIGUNAKAN:')
  console.log('====================================================')
  console.log('1. Admin:')
  console.log('   Email   : admin@gmail.com')
  console.log('   Password: Password123!')
  console.log('   Role    : admin\n')
  console.log('2. Customer:')
  console.log('   Email   : budi.santoso@gmail.com')
  console.log('   Password: Password123!')
  console.log('   Role    : customer')
  console.log('====================================================\n')
}

runSeeder()
