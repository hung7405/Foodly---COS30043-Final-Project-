import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const MERCHANT_EMAIL = 'merchant@foodly.app'
const MERCHANT_STORES = [
  'Circle K Nguyễn Huệ',
  'Family Mart Lê Lợi',
  '7-Eleven Mạc Đĩnh Chi',
  'Ministop Nguyễn Thị Minh Khai',
  'GS25 Hai Bà Trưng',
]

async function ensureMerchantUser() {
  const { data: existing } = await supabase.from('users').select('id').eq('email', MERCHANT_EMAIL).maybeSingle()
  if (existing) {
    console.log(`  Merchant ${MERCHANT_EMAIL} already exists (${existing.id})`)
    return existing.id as string
  }

  const hash = await bcrypt.hash('Password123!', 10)
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: 'merchant',
      email: MERCHANT_EMAIL,
      password_hash: hash,
      first_name: 'Minh',
      last_name: 'Doanh',
      role: 'merchant',
      trust_score: 4.6,
      is_active: true,
      reputation_points: 30,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create merchant: ${error.message}`)
  console.log(`  Created merchant ${MERCHANT_EMAIL} (${data.id})`)
  return data.id as string
}

async function assignStores(merchantId: string) {
  const { data: stores } = await supabase.from('stores').select('id, name').in('name', MERCHANT_STORES)
  if (!stores || stores.length === 0) throw new Error('Merchant stores not found — run the full seed first')

  const ids = new Set(stores.map((s: any) => s.id))
  for (const name of MERCHANT_STORES) {
    const store = stores.find((s: any) => s.name === name)
    if (!store) {
      console.warn(`  Store not found: ${name}`)
      continue
    }
    const { error } = await supabase.from('stores').update({ user_id: merchantId }).eq('id', store.id)
    if (error) throw new Error(`Failed to assign ${name}: ${error.message}`)
  }
  console.log(`  Assigned ${ids.size}/${MERCHANT_STORES.length} stores to merchant`)
}

async function seedReservations(merchantId: string) {
  const { data: stores } = await supabase.from('stores').select('id').eq('user_id', merchantId)
  const storeIds = (stores || []).map((s: any) => s.id)
  if (storeIds.length === 0) return

  const { data: deals } = await supabase.from('deals').select('id').in('store_id', storeIds)
  const dealIds = (deals || []).map((d: any) => d.id)
  if (dealIds.length === 0) return

  const { data: existing } = await supabase
    .from('reservations')
    .select('id')
    .in('deal_id', dealIds)
    .limit(1)
  if (existing && existing.length > 0) {
    console.log('  Merchant already has reservations — skipping')
    return
  }

  const { data: customerRows } = await supabase.from('users').select('id').eq('role', 'user').limit(10)
  const customers = (customerRows || []).map((u: any) => u.id)
  if (customers.length === 0) return

  const statusPool = ['confirmed', 'confirmed', 'active', 'confirmed', 'cancelled', 'expired']
  const records: any[] = []
  const usedCodes = new Set<string>()
  const makeCode = () => {
    let code = ''
    do { code = crypto.randomBytes(4).toString('hex').toUpperCase() } while (usedCodes.has(code))
    usedCodes.add(code)
    return code
  }

  dealIds.slice(0, 40).forEach((dealId, idx) => {
    const count = 1 + (idx % 3)
    for (let i = 0; i < count; i++) {
      const status = statusPool[(idx * 3 + i) % statusPool.length]
      const reservedAt = new Date(Date.now() - (idx % 7) * 24 * 60 * 60 * 1000 - i * 3600 * 1000)
      records.push({
        deal_id: dealId,
        user_id: customers[Math.floor(Math.random() * customers.length)],
        status,
        reserved_at: reservedAt.toISOString(),
        expires_at: new Date(reservedAt.getTime() + 15 * 60 * 1000).toISOString(),
        confirmed_at: status === 'confirmed'
          ? new Date(reservedAt.getTime() + (10 + idx % 20) * 60 * 1000).toISOString()
          : null,
        reservation_code: makeCode(),
        quantity_reserved: 1,
      })
    }
  })

  const { error } = await supabase.from('reservations').insert(records)
  if (error) throw new Error(`Failed to seed reservations: ${error.message}`)
  console.log(`  Created ${records.length} reservations for merchant deals`)
}

async function main() {
  console.log('Seeding merchant demo account...')
  const merchantId = await ensureMerchantUser()
  await assignStores(merchantId)
  await seedReservations(merchantId)
  console.log('\n✅ Merchant seed complete!')
  console.log(`  Login: ${MERCHANT_EMAIL} / Password123!`)
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
