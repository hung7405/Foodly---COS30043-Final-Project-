import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as bcrypt from 'bcrypt'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

async function seed() {
  console.log('Starting Supabase seed...\n')

  const { error: pingErr } = await supabase.from('users').select('id', { count: 'exact', head: true })
  if (pingErr) {
    console.error('Cannot connect to Supabase:', pingErr.message)
    process.exit(1)
  }

  console.log('Connected to Supabase successfully.\n')

  // ── Users ──
  console.log('Seeding users...')

  const adminHash = await bcrypt.hash('Admin@123', 10)
  const userHash = await bcrypt.hash('Password123!', 10)

  const userRecords = [
    { username: 'admin', email: 'admin@foodly.app', password_hash: adminHash, first_name: 'Admin', role: 'admin', trust_score: 5.0, is_active: true, reputation_points: 0 },
    { username: 'lan_nguyen', email: 'lan@foodly.app', password_hash: userHash, first_name: 'Lan', last_name: 'Nguyen', role: 'user', trust_score: 4.2, is_active: true, reputation_points: 8 },
    { username: 'huy_tran', email: 'huy@foodly.app', password_hash: userHash, first_name: 'Huy', last_name: 'Tran', role: 'user', trust_score: 3.8, is_active: true, reputation_points: 12 },
    { username: 'mai_le', email: 'mai@foodly.app', password_hash: userHash, first_name: 'Mai', last_name: 'Le', role: 'user', trust_score: 4.5, is_active: true, reputation_points: 5 },
    { username: 'minh_pham', email: 'minh@foodly.app', password_hash: userHash, first_name: 'Minh', last_name: 'Pham', role: 'user', trust_score: 4.0, is_active: true, reputation_points: 15 },
    { username: 'thu_hoang', email: 'thu@foodly.app', password_hash: userHash, first_name: 'Thu', last_name: 'Hoang', role: 'user', trust_score: 4.7, is_active: true, reputation_points: 3 },
    { username: 'demo_user', email: 'demo@foodly.app', password_hash: userHash, first_name: 'Demo', last_name: 'User', role: 'user', trust_score: 3.5, is_active: true, reputation_points: 0 },
    { username: 'anh_vu', email: 'anh@foodly.app', password_hash: userHash, first_name: 'Anh', last_name: 'Vu', role: 'user', trust_score: 4.3, is_active: true, reputation_points: 7 },
    { username: 'binh_ngo', email: 'binh@foodly.app', password_hash: userHash, first_name: 'Binh', last_name: 'Ngo', role: 'moderator', trust_score: 4.8, is_active: true, reputation_points: 20 },
    { username: 'chi_dang', email: 'chi@foodly.app', password_hash: userHash, first_name: 'Chi', last_name: 'Dang', role: 'user', trust_score: 3.2, is_active: true, reputation_points: 1 },
  ]

  const { data: users, error: userErr } = await supabase
    .from('users')
    .insert(userRecords)
    .select()

  if (userErr) { console.error('Failed to seed users:', userErr.message); process.exit(1) }
  console.log(`  Created ${users.length} users`)

  const emailToId = new Map<string, string>()
  for (const u of users) {
    emailToId.set(u.email, u.id)
  }

  // ── Stores ──
  console.log('\nSeeding stores...')

  const storeRecords = [
    { name: 'Circle K Nguyễn Huệ', address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', latitude: 10.7725, longitude: 106.7042, category: 'Tiện lợi', avg_trust_score: 4.6, total_deals: 38 },
    { name: 'Family Mart Lê Lợi', address: '45 Lê Lợi, P. Bến Nghé, Quận 1', latitude: 10.7715, longitude: 106.7010, category: 'Tiện lợi', avg_trust_score: 4.8, total_deals: 52 },
    { name: '7-Eleven Mạc Đĩnh Chi', address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', latitude: 10.7850, longitude: 106.6930, category: 'Tiện lợi', avg_trust_score: 4.5, total_deals: 41 },
    { name: 'Ministop Nguyễn Thị Minh Khai', address: '12 Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1', latitude: 10.7820, longitude: 106.6990, category: 'Tiện lợi', avg_trust_score: 4.3, total_deals: 27 },
    { name: 'GS25 Hai Bà Trưng', address: '200 Hai Bà Trưng, P. Tân Định, Quận 1', latitude: 10.7760, longitude: 106.6960, category: 'Tiện lợi', avg_trust_score: 4.4, total_deals: 33 },
    { name: 'Circle K CMT8', address: '500 Cách Mạng Tháng 8, P.11, Quận 3', latitude: 10.7890, longitude: 106.6750, category: 'Tiện lợi', avg_trust_score: 4.2, total_deals: 29 },
    { name: "B's Mart Lê Văn Sỹ", address: '25 Lê Văn Sỹ, P.14, Quận 3', latitude: 10.7880, longitude: 106.6850, category: 'Tiện lợi', avg_trust_score: 4.0, total_deals: 15 },
    { name: 'Family Mart Phan Xích Long', address: '360 Phan Xích Long, P.7, Phú Nhuận', latitude: 10.7980, longitude: 106.6800, category: 'Tiện lợi', avg_trust_score: 4.7, total_deals: 44 },
    { name: '7-Eleven Nguyễn Văn Trỗi', address: '100 Nguyễn Văn Trỗi, P.8, Phú Nhuận', latitude: 10.7950, longitude: 106.6780, category: 'Tiện lợi', avg_trust_score: 4.1, total_deals: 22 },
    { name: 'Circle K Xô Viết Nghệ Tĩnh', address: '50 Xô Viết Nghệ Tĩnh, P.26, Bình Thạnh', latitude: 10.8020, longitude: 106.7120, category: 'Tiện lợi', avg_trust_score: 4.3, total_deals: 31 },
    { name: 'Family Mart Nguyễn Văn Linh', address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', latitude: 10.7300, longitude: 106.7200, category: 'Tiện lợi', avg_trust_score: 4.5, total_deals: 36 },
    { name: 'Circle K Phạm Văn Đồng', address: '100 Phạm Văn Đồng, P. Linh Tây, Thủ Đức', latitude: 10.8450, longitude: 106.7650, category: 'Tiện lợi', avg_trust_score: 4.1, total_deals: 19 },
    { name: '7-Eleven Nguyễn Oanh', address: '80 Nguyễn Oanh, P.10, Gò Vấp', latitude: 10.8300, longitude: 106.6750, category: 'Tiện lợi', avg_trust_score: 3.9, total_deals: 14 },
    { name: 'Ministop Trường Sơn', address: '200 Trường Sơn, P.2, Tân Bình', latitude: 10.8100, longitude: 106.6500, category: 'Tiện lợi', avg_trust_score: 4.2, total_deals: 25 },
    { name: 'GS25 Lũy Bán Bích', address: '150 Lũy Bán Bích, P. Tân Thới Hòa, Tân Phú', latitude: 10.7800, longitude: 106.6250, category: 'Tiện lợi', avg_trust_score: 3.8, total_deals: 11 },
    { name: 'Circle K Nguyễn Ảnh Thủ', address: '500 Nguyễn Ảnh Thủ, Hóc Môn', latitude: 10.8800, longitude: 106.5900, category: 'Tiện lợi', avg_trust_score: 3.7, total_deals: 8 },
    { name: 'Annam Gourmet Thảo Điền', address: '158 Nguyễn Văn Hưởng, P. Thảo Điền, Quận 2', latitude: 10.8100, longitude: 106.7400, category: 'Thực phẩm nhập khẩu', avg_trust_score: 4.8, total_deals: 25 },
    { name: 'Family Mart Thảo Điền', address: '88 Xuân Thủy, P. Thảo Điền, Quận 2', latitude: 10.8120, longitude: 106.7350, category: 'Tiện lợi', avg_trust_score: 4.4, total_deals: 30 },
    { name: 'Bách Hóa Xanh Hậu Giang', address: '200 Hậu Giang, P.11, Quận 6', latitude: 10.7450, longitude: 106.6400, category: 'Siêu thị', avg_trust_score: 4.1, total_deals: 45 },
    { name: 'Circle K Phạm Văn Chí', address: '50 Phạm Văn Chí, P.7, Quận 6', latitude: 10.7480, longitude: 106.6480, category: 'Tiện lợi', avg_trust_score: 3.9, total_deals: 18 },
    { name: 'Bách Hóa Xanh Phạm Thế Hiển', address: '400 Phạm Thế Hiển, P.7, Quận 8', latitude: 10.7300, longitude: 106.6650, category: 'Siêu thị', avg_trust_score: 4.0, total_deals: 35 },
    { name: 'Ministop Tạ Quang Bửu', address: '100 Tạ Quang Bửu, P.5, Quận 8', latitude: 10.7350, longitude: 106.6700, category: 'Tiện lợi', avg_trust_score: 4.3, total_deals: 22 },
    { name: 'GS25 Quốc Lộ 22', address: '300 Quốc Lộ 22, P. Đông Hưng Thuận, Quận 12', latitude: 10.8600, longitude: 106.6350, category: 'Tiện lợi', avg_trust_score: 3.8, total_deals: 14 },
    { name: 'Circle K Nguyễn Ảnh Thủ (2)', address: '200 Nguyễn Ảnh Thủ, P. Đông Hưng Thuận, Quận 12', latitude: 10.8550, longitude: 106.6400, category: 'Tiện lợi', avg_trust_score: 4.0, total_deals: 20 },
    { name: 'Bách Hóa Xanh Huỳnh Tấn Phát', address: '500 Huỳnh Tấn Phát, Nhà Bè', latitude: 10.7100, longitude: 106.7100, category: 'Siêu thị', avg_trust_score: 4.2, total_deals: 28 },
    { name: 'Bách Hóa Xanh Tỉnh Lộ 8', address: '1000 Tỉnh Lộ 8, Củ Chi', latitude: 10.9700, longitude: 106.5000, category: 'Siêu thị', avg_trust_score: 3.9, total_deals: 12 },
    { name: 'Circle K Đại lộ Bình Dương', address: '200 Đại lộ Bình Dương, Thủ Dầu Một', latitude: 10.9600, longitude: 106.6800, category: 'Tiện lợi', avg_trust_score: 4.1, total_deals: 16 },
    { name: 'Bách Hóa Xanh Nguyễn Kiệm', address: '300 Nguyễn Kiệm, P.3, Q.3', latitude: 10.7980, longitude: 106.6720, category: 'Siêu thị', avg_trust_score: 4.2, total_deals: 30 },
    { name: 'Family Mart Hoàng Văn Thụ', address: '150 Hoàng Văn Thụ, P.8, Tân Bình', latitude: 10.7900, longitude: 106.6880, category: 'Tiện lợi', avg_trust_score: 4.5, total_deals: 28 },
    { name: '7-Eleven Lý Thường Kiệt', address: '80 Lý Thường Kiệt, P.14, Q.11', latitude: 10.7750, longitude: 106.6840, category: 'Tiện lợi', avg_trust_score: 4.0, total_deals: 20 },
    { name: 'GS25 Phạm Ngũ Lão', address: '50 Phạm Ngũ Lão, P.3, Q.1', latitude: 10.7690, longitude: 106.6930, category: 'Tiện lợi', avg_trust_score: 4.3, total_deals: 22 },
    { name: 'Circle K Trần Hưng Đạo', address: '200 Trần Hưng Đạo, P.11, Q.1', latitude: 10.7500, longitude: 106.6900, category: 'Tiện lợi', avg_trust_score: 4.1, total_deals: 18 },
    { name: 'Ministop Nguyễn Đình Chiểu', address: '100 Nguyễn Đình Chiểu, P.7, Q.3', latitude: 10.7740, longitude: 106.6890, category: 'Tiện lợi', avg_trust_score: 4.4, total_deals: 24 },
  ]

  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .insert(storeRecords)
    .select()

  if (storeErr) { console.error('Failed to seed stores:', storeErr.message); process.exit(1) }
  console.log(`  Created ${stores.length} stores`)

  const storeNameToId = new Map<string, string>()
  for (const s of stores) {
    storeNameToId.set(s.name, s.id)
  }

  // ── Deals ──
  console.log('\nSeeding deals...')

  const dealRecords = [
    { store_name: 'Circle K Nguyễn Huệ', title: 'Cơm gà sốt cay gói', description: 'Cơm gà sốt Thái gói tiện lợi, hạn sử dụng hôm nay. Gear hâm nóng 2 phút.', original_price: 25000, discount_price: 10000, remaining_quantity: 8, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', tags: ['com', 'ga', 'tien loi'], verified: true },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Bánh mì gà cay Hàn Quốc', description: 'Bánh mì kẹp gà sốt cay Hàn Quốc, sản xuất sáng nay. Giảm 60%.', original_price: 22000, discount_price: 9000, remaining_quantity: 5, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', tags: ['banh mi', 'ga', 'tien loi'], verified: true },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Mì cốc bò cay x 3', description: '3 mì cốc bò hải sản, gần hết hạn. Ngon hơn khi nấu.', original_price: 30000, discount_price: 12000, remaining_quantity: 15, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, P. Bến Nghé, Quận 1', tags: ['mi', 'tien loi', 'snack'], verified: false },
    { store_name: 'Family Mart Lê Lợi', title: 'Cơm bento cá hồi', description: 'Cơm bento cá hồi nướng sốt teriyaki, rau củ tươi. Sản xuất sáng 6h, giảm giá 8h tối.', original_price: 35000, discount_price: 15000, remaining_quantity: 4, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, P. Bến Nghé, Quận 1', tags: ['com', 'ca', 'bento'], verified: true },
    { store_name: 'Family Mart Lê Lợi', title: 'Onigiri cá ngừ 2 cái', description: '2 cơm nắm onigiri nhân cá ngừ sốt mayo. Đóng gói sáng nay.', original_price: 28000, discount_price: 11000, remaining_quantity: 7, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, P. Bến Nghé, Quận 1', tags: ['com', 'ca', 'nhat'], verified: true },
    { store_name: 'Family Mart Lê Lợi', title: 'Trà sữa matcha đá xay', description: 'Trà sữa matcha đá xay Famima, 2 ly. Hạn dùng hôm nay.', original_price: 36000, discount_price: 14000, remaining_quantity: 6, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, P. Bến Nghé, Quận 1', tags: ['tra sua', 'uong', 'matcha'], verified: false },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Bánh mì thịt nguội 7-Select', description: 'Bánh mì thịt nguội 7-Select, rau củ tươi ngon. Sản xuất sáng nay, giảm 50%.', original_price: 20000, discount_price: 10000, remaining_quantity: 10, latitude: 10.7850, longitude: 106.6930, address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', tags: ['banh mi', 'thit', 'tien loi'], verified: true },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Cơm cuộn kimbap', description: 'Cơm cuộn kimbap nhân thịt bò, 4 miếng. Gói riêng tươi ngon.', original_price: 18000, discount_price: 7000, remaining_quantity: 9, latitude: 10.7850, longitude: 106.6930, address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', tags: ['com', 'kim bap', 'han'], verified: true },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Bia lon Tiger 6 lon', description: '6 lon bia Tiger 330ml, khuyến mãi xả kho gần date.', original_price: 90000, discount_price: 45000, remaining_quantity: 12, latitude: 10.7850, longitude: 106.6930, address: '88 Mạc Đĩnh Chi, P. Đa Kao, Quận 1', tags: ['bia', 'uong', 'tien loi'], verified: false },
    { store_name: 'Ministop Nguyễn Thị Minh Khai', title: 'Kem xốp vani ốc quế', description: 'Kem xốp vani ốc quế, 3 cây. Bảo quản lạnh, hạn dùng 5 ngày.', original_price: 24000, discount_price: 10000, remaining_quantity: 8, latitude: 10.7820, longitude: 106.6990, address: '12 Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1', tags: ['kem', 'trang mieng', 'tien loi'], verified: true },
    { store_name: 'Ministop Nguyễn Thị Minh Khai', title: 'Khoai tây lắc phô mai', description: 'Khoai tây lắc phô mai que, gói 80g. 5 gói giảm 50%.', original_price: 20000, discount_price: 10000, remaining_quantity: 14, latitude: 10.7820, longitude: 106.6990, address: '12 Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1', tags: ['snack', 'khoai tay', 'tien loi'], verified: false },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Cơm trộn Hàn Quốc bibimbap', description: 'Cơm trộn bibimbap với rau củ, thịt bò xào và trứng. Hộp 350g.', original_price: 30000, discount_price: 13000, remaining_quantity: 5, latitude: 10.7760, longitude: 106.6960, address: '200 Hai Bà Trưng, P. Tân Định, Quận 1', tags: ['com', 'han', 'bento'], verified: true },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Nước tăng lực Master 6 lon', description: '6 lon nước tăng lực Master, gần date. Giảm 55%.', original_price: 54000, discount_price: 24000, remaining_quantity: 18, latitude: 10.7760, longitude: 106.6960, address: '200 Hai Bà Trưng, P. Tân Định, Quận 1', tags: ['uong', 'tang luc', 'tien loi'], verified: false },
    { store_name: 'Circle K CMT8', title: 'Xúc xích túi 5 cái', description: 'Xúc xích heo túi 5 cái, luộc/chảo. Hạn sử dụng 3 ngày.', original_price: 25000, discount_price: 10000, remaining_quantity: 11, latitude: 10.7890, longitude: 106.6750, address: '500 Cách Mạng Tháng 8, P.11, Quận 3', tags: ['xuc xich', 'snack', 'tien loi'], verified: true },
    { store_name: 'Circle K CMT8', title: 'Bánh chuối socola', description: 'Bánh chuối nướng socola, 2 cái. Đồ nướng tại cửa hàng.', original_price: 18000, discount_price: 7000, remaining_quantity: 6, latitude: 10.7890, longitude: 106.6750, address: '500 Cách Mạng Tháng 8, P.11, Quận 3', tags: ['banh', 'snack', 'tien loi'], verified: false },
    { store_name: 'Circle K CMT8', title: 'Mì ly bò cay x 6', description: '6 ly mì bò cay Hàn Quốc, gần date. Hàng xả kho.', original_price: 48000, discount_price: 20000, remaining_quantity: 20, latitude: 10.7890, longitude: 106.6750, address: '500 Cách Mạng Tháng 8, P.11, Quận 3', tags: ['mi', 'tien loi', 'snack'], verified: false },
    { store_name: 'Family Mart Phan Xích Long', title: 'Bento sườn non kho tàu', description: 'Cơm bento sườn non kho tàu, trứng cút. Nấu sáng nay, giảm giá tối.', original_price: 32000, discount_price: 14000, remaining_quantity: 6, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, P.7, Phú Nhuận', tags: ['com', 'suon', 'bento'], verified: true },
    { store_name: 'Family Mart Phan Xích Long', title: 'Chả giò rế 10 cái', description: 'Chả giò rế nhân thịt heo, 10 cái. Hít dầu, để được 2 ngày.', original_price: 30000, discount_price: 12000, remaining_quantity: 7, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, P.7, Phú Nhuận', tags: ['cha gio', 'viet', 'tien loi'], verified: true },
    { store_name: 'Family Mart Phan Xích Long', title: 'Cà phê sữa đá x 6', description: '6 ly cà phê sữa đá gói. Pha sẵn, uống liền.', original_price: 48000, discount_price: 20000, remaining_quantity: 9, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, P.7, Phú Nhuận', tags: ['ca phe', 'uong', 'tien loi'], verified: false },
    { store_name: '7-Eleven Nguyễn Văn Trỗi', title: 'Sandwich gà nướng', description: 'Sandwich kẹp gà nướng, rau xà lách, sốt mayo. Tươi ngon.', original_price: 22000, discount_price: 10000, remaining_quantity: 8, latitude: 10.7950, longitude: 106.6780, address: '100 Nguyễn Văn Trỗi, P.8, Phú Nhuận', tags: ['sandwich', 'ga', 'tien loi'], verified: true },
    { store_name: '7-Eleven Nguyễn Văn Trỗi', title: 'Nước ngọt Coca lon 6', description: '6 lon Coca-cola 330ml, xả tồn gần date.', original_price: 36000, discount_price: 15000, remaining_quantity: 24, latitude: 10.7950, longitude: 106.6780, address: '100 Nguyễn Văn Trỗi, P.8, Phú Nhuận', tags: ['nuoc ngot', 'uong', 'tien loi'], verified: false },
    { store_name: 'Circle K Xô Viết Nghệ Tĩnh', title: 'Bánh tráng trộn gói', description: 'Bánh tráng trộn sẵn gói 200g. Đồ ăn vặt hot.', original_price: 12000, discount_price: 5000, remaining_quantity: 13, latitude: 10.8020, longitude: 106.7120, address: '50 Xô Viết Nghệ Tĩnh, P.26, Bình Thạnh', tags: ['banh trang', 'viet', 'snack'], verified: false },
    { store_name: 'Circle K Xô Viết Nghệ Tĩnh', title: 'Bò khô túi 100g', description: 'Bò khô miếng, gói 100g. Ăn vặt bia rất ngon.', original_price: 35000, discount_price: 18000, remaining_quantity: 7, latitude: 10.8020, longitude: 106.7120, address: '50 Xô Viết Nghệ Tĩnh, P.26, Bình Thạnh', tags: ['bo kho', 'snack', 'bia'], verified: true },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Bento gà chiên sốt ngọt', description: 'Cơm bento gà chiên sốt ngọt kiểu Hàn. Sốt gochujang.', original_price: 33000, discount_price: 14000, remaining_quantity: 5, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', tags: ['com', 'ga', 'bento'], verified: true },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Sữa chua uống 6 chai', description: '6 chai sữa chua uống Yakult-style, gần hạn 3 ngày.', original_price: 30000, discount_price: 12000, remaining_quantity: 16, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', tags: ['sua chua', 'uong', 'tien loi'], verified: true },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Bánh bông lan cuộn kem', description: 'Bánh bông lan cuộn kem tươi, 4 miếng. Tráng miệng.', original_price: 22000, discount_price: 9000, remaining_quantity: 6, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, P. Tân Thuận Tây, Quận 7', tags: ['banh', 'trang mieng', 'tien loi'], verified: false },
    { store_name: 'Circle K Phạm Văn Đồng', title: 'Pizza gà mini gói', description: 'Pizza gà mini hộp, chỉ hâm microwave 2 phút. Gần date.', original_price: 28000, discount_price: 12000, remaining_quantity: 6, latitude: 10.8450, longitude: 106.7650, address: '100 Phạm Văn Đồng, P. Linh Tây, Thủ Đức', tags: ['pizza', 'tien loi', 'snack'], verified: true },
    { store_name: 'Circle K Phạm Văn Đồng', title: 'Trà ô long chai 6', description: '6 chai trà ô long không đường 500ml. Giảm giá gần date.', original_price: 42000, discount_price: 18000, remaining_quantity: 12, latitude: 10.8450, longitude: 106.7650, address: '100 Phạm Văn Đồng, P. Linh Tây, Thủ Đức', tags: ['tra', 'uong', 'khong duong'], verified: false },
    { store_name: '7-Eleven Nguyễn Oanh', title: 'Cơm chiên dương châu gói', description: 'Cơm chiên dương châu gói 300g. Hâm nhanh.', original_price: 20000, discount_price: 8000, remaining_quantity: 9, latitude: 10.8300, longitude: 106.6750, address: '80 Nguyễn Oanh, P.10, Gò Vấp', tags: ['com', 'chien', 'tien loi'], verified: false },
    { store_name: '7-Eleven Nguyễn Oanh', title: 'Snack que Hàn Quốc 5 gói', description: '5 gói snack que Hàn Quốc vị phô mai. Hàng xả kho.', original_price: 35000, discount_price: 15000, remaining_quantity: 20, latitude: 10.8300, longitude: 106.6750, address: '80 Nguyễn Oanh, P.10, Gò Vấp', tags: ['snack', 'han', 'tien loi'], verified: false },
    { store_name: 'Ministop Trường Sơn', title: 'Bánh mì que pate', description: 'Bánh mì que pate, 3 cái. Nhẹ nhàng, ăn sáng.', original_price: 15000, discount_price: 6000, remaining_quantity: 12, latitude: 10.8100, longitude: 106.6500, address: '200 Trường Sơn, P.2, Tân Bình', tags: ['banh mi', 'sang', 'tien loi'], verified: true },
    { store_name: 'Ministop Trường Sơn', title: 'Nước suối 500ml thùng', description: 'Thùng 24 chai nước suối 500ml. Gần date, giảm 40%.', original_price: 60000, discount_price: 36000, remaining_quantity: 30, latitude: 10.8100, longitude: 106.6500, address: '200 Trường Sơn, P.2, Tân Bình', tags: ['nuoc', 'uong', 'tien loi'], verified: false },
    { store_name: 'GS25 Lũy Bán Bích', title: 'Tokbokki gói 500g', description: 'Tokbokki bánh gạo sốt cay Hàn Quốc gói 500g. Nấu đơn giản.', original_price: 28000, discount_price: 12000, remaining_quantity: 8, latitude: 10.7800, longitude: 106.6250, address: '150 Lũy Bán Bích, P. Tân Thới Hòa, Tân Phú', tags: ['tokbokki', 'han', 'tien loi'], verified: false },
    { store_name: 'GS25 Lũy Bán Bích', title: 'Bánh gạo Hàn Quốc 3 gói', description: '3 gói bánh gạo Hàn Quốc vị rong biển. Ăn vặt.', original_price: 15000, discount_price: 6000, remaining_quantity: 18, latitude: 10.7800, longitude: 106.6250, address: '150 Lũy Bán Bích, P. Tân Thới Hòa, Tân Phú', tags: ['banh gao', 'han', 'snack'], verified: true },
    { store_name: "B's Mart Lê Văn Sỹ", title: 'Bánh tráng muối ớt', description: 'Bánh tráng muối ớt túi 200g. Đặc sản Việt.', original_price: 10000, discount_price: 4000, remaining_quantity: 15, latitude: 10.7880, longitude: 106.6850, address: '25 Lê Văn Sỹ, P.14, Quận 3', tags: ['banh trang', 'viet', 'snack'], verified: false },
    { store_name: "B's Mart Lê Văn Sỹ", title: 'Hạt hướng dương rang', description: 'Hạt hướng dương rang muối 250g. Ăn nhậu.', original_price: 12000, discount_price: 5000, remaining_quantity: 20, latitude: 10.7880, longitude: 106.6850, address: '25 Lê Văn Sỹ, P.14, Quận 3', tags: ['hat', 'snack', 'bia'], verified: false },
    { store_name: 'Circle K Nguyễn Ảnh Thủ', title: 'Mì tôm Hảo Hảo thùng 30', description: 'Thùng 30 gói mì tôm Hảo Hảo chua cay. Hàng gần date, giá rẻ.', original_price: 105000, discount_price: 45000, remaining_quantity: 40, latitude: 10.8800, longitude: 106.5900, address: '500 Nguyễn Ảnh Thủ, Hóc Môn', tags: ['mi tom', 'viet', 'tien loi'], verified: true },
    { store_name: 'Annam Gourmet Thảo Điền', title: 'Phô mai Parmesan Ý 200g', description: 'Phô mai Parmesan D.O.P nhập khẩu Ý, gần hạn 7 ngày. Giảm 50%.', original_price: 180000, discount_price: 90000, remaining_quantity: 5, latitude: 10.8100, longitude: 106.7400, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['pho mai', 'nhap khau', 'y'], verified: true },
    { store_name: 'Annam Gourmet Thảo Điền', title: 'Rượu vang Chile 2019', description: 'Chai rượu vang đỏ Carmenere Chile 750ml, vintage 2019.', original_price: 350000, discount_price: 195000, remaining_quantity: 3, latitude: 10.8105, longitude: 106.7410, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['ruou', 'vang', 'nhap khau'], verified: true },
    { store_name: 'Annam Gourmet Thảo Điền', title: 'Bánh mì baguette Pháp', description: 'Bánh mì baguette truyền thống Pháp, nướng sáng nay. 3 ổ.', original_price: 45000, discount_price: 25000, remaining_quantity: 8, latitude: 10.8095, longitude: 106.7390, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['banh mi', 'phap', 'nhap khau'], verified: false },
    { store_name: 'Family Mart Thảo Điền', title: 'Cơm bento gà cốt lết', description: 'Cơm bento gà cốt lết chiên xù, sốt mayonnaise. Sản xuất sáng nay.', original_price: 34000, discount_price: 14000, remaining_quantity: 6, latitude: 10.8120, longitude: 106.7350, address: '88 Xuân Thủy, Thảo Điền', tags: ['com', 'ga', 'bento'], verified: true },
    { store_name: 'Family Mart Thảo Điền', title: 'Salad rau trứng gà', description: 'Salad rau tươi trứng gà, sốt dầu giấm. Ăn healthy.', original_price: 28000, discount_price: 12000, remaining_quantity: 5, latitude: 10.8125, longitude: 106.7340, address: '88 Xuân Thủy, Thảo Điền', tags: ['salad', 'healthy', 'rau'], verified: true },
    { store_name: 'Bách Hóa Xanh Hậu Giang', title: 'Thịt ba chỉ rọi 1kg', description: 'Thịt ba chỉ rọi tươi, siêu thị nhập sáng. Giảm giá gần hết ngày.', original_price: 120000, discount_price: 75000, remaining_quantity: 4, latitude: 10.7450, longitude: 106.6400, address: '200 Hậu Giang, Q.6', tags: ['thit', 'heo', 'thuc pham'], verified: true },
    { store_name: 'Bách Hóa Xanh Hậu Giang', title: 'Rau củ hỗn hợp 2kg', description: 'Bộ rau củ tươi: cải, cà rốt, khoai tây, bí. Đóng gói 2kg.', original_price: 45000, discount_price: 25000, remaining_quantity: 10, latitude: 10.7455, longitude: 106.6405, address: '200 Hậu Giang, Q.6', tags: ['rau', 'cu', 'thuc pham'], verified: true },
    { store_name: 'Bách Hóa Xanh Hậu Giang', title: 'Cá hồi phi lê 300g', description: 'Phi lê cá hồi Na Uy, đông lạnh nhập khẩu. Gần hạn 5 ngày.', original_price: 180000, discount_price: 99000, remaining_quantity: 3, latitude: 10.7445, longitude: 106.6390, address: '200 Hậu Giang, Q.6', tags: ['ca', 'hoi', 'nhap khau'], verified: true },
    { store_name: 'Circle K Phạm Văn Chí', title: 'Mì gói Hàn Quốc 5 gói', description: '5 gói mì cay Hàn Quốc Shin Ramyun. Hàng gần date.', original_price: 45000, discount_price: 22000, remaining_quantity: 15, latitude: 10.7480, longitude: 106.6480, address: '50 Phạm Văn Chí, Q.6', tags: ['mi', 'han', 'tien loi'], verified: false },
    { store_name: 'Circle K Phạm Văn Chí', title: 'Nước yến sào 5 chai', description: '5 chai yến sào đường phèn, bồi bổ sức khỏe.', original_price: 75000, discount_price: 39000, remaining_quantity: 8, latitude: 10.7485, longitude: 106.6485, address: '50 Phạm Văn Chí, Q.6', tags: ['yen sao', 'uong', 'suc khoe'], verified: true },
    { store_name: 'Bách Hóa Xanh Phạm Thế Hiển', title: 'Tôm sú tươi sống 500g', description: 'Tôm sú tươi sống size lớn, 500g. Đánh bắt sáng nay.', original_price: 150000, discount_price: 99000, remaining_quantity: 3, latitude: 10.7300, longitude: 106.6650, address: '400 Phạm Thế Hiển, Q.8', tags: ['tom', 'hai san', 'tuoi song'], verified: true },
    { store_name: 'Bách Hóa Xanh Phạm Thế Hiển', title: 'Sữa tươi Vinamilk 5 lít', description: '5 hộp sữa tươi Vinamilk 1L. Hạn sử dụng 5 ngày.', original_price: 125000, discount_price: 79000, remaining_quantity: 6, latitude: 10.7305, longitude: 106.6655, address: '400 Phạm Thế Hiển, Q.8', tags: ['sua', 'uong', 'thuc pham'], verified: true },
    { store_name: 'Bách Hóa Xanh Phạm Thế Hiển', title: 'Gạo ST25 5kg', description: 'Gạo ST25 ngon nhất thế giới, túi 5kg.', original_price: 120000, discount_price: 85000, remaining_quantity: 10, latitude: 10.7310, longitude: 106.6660, address: '400 Phạm Thế Hiển, Q.8', tags: ['gao', 'viet', 'thuc pham'], verified: true },
    { store_name: 'Ministop Tạ Quang Bửu', title: 'Kem Hokkaido sữa tươi', description: 'Kem tươi Hokkaido vị sữa, 5 que. Bảo quản lạnh.', original_price: 35000, discount_price: 16000, remaining_quantity: 9, latitude: 10.7350, longitude: 106.6700, address: '100 Tạ Quang Bửu, Q.8', tags: ['kem', 'sua', 'trang mieng'], verified: true },
    { store_name: 'Ministop Tạ Quang Bửu', title: 'Bánh mì sandwich nguyên cám', description: 'Bánh mì sandwich nguyên cám tươi, 6 lát.', original_price: 18000, discount_price: 9000, remaining_quantity: 12, latitude: 10.7355, longitude: 106.6705, address: '100 Tạ Quang Bửu, Q.8', tags: ['banh mi', 'healthy', 'nguyen cam'], verified: false },
    { store_name: 'GS25 Quốc Lộ 22', title: 'Cơm trộn Hàn Quốc 2 hộp', description: '2 hộp cơm trộn bulgogi Hàn Quốc, sốt gochujang.', original_price: 35000, discount_price: 15000, remaining_quantity: 7, latitude: 10.8600, longitude: 106.6350, address: '300 Quốc Lộ 22, Q.12', tags: ['com', 'han', 'tron'], verified: true },
    { store_name: 'GS25 Quốc Lộ 22', title: 'Trà đào cam sả 5 chai', description: '5 chai trà đào cam sả 500ml, giải khát mùa hè.', original_price: 55000, discount_price: 29000, remaining_quantity: 14, latitude: 10.8605, longitude: 106.6355, address: '300 Quốc Lộ 22, Q.12', tags: ['tra dao', 'uong', 'tien loi'], verified: false },
    { store_name: 'Circle K Nguyễn Ảnh Thủ (2)', title: 'Bánh tráng bơ gói', description: 'Bánh tráng bơ siêu to, gói 500g. Ăn vặt.', original_price: 25000, discount_price: 12000, remaining_quantity: 20, latitude: 10.8550, longitude: 106.6400, address: '200 Nguyễn Ảnh Thủ, Q.12', tags: ['banh trang', 'bo', 'snack'], verified: false },
    { store_name: 'Circle K Nguyễn Ảnh Thủ (2)', title: 'Xúc xích Đức 10 cái', description: 'Xúc xích Đức nhập khẩu, 10 cái. Chỉ nướng/luộc.', original_price: 65000, discount_price: 32000, remaining_quantity: 6, latitude: 10.8555, longitude: 106.6405, address: '200 Nguyễn Ảnh Thủ, Q.12', tags: ['xuc xich', 'duc', 'nhap khau'], verified: true },
    { store_name: 'Bách Hóa Xanh Huỳnh Tấn Phát', title: 'Thịt bò Mỹ bắp 1kg', description: 'Bắp bò Mỹ nhập khẩu, tươi đông lạnh 1kg.', original_price: 250000, discount_price: 159000, remaining_quantity: 4, latitude: 10.7100, longitude: 106.7100, address: '500 Huỳnh Tấn Phát, Nhà Bè', tags: ['thit bo', 'my', 'nhap khau'], verified: true },
    { store_name: 'Bách Hóa Xanh Huỳnh Tấn Phát', title: 'Dưa hấu ruột đỏ 3kg', description: 'Trái dưa hấu ruột đỏ, ngọt mát. Nặng ~3kg.', original_price: 45000, discount_price: 25000, remaining_quantity: 8, latitude: 10.7105, longitude: 106.7105, address: '500 Huỳnh Tấn Phát, Nhà Bè', tags: ['dua hau', 'trai cay', 'thuc pham'], verified: false },
    { store_name: 'Bách Hóa Xanh Tỉnh Lộ 8', title: 'Trứng gà ta 30 quả', description: '30 quả trứng gà ta tươi, trang trại sạch.', original_price: 60000, discount_price: 38000, remaining_quantity: 15, latitude: 10.9700, longitude: 106.5000, address: '1000 Tỉnh Lộ 8, Củ Chi', tags: ['trung', 'ga', 'thuc pham'], verified: true },
    { store_name: 'Circle K Đại lộ Bình Dương', title: 'Bánh mì thịt nướng BBQ', description: 'Bánh mì thịt nướng BBQ sốt cay, rau sống tươi.', original_price: 22000, discount_price: 10000, remaining_quantity: 8, latitude: 10.9600, longitude: 106.6800, address: '200 Đại lộ Bình Dương', tags: ['banh mi', 'thit nuong', 'tien loi'], verified: true },
    { store_name: 'Circle K Đại lộ Bình Dương', title: 'Cà phê sữa đá x 5 ly', description: '5 ly cà phê sữa đá gói. Pha sẵn uống liền.', original_price: 60000, discount_price: 30000, remaining_quantity: 10, latitude: 10.9605, longitude: 106.6805, address: '200 Đại lộ Bình Dương', tags: ['ca phe', 'sua da', 'uong'], verified: true },
    { store_name: '7-Eleven Nguyễn Văn Trỗi', title: 'Dimsum gà há cảo 10 cái', description: '10 há cảo gà tôm hấp, kèm xì dầu. Hâm microwave 3 phút.', original_price: 38000, discount_price: 18000, remaining_quantity: 7, latitude: 10.7955, longitude: 106.6785, address: '100 Nguyễn Văn Trỗi, Phú Nhuận', tags: ['dimsum', 'ha cao', 'hoa'], verified: true },
    { store_name: 'Family Mart Phan Xích Long', title: 'Bò bít tết sốt tiêu đen', description: 'Bò bít tết sốt tiêu đen kèm khoai tây nghiền, hâm nóng 5 phút.', original_price: 55000, discount_price: 25000, remaining_quantity: 3, latitude: 10.7985, longitude: 106.6805, address: '360 Phan Xích Long, Phú Nhuận', tags: ['bo', 'bit tet', 'tay'], verified: true },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Ramen tonkotsu hộp', description: 'Ramen tonkotsu xương heo, gồm thịt heo, trứng, rong biển.', original_price: 45000, discount_price: 20000, remaining_quantity: 5, latitude: 10.7310, longitude: 106.7190, address: '1 Nguyễn Văn Linh, Q.7', tags: ['ramen', 'nhat', 'mi'], verified: true },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Chân gà sả tắc 500g', description: 'Chân gà sả tắc muối ớt, gói 500g. Đồ nhậu lai rai.', original_price: 35000, discount_price: 16000, remaining_quantity: 9, latitude: 10.7855, longitude: 106.6935, address: '88 Mạc Đĩnh Chi, Q.1', tags: ['chan ga', 'sa tac', 'nhau'], verified: false },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Coca Cola 330ml x 6', description: '6 lon Coca-Cola 330ml mát lạnh. Giảm giá gần date.', original_price: 42000, discount_price: 20000, remaining_quantity: 24, latitude: 10.7728, longitude: 106.7045, address: '123 Nguyễn Huệ, Q.1', tags: ['uong', 'nuoc ngot', 'tien loi'], verified: true },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Pringles vị kem chua hành', description: 'Pringles Sour Cream & Onion 165g. Snack nhập khẩu.', original_price: 35000, discount_price: 18000, remaining_quantity: 10, latitude: 10.7726, longitude: 106.7043, address: '123 Nguyễn Huệ, Q.1', tags: ['snack', 'khoai tay', 'nhap khau'], verified: true },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Trà xanh không đường 500ml x 4', description: '4 chai trà xanh không đường, giải khát healthy.', original_price: 36000, discount_price: 16000, remaining_quantity: 18, latitude: 10.7724, longitude: 106.7046, address: '123 Nguyễn Huệ, Q.1', tags: ['tra', 'uong', 'khong duong'], verified: false },
    { store_name: 'Family Mart Lê Lợi', title: 'Sữa chua uống Probi 6 chai', description: '6 chai sữa chua uống Probi, bổ sung lợi khuẩn.', original_price: 42000, discount_price: 20000, remaining_quantity: 15, latitude: 10.7718, longitude: 106.7012, address: '45 Lê Lợi, Q.1', tags: ['sua chua', 'uong', 'suc khoe'], verified: true },
    { store_name: 'Family Mart Lê Lợi', title: 'Cơm nắm rong biển 3 cái', description: '3 cơm nắm rong biển nhân cá hồi và sốt mayo.', original_price: 30000, discount_price: 14000, remaining_quantity: 8, latitude: 10.7716, longitude: 106.7011, address: '45 Lê Lợi, Q.1', tags: ['com', 'nhat', 'bento'], verified: false },
    { store_name: 'Family Mart Lê Lợi', title: 'Bánh mì kẹp thịt heo nướng', description: 'Bánh mì kẹp thịt heo nướng BBQ, rau sống tươi. Gói riêng.', original_price: 25000, discount_price: 11000, remaining_quantity: 6, latitude: 10.7717, longitude: 106.7013, address: '45 Lê Lợi, Q.1', tags: ['banh mi', 'thit', 'tien loi'], verified: true },
    { store_name: 'Annam Gourmet Thảo Điền', title: 'Dầu olive Ý 500ml', description: 'Dầu olive nguyên chất Ý, hạn dùng 3 tháng.', original_price: 250000, discount_price: 139000, remaining_quantity: 4, latitude: 10.8102, longitude: 106.7405, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['dau olive', 'nhap khau', 'y'], verified: true },
    { store_name: 'Annam Gourmet Thảo Điền', title: 'Pasta Ý Barilla 500g x 3', description: '3 gói pasta spaghetti Barilla nhập khẩu Ý.', original_price: 90000, discount_price: 49000, remaining_quantity: 6, latitude: 10.8103, longitude: 106.7408, address: '158 Nguyễn Văn Hưởng, Thảo Điền', tags: ['pasta', 'nhap khau', 'y'], verified: false },
    { store_name: 'Circle K Phạm Văn Đồng', title: 'Bia Heineken 330ml x 6', description: '6 lon bia Heineken, hàng xả tồn gần date.', original_price: 84000, discount_price: 42000, remaining_quantity: 24, latitude: 10.8455, longitude: 106.7655, address: '100 Phạm Văn Đồng, Thủ Đức', tags: ['bia', 'uong', 'nhap khau'], verified: false },
    { store_name: 'Circle K Phạm Văn Đồng', title: 'Mỳ ý sốt bò bằm hộp', description: 'Mỳ ý sốt bò bằm hộp 350g, hâm nóng 3 phút.', original_price: 28000, discount_price: 13000, remaining_quantity: 7, latitude: 10.8452, longitude: 106.7652, address: '100 Phạm Văn Đồng, Thủ Đức', tags: ['mi', 'y', 'tien loi'], verified: true },
    { store_name: 'Bách Hóa Xanh Hậu Giang', title: 'Sườn non heo 1kg', description: 'Sườn non heo tươi, đóng gói chân không 1kg.', original_price: 140000, discount_price: 89000, remaining_quantity: 5, latitude: 10.7452, longitude: 106.6402, address: '200 Hậu Giang, Q.6', tags: ['thit', 'heo', 'thuc pham'], verified: true },
    { store_name: 'Bách Hóa Xanh Hậu Giang', title: 'Cà chua bi hữu cơ 500g', description: 'Cà chua bi hữu cơ, ngọt, sạch. Đóng hộp 500g.', original_price: 25000, discount_price: 15000, remaining_quantity: 12, latitude: 10.7453, longitude: 106.6403, address: '200 Hậu Giang, Q.6', tags: ['rau', 'cu', 'thuc pham'], verified: true },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Kim chi Hàn Quốc 500g', description: 'Kim chi bắp cải Hàn Quốc, gói 500g. Sản xuất tại cửa hàng.', original_price: 25000, discount_price: 12000, remaining_quantity: 8, latitude: 10.7765, longitude: 106.6965, address: '200 Hai Bà Trưng, Q.1', tags: ['kim chi', 'han', 'thuc pham'], verified: true },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Bánh gạo Hàn Quốc gói 300g', description: 'Bánh gạo Hàn Quốc cay ngọt, gói 300g. Ăn vặt.', original_price: 18000, discount_price: 8000, remaining_quantity: 16, latitude: 10.7762, longitude: 106.6962, address: '200 Hai Bà Trưng, Q.1', tags: ['banh gao', 'han', 'snack'], verified: false },
    { store_name: 'Ministop Trường Sơn', title: 'Kem ốc quế socola 5 cây', description: '5 kem ốc quế socola, bảo quản lạnh -18 độ.', original_price: 35000, discount_price: 18000, remaining_quantity: 12, latitude: 10.8105, longitude: 106.6505, address: '200 Trường Sơn, Tân Bình', tags: ['kem', 'trang mieng', 'tien loi'], verified: true },
    { store_name: 'Ministop Trường Sơn', title: 'Bánh flan caramel 4 hộp', description: '4 hộp bánh flan caramel, để lạnh ăn ngon hơn.', original_price: 28000, discount_price: 14000, remaining_quantity: 6, latitude: 10.8102, longitude: 106.6502, address: '200 Trường Sơn, Tân Bình', tags: ['banh', 'trang mieng', 'tien loi'], verified: false },
    { store_name: 'Circle K Nguyễn Ảnh Thủ', title: 'Nước suối Aquafina 500ml thùng 24', description: 'Thùng 24 chai nước suối Aquafina 500ml, gần date.', original_price: 72000, discount_price: 39000, remaining_quantity: 30, latitude: 10.8805, longitude: 106.5905, address: '500 Nguyễn Ảnh Thủ, Hóc Môn', tags: ['nuoc', 'uong', 'tien loi'], verified: false },
    { store_name: 'Circle K Nguyễn Ảnh Thủ', title: 'Cà phê đen đá túi 10 gói', description: '10 gói cà phê đen đá hòa tan, pha sẵn.', original_price: 45000, discount_price: 22000, remaining_quantity: 20, latitude: 10.8802, longitude: 106.5902, address: '500 Nguyễn Ảnh Thủ, Hóc Môn', tags: ['ca phe', 'uong', 'tien loi'], verified: true },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Bánh bông lan trứng muối 2 hộp', description: 'Bánh bông lan trứng muối sốt phô mai, hộp 200g.', original_price: 38000, discount_price: 17000, remaining_quantity: 7, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, Q.1', tags: ['banh_ngot', 'snack_ngot', 'do_an_nhanh', 'tiet_kiem'], verified: true },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Nước ép cam 500ml x 4', description: '4 chai nước ép cam nguyên chất 500ml, giàu vitamin C.', original_price: 52000, discount_price: 25000, remaining_quantity: 10, latitude: 10.7726, longitude: 106.7044, address: '123 Nguyễn Huệ, Q.1', tags: ['nuoc_ep', 'do_uong', 'healthy', 'suc_khoe'], verified: false },
    { store_name: 'Circle K Nguyễn Huệ', title: 'Mì xào bò hộp 300g', description: 'Mì xào thịt bò hộp, chỉ hâm microwave 2 phút.', original_price: 22000, discount_price: 10000, remaining_quantity: 12, latitude: 10.7727, longitude: 106.7043, address: '123 Nguyễn Huệ, Q.1', tags: ['mi', 'do_an_nhanh', 'tiet_kiem', 'gia_re'], verified: false },
    { store_name: 'Family Mart Lê Lợi', title: 'Bento thịt heo xào rau củ', description: 'Cơm bento thịt heo xào rau củ, đầy đủ dinh dưỡng.', original_price: 34000, discount_price: 15000, remaining_quantity: 5, latitude: 10.7714, longitude: 106.7012, address: '45 Lê Lợi, Q.1', tags: ['bento', 'com', 'do_an_nhanh', 'hang_nhat'], verified: true },
    { store_name: 'Family Mart Lê Lợi', title: 'Cơm gà teriyaki bento', description: 'Cơm gà teriyaki sốt ngọt, kèm rong biển và rau củ.', original_price: 38000, discount_price: 16000, remaining_quantity: 4, latitude: 10.7716, longitude: 106.7010, address: '45 Lê Lợi, Q.1', tags: ['bento', 'com', 'ga', 'hang_nhat'], verified: true },
    { store_name: 'Family Mart Lê Lợi', title: 'Chả cá Nhật sốt teriyaki 200g', description: 'Chả cá Nhật kamaboko sốt teriyaki, ăn liền hoặc hâm.', original_price: 28000, discount_price: 13000, remaining_quantity: 8, latitude: 10.7715, longitude: 106.7011, address: '45 Lê Lợi, Q.1', tags: ['ca', 'hang_nhat', 'do_an_nhanh', 'nhap_khau'], verified: false },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Cơm gà xối mỡ hộp', description: 'Cơm gà xối mỡ kiểu Hải Nam, hộp 400g. Ngon hơn khi hâm.', original_price: 30000, discount_price: 14000, remaining_quantity: 6, latitude: 10.7852, longitude: 106.6932, address: '88 Mạc Đĩnh Chi, Q.1', tags: ['com', 'ga', 'do_an_nhanh', 'tiet_kiem'], verified: true },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Chè đậu xanh hộp 4 cái', description: '4 hộp chè đậu xanh nước cốt dừa, tráng miệng mát lạnh.', original_price: 32000, discount_price: 15000, remaining_quantity: 9, latitude: 10.7853, longitude: 106.6933, address: '88 Mạc Đĩnh Chi, Q.1', tags: ['che', 'trang_mieng', 'snack_ngot', 'viet'], verified: false },
    { store_name: '7-Eleven Mạc Đĩnh Chi', title: 'Sữa hạt dinh dưỡng 6 hộp', description: '6 hộp sữa hạt óc chó hạnh nhân, bổ sung vitamin.', original_price: 66000, discount_price: 35000, remaining_quantity: 12, latitude: 10.7851, longitude: 106.6931, address: '88 Mạc Đĩnh Chi, Q.1', tags: ['sua', 'do_uong', 'healthy', 'suc_khoe'], verified: true },
    { store_name: 'Ministop Nguyễn Thị Minh Khai', title: 'Takoyaki hộp 6 viên', description: 'Bánh bạch tuộc takoyaki nóng sốt, hộp 6 viên. Hâm microwave.', original_price: 25000, discount_price: 12000, remaining_quantity: 8, latitude: 10.7822, longitude: 106.6992, address: '12 Nguyễn Thị Minh Khai, Q.1', tags: ['takoyaki', 'hang_nhat', 'do_an_nhanh', 'snack'], verified: true },
    { store_name: 'Ministop Nguyễn Thị Minh Khai', title: 'Bánh cá Nhật 4 cái', description: 'Bánh cá Nhật taiyaki nhân đậu đỏ, 4 cái.', original_price: 22000, discount_price: 10000, remaining_quantity: 10, latitude: 10.7821, longitude: 106.6991, address: '12 Nguyễn Thị Minh Khai, Q.1', tags: ['taiyaki', 'hang_nhat', 'trang_mieng', 'snack_ngot'], verified: false },
    { store_name: 'Ministop Nguyễn Thị Minh Khai', title: 'Mochi kem dâu 6 cái', description: 'Bánh mochi kem vị dâu tươi Nhật Bản, 6 cái.', original_price: 42000, discount_price: 22000, remaining_quantity: 6, latitude: 10.7823, longitude: 106.6993, address: '12 Nguyễn Thị Minh Khai, Q.1', tags: ['mochi', 'hang_nhat', 'trang_mieng', 'kem'], verified: true },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Bánh mì kẹp thịt nướng Hàn', description: 'Bánh mì kẹp thịt nướng BBQ sốt gochujang, rau sống.', original_price: 25000, discount_price: 11000, remaining_quantity: 7, latitude: 10.7763, longitude: 106.6963, address: '200 Hai Bà Trưng, Q.1', tags: ['banh_mi', 'hang_han', 'do_an_nhanh', 'tiet_kiem'], verified: true },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Kimbap phô mai cay 4 miếng', description: 'Kimbap Hàn Quốc nhân phô mai cay, 4 miếng gói riêng.', original_price: 20000, discount_price: 9000, remaining_quantity: 12, latitude: 10.7764, longitude: 106.6964, address: '200 Hai Bà Trưng, Q.1', tags: ['kim_bap', 'hang_han', 'do_an_nhanh', 'gia_re'], verified: true },
    { store_name: 'GS25 Hai Bà Trưng', title: 'Lẩu tokbokki gói 600g', description: 'Lẩu tokbokki Hàn Quốc gói 600g, kèm bánh gạo, sốt cay.', original_price: 38000, discount_price: 19000, remaining_quantity: 5, latitude: 10.7766, longitude: 106.6966, address: '200 Hai Bà Trưng, Q.1', tags: ['tokbokki', 'hang_han', 'do_an_nhanh', 'ca'], verified: false },
    { store_name: 'Circle K CMT8', title: 'Khoai tây lắc Hàn Quốc 5 gói', description: '5 gói khoai tây lắc Hàn Quốc vị phô mai và sốt cay.', original_price: 40000, discount_price: 19000, remaining_quantity: 20, latitude: 10.7892, longitude: 106.6752, address: '500 CMT8, Q.3', tags: ['snack', 'khoai_tay', 'hang_han', 'snack_man'], verified: false },
    { store_name: 'Circle K CMT8', title: 'Mì udon gói 3 cái', description: '3 gói mì udon Nhật Bản, nấu 3 phút, nước súp đậm đà.', original_price: 36000, discount_price: 16000, remaining_quantity: 14, latitude: 10.7891, longitude: 106.6751, address: '500 CMT8, Q.3', tags: ['mi', 'hang_nhat', 'do_an_nhanh', 'tiet_kiem'], verified: true },
    { store_name: 'Circle K CMT8', title: 'Bò khô miếng 200g', description: 'Bò khô miếng chính hiệu, gói 200g, ăn vặt bia.', original_price: 45000, discount_price: 23000, remaining_quantity: 9, latitude: 10.7893, longitude: 106.6753, address: '500 CMT8, Q.3', tags: ['bo_kho', 'snack_man', 'do_nhau', 'thit'], verified: true },
    { store_name: 'Family Mart Phan Xích Long', title: 'Bento cá thu sốt miso', description: 'Cơm bento cá thu sốt miso Nhật, rau củ tươi.', original_price: 36000, discount_price: 16000, remaining_quantity: 5, latitude: 10.7982, longitude: 106.6802, address: '360 Phan Xích Long, Phú Nhuận', tags: ['bento', 'com', 'ca', 'hang_nhat'], verified: true },
    { store_name: 'Family Mart Phan Xích Long', title: 'Gà rán Nhật 6 miếng', description: 'Gà rán Nhật karaage 6 miếng, sốt mayonnaise.', original_price: 34000, discount_price: 15000, remaining_quantity: 8, latitude: 10.7983, longitude: 106.6803, address: '360 Phan Xích Long, Phú Nhuận', tags: ['ga', 'hang_nhat', 'do_an_nhanh', 'snack_man'], verified: true },
    { store_name: 'Family Mart Phan Xích Long', title: 'Trà sữa khoai môn 2 ly', description: '2 ly trà sữa khoai môn Famima, topping trân châu.', original_price: 44000, discount_price: 20000, remaining_quantity: 7, latitude: 10.7984, longitude: 106.6804, address: '360 Phan Xích Long, Phú Nhuận', tags: ['tra_sua', 'do_uong', 'snack_ngot', 'hang_nhat'], verified: false },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Bento gà xào gừng', description: 'Cơm bento gà xào gừng kiểu Nhật, rau củ theo mùa.', original_price: 35000, discount_price: 15000, remaining_quantity: 4, latitude: 10.7302, longitude: 106.7202, address: '1 Nguyễn Văn Linh, Q.7', tags: ['bento', 'com', 'ga', 'hang_nhat'], verified: true },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Bánh mì sandwich trứng cá hồi', description: 'Sandwich tươi nhân trứng cá hồi, rau xà lách.', original_price: 28000, discount_price: 13000, remaining_quantity: 6, latitude: 10.7303, longitude: 106.7203, address: '1 Nguyễn Văn Linh, Q.7', tags: ['sandwich', 'ca', 'do_an_nhanh', 'hang_nhat'], verified: true },
    { store_name: 'Circle K CMT8', title: 'Bánh mì thịt nướng BBQ', description: 'Bánh mì thịt nướng BBQ sốt cay, rau sống ăn kèm.', original_price: 22000, discount_price: 10000, remaining_quantity: 7, latitude: 10.7894, longitude: 106.6754, address: '500 CMT8, Q.3', tags: ['banh_mi', 'do_an_nhanh', 'tiet_kiem', 'thit_nuong'], verified: false },
    { store_name: 'Family Mart Nguyễn Văn Linh', title: 'Cơm nắm rong biển nhân cá hồi', description: 'Cơm nắm rong biển nhân cá hồi sốt mayo, 2 cái.', original_price: 24000, discount_price: 11000, remaining_quantity: 9, latitude: 10.7304, longitude: 106.7204, address: '1 Nguyễn Văn Linh, Q.7', tags: ['com', 'nhat', 'bento'], verified: true },
    { store_name: 'Family Mart Lê Lợi', title: 'Bento gà xào gừng', description: 'Cơm bento gà xào gừng kiểu Nhật, rau củ tươi.', original_price: 32000, discount_price: 14000, remaining_quantity: 5, latitude: 10.7719, longitude: 106.7014, address: '45 Lê Lợi, Q.1', tags: ['bento', 'com', 'ga', 'hang_nhat'], verified: true },
  ]

  const adminId = emailToId.get('admin@foodly.app')
  const binhId = emailToId.get('binh@foodly.app')
  const verifiedById = adminId || binhId

  const dealInserts = dealRecords.map(d => {
    const storeId = storeNameToId.get(d.store_name)
    return {
      user_id: adminId,
      store_id: storeId,
      title: d.title,
      description: d.description,
      original_price: d.original_price,
      discount_price: d.discount_price,
      original_quantity: d.remaining_quantity,
      remaining_quantity: d.remaining_quantity,
      latitude: d.latitude,
      longitude: d.longitude,
      address: d.address,
      tags: d.tags,
      status: 'active',
      like_count: Math.floor(Math.random() * 15),
      bookmark_count: Math.floor(Math.random() * 5),
      verified: d.verified,
      verified_by_id: d.verified ? verifiedById : null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  })

  const { data: deals, error: dealErr } = await supabase
    .from('deals')
    .insert(dealInserts)
    .select()

  if (dealErr) { console.error('Failed to seed deals:', dealErr.message); process.exit(1) }
  console.log(`  Created ${deals.length} deals`)

  // ── Verification events for verified deals ──
  console.log('\nSeeding verification events...')
  const verifiedDeals = deals.filter(d => dealRecords.find(s => s.title === d.title && s.verified))

  if (verifiedDeals.length > 0 && verifiedById) {
    const verRecords = verifiedDeals.map(d => ({
      deal_id: d.id,
      moderator_id: verifiedById,
      action: 'verified',
      notes: 'Auto-verified by seed script',
    }))

    const { error: verErr } = await supabase.from('verification_events').insert(verRecords)
    if (verErr) { console.error('Failed to seed verifications:', verErr.message) }
    else console.log(`  Created ${verRecords.length} verification events`)
  }

  // ── Comments ──
  console.log('\nSeeding comments...')
  const commentTexts = [
    'Sản phẩm chất lượng, đáng mua!',
    'Giá tốt, sẽ ủng hộ tiếp.',
    'Đã mua và dùng thử, rất ok.',
    'Hàng tươi ngon, đóng gói cẩn thận.',
    'Ngon, bổ, rẻ!',
  ]

  const commentRecords: any[] = []
  for (const deal of deals.slice(0, 30)) {
    const numComments = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numComments; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]
      commentRecords.push({
        deal_id: deal.id,
        user_id: randomUser.id,
        content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
        status: 'active',
      })
    }
  }

  if (commentRecords.length > 0) {
    const { error: commentErr } = await supabase.from('comments').insert(commentRecords)
    if (commentErr) { console.error('Failed to seed comments:', commentErr.message) }
    else console.log(`  Created ${commentRecords.length} comments`)
  }

  // ── Summary ──
  console.log('\n✅ Seed complete!')
  console.log(`  Users: ${users.length}`)
  console.log(`  Stores: ${stores.length}`)
  console.log(`  Deals: ${deals.length}`)
  console.log(`  Verification Events: ${verifiedDeals.length}`)
  console.log(`  Comments: ${commentRecords.length}`)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
