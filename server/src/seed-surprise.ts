import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=600&q=80`

// Non-destructive: only inserts surprise-bag deals and short-expiry deals
// that do not already exist. Safe to re-run any time.
async function seed() {
  console.log('Checking for existing surprise / flash deals...\n')

  const { data: existingSurprise } = await supabase
    .from('deals')
    .select('id')
    .contains('tags', ['surprise'])
    .limit(1)

  const { data: existingFlash } = await supabase
    .from('deals')
    .select('id')
    .eq('title', 'FLASH: Cơm gà chiên xù 50% giảm giá')
    .limit(1)

  const hasSurprise = (existingSurprise?.length ?? 0) > 0
  const hasFlash = (existingFlash?.length ?? 0) > 0
  if (hasSurprise) console.log('  Surprise deals already present, skipping.')
  if (hasFlash) console.log('  Flash deals already present, skipping.')
  if (hasSurprise && hasFlash) {
    console.log('\nNothing to do.')
    return
  }

  const { data: admin } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@foodly.app')
    .single()

  if (!admin) {
    console.error('Admin user not found. Run npm run seed first.')
    process.exit(1)
  }

  const storeNames = [
    'Circle K Nguyễn Huệ',
    'Family Mart Lê Lợi',
    'Bách Hóa Xanh Hậu Giang',
    'Family Mart Phan Xích Long',
  ]
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .in('name', storeNames)

  const storeIdFor = new Map<string, string>()
  for (const s of stores || []) storeIdFor.set(s.name, s.id)

  const inserts: any[] = []

  if (!hasSurprise) {
    const surpriseDeals = [
      {
        store_name: 'Circle K Nguyễn Huệ',
        title: 'Surprise Bag Tiện lợi — Bánh mì + Nước',
        description: 'Hộp bất ngờ giá trị gấp 3-4 lần tiền bỏ ra: bánh mì tươi, nước giải khát, snack. Nội dung ngẫu nhiên theo kho còn lại trong ngày.',
        original_price: 90000,
        discount_price: 30000,
        quantity: 6,
        tags: ['surprise', 'banh_mi', 'tien_loi'],
        image: 'photo-1550507992-eb63ffee0847',
        flash: false,
      },
      {
        store_name: 'Family Mart Lê Lợi',
        title: 'Surprise Bag Cơm & Bento',
        description: 'Mỗi ngày một combo khác nhau: bento, cơm nắm, mì ly còn hạn dùng. Mở túi và nhận bất ngờ của bạn!',
        original_price: 120000,
        discount_price: 40000,
        quantity: 4,
        tags: ['surprise', 'com', 'bento'],
        image: 'photo-1578205519332-cf30375f2678',
        flash: false,
      },
      {
        store_name: 'Bách Hóa Xanh Hậu Giang',
        title: 'Surprise Bag Rau Củ Quả',
        description: 'Rổ rau củ quả tươi còn ngon chuẩn bị đổi hàng: cà chua, xà lách, trái cây theo mùa. Ăn ngay trong ngày.',
        original_price: 80000,
        discount_price: 25000,
        quantity: 8,
        tags: ['surprise', 'rau', 'trai_cay'],
        image: 'photo-1542838132-92c53300491e',
        flash: false,
      },
      {
        store_name: 'Family Mart Phan Xích Long',
        title: 'Surprise Bag Bánh Ngọt & Sữa',
        description: 'Bánh bông lan, sữa tươi, sữa chua gần date. Giá trị bất ngờ trong từng túi!',
        original_price: 100000,
        discount_price: 35000,
        quantity: 5,
        tags: ['surprise', 'banh_ngot', 'sua'],
        image: 'photo-1524351199678-941a58a3df50',
        flash: false,
      },
    ]

    for (const d of surpriseDeals) {
      const storeId = storeIdFor.get(d.store_name)
      if (!storeId) {
        console.warn(`  Store not found, skipping: ${d.store_name}`)
        continue
      }
      inserts.push({
        user_id: admin.id,
        store_id: storeId,
        title: d.title,
        description: d.description,
        original_price: d.original_price,
        discount_price: d.discount_price,
        original_quantity: d.quantity,
        remaining_quantity: d.quantity,
        latitude: 10.77,
        longitude: 106.7,
        address: d.store_name,
        images: [IMG(d.image)],
        tags: d.tags,
        status: 'active',
        verified: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
    console.log(`  Queueing ${inserts.filter(i => i.tags.includes('surprise')).length} surprise deals`)
  }

  if (!hasFlash) {
    const flashDeals = [
      {
        store_name: 'Family Mart Lê Lợi',
        title: 'FLASH: Cơm gà chiên xù 50% giảm giá',
        description: 'Giá giảm dần mỗi 5 phút khi càng gần hết giờ lấy. Chớp lấy ngay trước khi hết vé!',
        original_price: 38000,
        discount_price: 28000,
        quantity: 3,
        tags: ['flash', 'com', 'ga'],
        image: 'photo-1626082927389-6cd097cdc6ec',
        minutes: 45,
      },
      {
        store_name: 'Circle K Nguyễn Huệ',
        title: 'FLASH: Bánh mì thịt nướng hot',
        description: 'Bánh mì thịt nướng giảm giá theo thời gian còn lại. Số lượng cực có hạn!',
        original_price: 25000,
        discount_price: 18000,
        quantity: 5,
        tags: ['flash', 'banh_mi'],
        image: 'photo-1553909489-cd47e0907980',
        minutes: 60,
      },
    ]

    for (const d of flashDeals) {
      const storeId = storeIdFor.get(d.store_name)
      if (!storeId) {
        console.warn(`  Store not found, skipping: ${d.store_name}`)
        continue
      }
      inserts.push({
        user_id: admin.id,
        store_id: storeId,
        title: d.title,
        description: d.description,
        original_price: d.original_price,
        discount_price: d.discount_price,
        original_quantity: d.quantity,
        remaining_quantity: d.quantity,
        latitude: 10.77,
        longitude: 106.7,
        address: d.store_name,
        images: [IMG(d.image)],
        tags: d.tags,
        status: 'active',
        verified: true,
        expires_at: new Date(Date.now() + d.minutes * 60 * 1000).toISOString(),
      })
    }
    console.log(`  Queueing ${inserts.filter(i => i.tags.includes('flash')).length} flash deals`)
  }

  if (inserts.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  const { data, error } = await supabase.from('deals').insert(inserts).select()
  if (error) {
    console.error('Failed to insert deals:', error.message)
    process.exit(1)
  }
  console.log(`\nCreated ${data?.length ?? 0} deals successfully.`)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
