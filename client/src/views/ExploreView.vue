<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { getSocket } from '../services/socket/socket'
import { dealsService } from '../services/api'
import type { Deal } from '../types'
import { formatVND } from '../utils/currency'

type TravelMode = 'walking' | 'driving' | 'cycling'

const mapContainer = ref<HTMLDivElement | null>(null)
const map = ref<any>(null)
const userMarker = ref<any>(null)
const markerClusterGroup = ref<any>(null)
const deals = ref<Deal[]>([])
const selectedDeal = ref<Deal | null>(null)
const isLoading = ref(true)
const isLocating = ref(false)
const isRouting = ref(false)
const error = ref('')
const searchQuery = ref('')
const activeFilter = ref<'all' | 'nearby' | 'available' | 'verified'>('all')
const routeMode = ref<TravelMode>('walking')
const routeInfo = ref<{ distanceKm: number; durationMin: number } | null>(null)
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const routeLine = ref<any>(null)
const showLocationPrompt = ref(true)
const useMockData = ref(false)
let searchTimer: number | undefined

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
  'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
]

function mockDeal(overrides: Partial<Deal>): Deal {
  return {
    id: crypto.randomUUID(),
    userId: 'mock',
    title: 'Ưu đãi',
    originalPrice: 30000,
    discountPrice: 15000,
    currency: 'VND',
    remainingQuantity: 10,
    originalQuantity: 20,
    status: 'active',
    verified: false,
    latitude: 10.8231,
    longitude: 106.6297,
    images: [FOOD_IMAGES[Math.floor(Math.random() * FOOD_IMAGES.length)]],
    tags: ['tien loi'],
    version: 1,
    likeCount: 5,
    bookmarkCount: 2,
    commentCount: 1,
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

const mockDealsData: Deal[] = [
  // ===== Quận 1 (CBD) =====
  mockDeal({ title: 'Cơm gà sốt Thái gói', description: 'Cơm gà sốt Thái gói tiện lợi, hâm nóng 2 phút', originalPrice: 25000, discountPrice: 10000, remainingQuantity: 8, latitude: 10.7725, longitude: 106.7042, address: '123 Nguyễn Huệ, Q.1', tags: ['com', 'ga'], verified: true, likeCount: 23 }),
  mockDeal({ title: 'Bánh mì gà cay Hàn Quốc', description: 'Bánh mì kẹp gà sốt cay Hàn Quốc, giảm 60%', originalPrice: 22000, discountPrice: 9000, remainingQuantity: 5, latitude: 10.7728, longitude: 106.7020, address: '45 Lê Lợi, Q.1', tags: ['banh mi', 'ga'], verified: true, likeCount: 15 }),
  mockDeal({ title: 'Mì cốc bò cay x 3', description: '3 mì cốc bò hải sản gần hết hạn', originalPrice: 30000, discountPrice: 12000, remainingQuantity: 15, latitude: 10.7740, longitude: 106.7005, address: '88 Mạc Đĩnh Chi, Q.1', tags: ['mi'], verified: false, likeCount: 8 }),
  mockDeal({ title: 'Cơm bento cá hồi teriyaki', description: 'Cơm bento cá hồi nướng sốt teriyaki, rau củ tươi', originalPrice: 35000, discountPrice: 15000, remainingQuantity: 4, latitude: 10.7715, longitude: 106.7010, address: '45 Lê Lợi, Q.1', tags: ['com', 'ca'], verified: true, likeCount: 31 }),
  mockDeal({ title: 'Trà sữa matcha đá xay 2 ly', description: 'Trà sữa matcha đá xay, hạn dùng hôm nay', originalPrice: 36000, discountPrice: 14000, remainingQuantity: 6, latitude: 10.7735, longitude: 106.6980, address: '200 Hai Bà Trưng, Q.1', tags: ['tra sua', 'uong'], verified: false, likeCount: 12 }),
  mockDeal({ title: 'Cơm cuộn kimbap bò', description: 'Cơm cuộn kimbap nhân thịt bò, 4 miếng', originalPrice: 18000, discountPrice: 7000, remainingQuantity: 9, latitude: 10.7770, longitude: 106.6950, address: '12 Nguyễn Thị Minh Khai, Q.1', tags: ['com', 'kim bap'], verified: true, likeCount: 19 }),
  mockDeal({ title: 'Bia lon Tiger 6 lon', description: '6 lon bia Tiger 330ml, xả kho gần date', originalPrice: 90000, discountPrice: 45000, remainingQuantity: 12, latitude: 10.7750, longitude: 106.6965, address: '200 Hai Bà Trưng, Q.1', tags: ['bia', 'uong'], verified: false, likeCount: 7 }),

  // ===== Quận 3 =====
  mockDeal({ title: 'Xúc xích túi 5 cái', description: 'Xúc xích heo túi 5 cái, luộc/chảo', originalPrice: 25000, discountPrice: 10000, remainingQuantity: 11, latitude: 10.7890, longitude: 106.6750, address: '500 CMT8, Q.3', tags: ['xuc xich', 'snack'], verified: true, likeCount: 14 }),
  mockDeal({ title: 'Bánh chuối socola 2 cái', description: 'Bánh chuối nướng socola, nướng tại cửa hàng', originalPrice: 18000, discountPrice: 7000, remainingQuantity: 6, latitude: 10.7885, longitude: 106.6770, address: '500 CMT8, Q.3', tags: ['banh', 'snack'], verified: false, likeCount: 9 }),
  mockDeal({ title: 'Bánh tráng muối ớt 200g', description: 'Bánh tráng muối ớt, đặc sản Việt', originalPrice: 10000, discountPrice: 4000, remainingQuantity: 15, latitude: 10.7870, longitude: 106.6800, address: '25 Lê Văn Sỹ, Q.3', tags: ['banh trang', 'snack'], verified: false, likeCount: 6 }),
  mockDeal({ title: 'Cơm tấm sườn bì chả', description: 'Cơm tấm sườn bì chả trứng, quán ăn sáng nổi tiếng', originalPrice: 35000, discountPrice: 25000, remainingQuantity: 3, latitude: 10.7900, longitude: 106.6820, address: '123 Nguyễn Đình Chiểu, Q.3', tags: ['com tam', 'viet'], verified: true, likeCount: 42 }),
  mockDeal({ title: 'Bánh mì chảo ốp la', description: 'Bánh mì chảo ốp la pate, đồ ăn sáng', originalPrice: 25000, discountPrice: 15000, remainingQuantity: 7, latitude: 10.7860, longitude: 106.6700, address: '456 CMT8, Q.3', tags: ['banh mi', 'sang'], verified: true, likeCount: 28 }),

  // ===== Quận 7 =====
  mockDeal({ title: 'Bento gà chiên sốt ngọt', description: 'Cơm bento gà chiên sốt ngọt Hàn Quốc', originalPrice: 33000, discountPrice: 14000, remainingQuantity: 5, latitude: 10.7300, longitude: 106.7200, address: '1 Nguyễn Văn Linh, Q.7', tags: ['com', 'ga'], verified: true, likeCount: 21 }),
  mockDeal({ title: 'Sữa chua uống 6 chai', description: '6 chai sữa chua uống Yakult-style', originalPrice: 30000, discountPrice: 12000, remainingQuantity: 16, latitude: 10.7320, longitude: 106.7180, address: '1 Nguyễn Văn Linh, Q.7', tags: ['sua chua', 'uong'], verified: true, likeCount: 11 }),
  mockDeal({ title: 'Bánh bông lan cuộn kem', description: 'Bánh bông lan cuộn kem tươi, 4 miếng', originalPrice: 22000, discountPrice: 9000, remainingQuantity: 6, latitude: 10.7280, longitude: 106.7220, address: '50 Nguyễn Lương Bằng, Q.7', tags: ['banh', 'trang mieng'], verified: false, likeCount: 5 }),
  mockDeal({ title: 'Lẩu thái hải sản', description: 'Lẩu thái hải sản tươi, phục vụ 2 người', originalPrice: 199000, discountPrice: 129000, remainingQuantity: 2, latitude: 10.7350, longitude: 106.7150, address: '789 Nguyễn Văn Linh, Q.7', tags: ['lau', 'hai san'], verified: true, likeCount: 56 }),
  mockDeal({ title: 'Bún bò Huế đặc biệt', description: 'Bún bò Huế đặc biệt, giò heo, chả cua', originalPrice: 45000, discountPrice: 35000, remainingQuantity: 4, latitude: 10.7250, longitude: 106.7250, address: '123 Lâm Văn Bền, Q.7', tags: ['bun bo', 'viet'], verified: true, likeCount: 35 }),

  // ===== Bình Thạnh =====
  mockDeal({ title: 'Bánh tráng trộn gói 200g', description: 'Bánh tráng trộn sẵn, đồ ăn vặt hot', originalPrice: 12000, discountPrice: 5000, remainingQuantity: 13, latitude: 10.8020, longitude: 106.7120, address: '50 XVNT, Bình Thạnh', tags: ['banh trang', 'snack'], verified: false, likeCount: 8 }),
  mockDeal({ title: 'Bò khô túi 100g', description: 'Bò khô miếng, ăn vặt bia rất ngon', originalPrice: 35000, discountPrice: 18000, remainingQuantity: 7, latitude: 10.8040, longitude: 106.7100, address: '50 XVNT, Bình Thạnh', tags: ['bo kho', 'snack'], verified: true, likeCount: 17 }),
  mockDeal({ title: 'Phở bò tái nạm', description: 'Phở bò tái nạm gầu, nước dùng xương 12 tiếng', originalPrice: 50000, discountPrice: 40000, remainingQuantity: 3, latitude: 10.8080, longitude: 106.7070, address: '99 Phạm Viết Chánh, Bình Thạnh', tags: ['pho', 'viet'], verified: true, likeCount: 67 }),

  // ===== Phú Nhuận =====
  mockDeal({ title: 'Bento sườn non kho tàu', description: 'Cơm bento sườn non kho tàu, trứng cút', originalPrice: 32000, discountPrice: 14000, remainingQuantity: 6, latitude: 10.7980, longitude: 106.6800, address: '360 Phan Xích Long, Phú Nhuận', tags: ['com', 'suon'], verified: true, likeCount: 25 }),
  mockDeal({ title: 'Chả giò rế 10 cái', description: 'Chả giò rế nhân thịt heo, để được 2 ngày', originalPrice: 30000, discountPrice: 12000, remainingQuantity: 7, latitude: 10.7960, longitude: 106.6780, address: '360 Phan Xích Long, Phú Nhuận', tags: ['cha gio', 'viet'], verified: true, likeCount: 13 }),
  mockDeal({ title: 'Bánh canh cua', description: 'Bánh canh cua thịt, nước dùng ngọt thanh', originalPrice: 40000, discountPrice: 30000, remainingQuantity: 2, latitude: 10.8000, longitude: 106.6750, address: '100 Nguyễn Văn Trỗi, Phú Nhuận', tags: ['banh canh', 'viet'], verified: true, likeCount: 33 }),

  // ===== Gò Vấp =====
  mockDeal({ title: 'Cơm chiên dương châu gói', description: 'Cơm chiên dương châu gói 300g, hâm nhanh', originalPrice: 20000, discountPrice: 8000, remainingQuantity: 9, latitude: 10.8300, longitude: 106.6750, address: '80 Nguyễn Oanh, Gò Vấp', tags: ['com', 'chien'], verified: false, likeCount: 6 }),
  mockDeal({ title: 'Snack que Hàn Quốc 5 gói', description: '5 gói snack que Hàn vị phô mai, xả kho', originalPrice: 35000, discountPrice: 15000, remainingQuantity: 20, latitude: 10.8320, longitude: 106.6780, address: '80 Nguyễn Oanh, Gò Vấp', tags: ['snack', 'han'], verified: false, likeCount: 4 }),
  mockDeal({ title: 'Bánh mì thịt nướng', description: 'Bánh mì thịt nướng than củi, rau sống tươi', originalPrice: 20000, discountPrice: 12000, remainingQuantity: 5, latitude: 10.8350, longitude: 106.6700, address: '200 Quang Trung, Gò Vấp', tags: ['banh mi', 'thit nuong'], verified: true, likeCount: 44 }),

  // ===== Tân Bình =====
  mockDeal({ title: 'Bánh mì que pate 3 cái', description: 'Bánh mì que pate, ăn sáng nhanh gọn', originalPrice: 15000, discountPrice: 6000, remainingQuantity: 12, latitude: 10.8100, longitude: 106.6500, address: '200 Trường Sơn, Tân Bình', tags: ['banh mi', 'sang'], verified: true, likeCount: 16 }),
  mockDeal({ title: 'Nước suối thùng 24 chai', description: 'Thùng 24 chai nước suối 500ml, giảm 40%', originalPrice: 60000, discountPrice: 36000, remainingQuantity: 30, latitude: 10.8120, longitude: 106.6480, address: '200 Trường Sơn, Tân Bình', tags: ['nuoc', 'uong'], verified: false, likeCount: 3 }),
  mockDeal({ title: 'Bánh xèo tôm thịt', description: 'Bánh xèo giòn tôm thịt giá đỗ, ăn kèm rau sống', originalPrice: 25000, discountPrice: 15000, remainingQuantity: 4, latitude: 10.8150, longitude: 106.6450, address: '50 Cộng Hòa, Tân Bình', tags: ['banh xeo', 'viet'], verified: true, likeCount: 38 }),

  // ===== Thủ Đức =====
  mockDeal({ title: 'Pizza gà mini hộp', description: 'Pizza gà mini, hâm microwave 2 phút', originalPrice: 28000, discountPrice: 12000, remainingQuantity: 6, latitude: 10.8450, longitude: 106.7650, address: '100 Phạm Văn Đồng, Thủ Đức', tags: ['pizza', 'snack'], verified: true, likeCount: 10 }),
  mockDeal({ title: 'Trà ô long không đường 6 chai', description: '6 chai trà ô long không đường 500ml', originalPrice: 42000, discountPrice: 18000, remainingQuantity: 12, latitude: 10.8470, longitude: 106.7620, address: '100 Phạm Văn Đồng, Thủ Đức', tags: ['tra', 'uong'], verified: false, likeCount: 5 }),
  mockDeal({ title: 'Bún thịt nướng nem', description: 'Bún thịt nướng nem chua, nước mắm chua ngọt', originalPrice: 30000, discountPrice: 22000, remainingQuantity: 5, latitude: 10.8500, longitude: 106.7580, address: '200 Võ Văn Ngân, Thủ Đức', tags: ['bun', 'thit nuong'], verified: true, likeCount: 29 }),

  // ===== Tân Phú =====
  mockDeal({ title: 'Tokbokki gói 500g', description: 'Tokbokki bánh gạo sốt cay Hàn Quốc', originalPrice: 28000, discountPrice: 12000, remainingQuantity: 8, latitude: 10.7800, longitude: 106.6250, address: '150 Lũy Bán Bích, Tân Phú', tags: ['tokbokki', 'han'], verified: false, likeCount: 7 }),
  mockDeal({ title: 'Bánh gạo Hàn Quốc 3 gói', description: '3 gói bánh gạo Hàn vị rong biển', originalPrice: 15000, discountPrice: 6000, remainingQuantity: 18, latitude: 10.7820, longitude: 106.6280, address: '150 Lũy Bán Bích, Tân Phú', tags: ['banh gao', 'snack'], verified: true, likeCount: 9 }),

  // ===== Quận 10 =====
  mockDeal({ title: 'Mỳ cay 7 cấp độ', description: 'Mỳ cay Hàn Quốc 7 cấp độ, thử thách vị giác', originalPrice: 45000, discountPrice: 35000, remainingQuantity: 4, latitude: 10.7750, longitude: 106.6650, address: '123 Sư Vạn Hạnh, Q.10', tags: ['mi', 'han'], verified: true, likeCount: 52 }),
  mockDeal({ title: 'Nước ép trái cây tươi', description: 'Nước ép cam/cà rốt/dưa hấu tươi 500ml', originalPrice: 25000, discountPrice: 15000, remainingQuantity: 10, latitude: 10.7780, longitude: 106.6680, address: '300 Ngô Gia Tự, Q.10', tags: ['nuoc ep', 'uong'], verified: true, likeCount: 18 }),

  // ===== Quận 5 =====
  mockDeal({ title: 'Hủ tiếu Nam Vang', description: 'Hủ tiếu Nam Vang tôm thịt, nước dùng xương', originalPrice: 35000, discountPrice: 25000, remainingQuantity: 6, latitude: 10.7550, longitude: 106.6680, address: '50 Hải Thượng Lãn Ông, Q.5', tags: ['hu tieu', 'viet'], verified: true, likeCount: 41 }),
  mockDeal({ title: 'Chè 3 màu', description: 'Chè 3 màu đậu xanh, đậu đỏ, thạch dừa', originalPrice: 12000, discountPrice: 8000, remainingQuantity: 8, latitude: 10.7580, longitude: 106.6650, address: '100 Nguyễn Trãi, Q.5', tags: ['che', 'ngot'], verified: false, likeCount: 22 }),

  // ===== Quận 4 =====
  mockDeal({ title: 'Ốc len xào dừa', description: 'Ốc len xào dừa, nước cốt dừa béo ngậy', originalPrice: 45000, discountPrice: 35000, remainingQuantity: 3, latitude: 10.7650, longitude: 106.7050, address: '200 Tôn Đản, Q.4', tags: ['oc', 'viet'], verified: true, likeCount: 48 }),
  mockDeal({ title: 'Bánh mì chấm sữa', description: 'Bánh mì chấm sữa đặc, đồ ăn vặt tuổi thơ', originalPrice: 8000, discountPrice: 4000, remainingQuantity: 20, latitude: 10.7620, longitude: 106.7020, address: '50 Khánh Hội, Q.4', tags: ['banh mi', 'snack'], verified: false, likeCount: 11 }),

  // ===== Bình Tân =====
  mockDeal({ title: 'Cháo lòng đặc biệt', description: 'Cháo lòng tiết canh, lòng non, dồi, huyết', originalPrice: 30000, discountPrice: 20000, remainingQuantity: 5, latitude: 10.7600, longitude: 106.6000, address: '300 Hậu Giang, Bình Tân', tags: ['chao long', 'viet'], verified: true, likeCount: 26 }),
  mockDeal({ title: 'Cơm tấm bì sườn ổ', description: 'Cơm tấm bì sườn ổ trứng, sốt mỡ hành', originalPrice: 30000, discountPrice: 20000, remainingQuantity: 4, latitude: 10.7550, longitude: 106.6100, address: '100 Tên Lửa, Bình Tân', tags: ['com tam', 'viet'], verified: true, likeCount: 34 }),

  // ===== Hóc Môn (xa trung tâm) =====
  mockDeal({ title: 'Mì tôm Hảo Hảo thùng 30', description: 'Thùng 30 gói mì tôm Hảo Hảo chua cay', originalPrice: 105000, discountPrice: 45000, remainingQuantity: 40, latitude: 10.8800, longitude: 106.5900, address: '500 Nguyễn Ảnh Thủ, Hóc Môn', tags: ['mi tom', 'viet'], verified: true, likeCount: 12 }),
  mockDeal({ title: 'Gà rán 6 miếng', description: 'Gà rán giòn 6 miếng + khoai tây chiên + nước ngọt', originalPrice: 149000, discountPrice: 99000, remainingQuantity: 3, latitude: 10.8750, longitude: 106.5950, address: '400 Nguyễn Ảnh Thủ, Hóc Môn', tags: ['ga ran', 'fast food'], verified: true, likeCount: 33 }),

  // ===== Quận 11 =====
  mockDeal({ title: 'Bánh bao chay 5 cái', description: '5 bánh bao chay nấm hương, miến, trứng muối', originalPrice: 25000, discountPrice: 15000, remainingQuantity: 10, latitude: 10.7620, longitude: 106.6480, address: '200 Lãnh Binh Thăng, Q.11', tags: ['banh bao', 'chay'], verified: false, likeCount: 7 }),
  mockDeal({ title: 'Chuối chiên bột', description: 'Chuối chiên bột dừa, còn nóng hổi', originalPrice: 8000, discountPrice: 3000, remainingQuantity: 15, latitude: 10.7650, longitude: 106.6450, address: '50 Thuận Kiều, Q.11', tags: ['chuoi chien', 'snack'], verified: false, likeCount: 14 }),
]

const filteredDeals = computed(() => {
  let result = [...deals.value]
  if (activeFilter.value === 'available') result = result.filter(deal => deal.remainingQuantity > 0)
  if (activeFilter.value === 'verified') result = result.filter(deal => deal.verified)
  if (activeFilter.value === 'nearby' && userLocation.value) {
    result = (result
      .map(deal => ({ ...deal, distanceKm: distanceKm(userLocation.value!.lat, userLocation.value!.lng, Number(deal.latitude), Number(deal.longitude)) })) as any[])
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }
  return result
})

onMounted(async () => {
  await loadDeals()
  await nextTick(initMap)

  const socket = getSocket()
  socket.on('deal:created', (deal: Deal) => {
    deals.value = [deal, ...deals.value]
    updateDealMarkers()
  })
  socket.on('deal:quantity', (payload: { id: string; remaining: number }) => {
    const deal = deals.value.find(item => item.id === payload.id)
    if (deal) deal.remainingQuantity = payload.remaining
  })
})

onUnmounted(() => {
  if (searchTimer) window.clearTimeout(searchTimer)
  getSocket().off('deal:created')
  getSocket().off('deal:quantity')
  map.value?.remove()
})

watch([searchQuery, activeFilter], () => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(loadDeals, 250)
})

watch(filteredDeals, () => updateDealMarkers())

async function loadDeals() {
  isLoading.value = true
  error.value = ''
  try {
    const params: Record<string, string | number | boolean> = { status: 'active', limit: 100 }
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    if (activeFilter.value === 'verified') params.verified = 'true'
    if (activeFilter.value === 'nearby' && userLocation.value) {
      params.lat = userLocation.value.lat
      params.lng = userLocation.value.lng
      params.radius = 8
    }
    const result = await dealsService.findAll(params)
    const apiDeals = result.deals || []
    if (apiDeals.length > 0) {
      deals.value = apiDeals
      useMockData.value = false
    } else {
      deals.value = mockDealsData
      useMockData.value = true
    }
  } catch (err: any) {
    deals.value = mockDealsData
    useMockData.value = true
  } finally {
    isLoading.value = false
  }
}

function initMap() {
  if (!mapContainer.value || map.value) return
  map.value = L.map(mapContainer.value, {
    center: [10.8231, 106.6297],
    zoom: 13,
    zoomControl: false,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map.value)

  L.control.zoom({ position: 'topright' }).addTo(map.value)

  markerClusterGroup.value = (L as any).markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 46,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount()
      let bg = '#9ae6b4'
      let size = 36
      if (count >= 30) { bg = '#047857'; size = 56 }
      else if (count >= 10) { bg = '#10b981'; size = 48 }
      return L.divIcon({
        html: `<div style="background:${bg};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#10381f;font-weight:700;font-size:12px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.15)">${count}</div>`,
        className: '',
        iconSize: L.point(size, size),
      })
    },
  })

  map.value.addLayer(markerClusterGroup.value)
  addDealMarkers()
}

const markerMap = new Map<string, any>()
let lastSelectedMarkerId: string | null = null

function createPinIcon(deal: Deal, isSelected = false) {
  const color = deal.verified ? '#10b981' : '#f59e0b'
  const cls = `map-pin${isSelected ? ' map-pin-selected' : ''}`
  const dotCls = `map-pin-dot${isSelected ? ' map-pin-dot-selected' : ''}`
  const priceBg = isSelected ? '#059669' : 'white'
  const priceColor = isSelected ? 'white' : '#1a1a2e'
  return L.divIcon({
    html: `<div class="${cls}" style="--pin-color:${isSelected ? '#059669' : color}">
      <span class="map-pin-price" style="background:${priceBg};color:${priceColor};${isSelected ? 'box-shadow:0 0 12px rgba(5,150,105,0.5)' : ''}">${formatVND(Number(deal.discountPrice))}</span>
      <span class="${dotCls}"></span>
    </div>`,
    className: '',
    iconSize: L.point(80, 38),
    iconAnchor: L.point(40, 38),
  })
}

function addDealMarkers() {
  if (!markerClusterGroup.value) return
  markerClusterGroup.value.clearLayers()
  markerMap.clear()
  lastSelectedMarkerId = null

  const dealsToShow = userLocation.value
    ? [...filteredDeals.value].sort((a, b) => {
        const dA = distanceKm(userLocation.value!.lat, userLocation.value!.lng, Number(a.latitude), Number(a.longitude))
        const dB = distanceKm(userLocation.value!.lat, userLocation.value!.lng, Number(b.latitude), Number(b.longitude))
        return dA - dB
      })
    : filteredDeals.value

  dealsToShow.slice(0, 80).forEach(deal => {
    const isSelected = selectedDeal.value?.id === deal.id
    const marker = L.marker([Number(deal.latitude), Number(deal.longitude)], {
      icon: createPinIcon(deal, isSelected),
    })

    if (isSelected) marker.setZIndexOffset(10000)

    marker.on('click', () => {
      selectDeal(deal)
    })

    markerMap.set(deal.id, marker)
    markerClusterGroup.value.addLayer(marker)
  })
}

function updateDealMarkers() {
  if (!markerClusterGroup.value) return

  const prevId = lastSelectedMarkerId
  const newId = selectedDeal.value?.id

  if (prevId === newId) return

  if (prevId && markerMap.has(prevId)) {
    const prev = markerMap.get(prevId)
    const deal = deals.value.find(d => d.id === prevId) || mockDealsData.find(d => d.id === prevId)
    if (deal) {
      prev.setZIndexOffset(0)
      prev.setIcon(createPinIcon(deal, false))
    }
  }

  if (newId && markerMap.has(newId)) {
    const next = markerMap.get(newId)
    const deal = deals.value.find(d => d.id === newId) || mockDealsData.find(d => d.id === newId)
    if (deal) {
      next.setZIndexOffset(10000)
      next.setIcon(createPinIcon(deal, true))
    }
  } else if (newId) {
    addDealMarkers()
    return
  }

  lastSelectedMarkerId = newId
}

async function locateUser() {
  isLocating.value = true
  error.value = ''
  try {
    if (!navigator.geolocation) {
      error.value = 'Trình duyệt không hỗ trợ định vị. Hãy dùng "Dùng vị trí mặc định" để demo.'
      return
    }
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 })
    })
    userLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
    showLocationPrompt.value = false
    drawUserMarker()
    map.value?.setView([userLocation.value.lat, userLocation.value.lng], 14)
    if (activeFilter.value === 'nearby') await loadDeals()
  } catch {
    error.value = 'Không thể lấy vị trí GPS. Kiểm tra quyền trình duyệt hoặc dùng "Dùng vị trí mặc định" để demo.'
  } finally {
    isLocating.value = false
  }
}

function drawUserMarker() {
  if (!map.value || !userLocation.value) return
  if (userMarker.value) map.value.removeLayer(userMarker.value)
  userMarker.value = L.marker([userLocation.value.lat, userLocation.value.lng], {
    icon: L.divIcon({
      html: `<div class="user-marker-pin"><div class="user-marker-inner"></div></div>`,
      className: '',
      iconSize: L.point(28, 28),
      iconAnchor: L.point(14, 14),
    }),
    zIndexOffset: 10000,
  })
  userMarker.value.bindPopup('Vị trí của bạn').openPopup()
  userMarker.value.addTo(map.value)
}

async function selectDeal(deal: Deal) {
  selectedDeal.value = deal
  routeInfo.value = null
  map.value?.setView([Number(deal.latitude), Number(deal.longitude)], 15)
  updateDealMarkers()
}

function deselectDeal() {
  if (lastSelectedMarkerId && markerMap.has(lastSelectedMarkerId)) {
    const prev = markerMap.get(lastSelectedMarkerId)
    const deal = deals.value.find(d => d.id === lastSelectedMarkerId) || mockDealsData.find(d => d.id === lastSelectedMarkerId)
    if (deal) {
      prev.setZIndexOffset(0)
      prev.setIcon(createPinIcon(deal, false))
    }
  }
  lastSelectedMarkerId = null
  selectedDeal.value = null
  routeInfo.value = null
}

async function buildRoute() {
  if (!selectedDeal.value) return
  if (!userLocation.value) await locateUser()
  if (!userLocation.value) return

  isRouting.value = true
  error.value = ''
  try {
    const origin = `${userLocation.value.lng},${userLocation.value.lat}`
    const destination = `${selectedDeal.value.longitude},${selectedDeal.value.latitude}`
    const profile = routeMode.value === 'walking' ? 'foot' : routeMode.value === 'cycling' ? 'cycling' : 'driving'
    const url = `https://router.project-osrm.org/route/v1/${profile}/${origin};${destination}?geometries=geojson&overview=full&steps=false`
    const response = await fetch(url)
    const data = await response.json()
    const route = data.routes?.[0]
    if (!route) throw new Error('No route found')
    routeInfo.value = { distanceKm: route.distance / 1000, durationMin: route.duration / 60 }
    drawRoute(route.geometry)
  } catch {
    error.value = 'Could not calculate the route with OSRM. Showing straight-line distance.'
    if (userLocation.value && selectedDeal.value) {
      const dist = distanceKm(userLocation.value.lat, userLocation.value.lng, Number(selectedDeal.value.latitude), Number(selectedDeal.value.longitude))
      routeInfo.value = { distanceKm: dist, durationMin: 0 }
    }
  } finally {
    isRouting.value = false
  }
}

function drawRoute(geometry: any) {
  if (!map.value) return
  if (routeLine.value) map.value.removeLayer(routeLine.value)
  const coords = geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])
  routeLine.value = L.polyline(coords, {
    color: '#0f766e',
    weight: 5,
    opacity: 0.85,
  }).addTo(map.value)
  map.value.fitBounds(routeLine.value.getBounds().pad(0.1))
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(value?: number) {
  if (value === undefined || value === null) return 'Unknown distance'
  return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`
}

function handleAllowLocation() {
  locateUser()
}

function handleSkipLocation() {
  showLocationPrompt.value = false
  userLocation.value = { lat: 10.8231, lng: 106.6297 }
  drawUserMarker()
  map.value?.setView([userLocation.value.lat, userLocation.value.lng], 13)
}

function formatDuration(value?: number) {
  if (!value) return 'Route preview'
  return `${Math.round(value)} min`
}
</script>

<template>
  <div class="explore-page">
    <div class="explore-toolbar">
      <div class="toolbar-inner">
        <div class="search-wrapper">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" type="search" class="toolbar-search" placeholder="Tìm món ăn, quán, địa điểm..." />
        </div>
        <div class="filter-chips">
          <button class="chip" :class="{ 'chip-active': activeFilter === 'all' }" @click="activeFilter = 'all'">All</button>
          <button class="chip" :class="{ 'chip-active': activeFilter === 'nearby' }" @click="activeFilter = 'nearby'; locateUser()">Near Me</button>
          <button class="chip" :class="{ 'chip-active': activeFilter === 'available' }" @click="activeFilter = 'available'">Available</button>
          <button class="chip" :class="{ 'chip-active': activeFilter === 'verified' }" @click="activeFilter = 'verified'">Verified</button>
        </div>
        <button class="btn btn-primary btn-sm" :disabled="isLocating" @click="locateUser">
          {{ isLocating ? 'Locating...' : 'Use My Location' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="map-alert" role="alert">{{ error }}</div>

    <div v-if="showLocationPrompt" class="location-overlay">
      <div class="location-dialog">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <h3>Cho phép lấy vị trí của bạn?</h3>
        <p>Foodly sẽ sử dụng vị trí để tìm các deal ưu đãi gần bạn nhất.</p>
        <div v-if="error" class="location-error">{{ error }}</div>
        <div class="location-actions">
          <button class="btn btn-primary" @click="handleAllowLocation">
            {{ isLocating ? 'Đang lấy vị trí...' : 'Cho phép' }}
          </button>
          <button class="btn btn-outline" @click="handleSkipLocation">
            Dùng vị trí mặc định
          </button>
        </div>
      </div>
    </div>

    <div class="explore-layout">
      <aside class="explore-sidebar">
        <div v-if="isLoading" class="sidebar-loading">
          <div v-for="n in 4" :key="n" class="skeleton sidebar-skeleton"></div>
        </div>
        <div v-else-if="filteredDeals.length === 0" class="empty-state">
          <h3>No deals found</h3>
          <p>Try adjusting your filters or search.</p>
        </div>
        <div v-else class="sidebar-list">
          <div class="sidebar-count">{{ filteredDeals.length }} deals near you</div>
          <div
            v-for="deal in filteredDeals"
            :key="deal.id"
            class="sidebar-card"
            :class="{ 'sidebar-card-active': selectedDeal?.id === deal.id }"
            @click="selectDeal(deal)"
          >
            <div class="sidebar-card-img">
              <img :src="deal.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'" :alt="deal.title" loading="lazy" />
            </div>
            <div class="sidebar-card-body">
              <div class="sidebar-card-top">
                <span class="sidebar-store">{{ deal.store?.name || 'Store' }}</span>
                <span v-if="deal.verified" class="badge badge-green">Verified</span>
                <span v-else-if="deal.remainingQuantity <= 3" class="badge badge-amber">Sắp hết</span>
              </div>
              <h4 class="sidebar-card-title">{{ deal.title }}</h4>
              <div class="sidebar-card-meta">
                <span class="sidebar-price">{{ formatVND(Number(deal.discountPrice)) }}</span>
                <span class="sidebar-original-price">{{ formatVND(Number(deal.originalPrice)) }}</span>
                <span v-if="userLocation" class="sidebar-distance">
                  {{ formatDistance(distanceKm(userLocation.lat, userLocation.lng, Number(deal.latitude), Number(deal.longitude))) }}
                </span>
              </div>
              <div class="sidebar-card-footer">
                <span class="sidebar-stock" :class="{ 'stock-low': deal.remainingQuantity <= 3 }">
                  {{ deal.remainingQuantity }} left
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="map-section" aria-label="Deal map">
        <div ref="mapContainer" class="map-canvas"></div>

        <div v-if="selectedDeal" class="map-info-window">
          <button class="info-close" @click="deselectDeal" aria-label="Close">&times;</button>
          <div class="info-header">
            <span class="info-badge">{{ selectedDeal.verified ? 'Verified' : 'Community' }}</span>
            <h4>{{ selectedDeal.title }}</h4>
          </div>
          <div class="info-row">
            <span class="info-label">Price</span>
            <span><strong>{{ formatVND(Number(selectedDeal.discountPrice)) }}</strong> <s>{{ formatVND(Number(selectedDeal.originalPrice)) }}</s></span>
          </div>
          <div class="info-row">
            <span class="info-label">Store</span>
            <span>{{ selectedDeal.store?.name || 'Community store' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Stock</span>
            <span>{{ selectedDeal.remainingQuantity }} left</span>
          </div>
          <div class="info-row" v-if="userLocation">
            <span class="info-label">Distance</span>
            <span>{{ formatDistance(distanceKm(userLocation.lat, userLocation.lng, Number(selectedDeal.latitude), Number(selectedDeal.longitude))) }}</span>
          </div>
          <div class="info-actions">
            <router-link :to="`/deals/${selectedDeal.id}`" class="btn btn-primary btn-sm">View Details</router-link>
            <button class="btn btn-ghost btn-sm" @click="buildRoute" :disabled="isRouting">
              {{ isRouting ? '...' : 'Directions' }}
            </button>
          </div>
          <div v-if="routeInfo" class="info-route">
            {{ formatDistance(routeInfo.distanceKm) }} &middot; {{ formatDuration(routeInfo.durationMin) }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.explore-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: var(--color-bg);
}

.explore-toolbar {
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  padding: 10px 16px;
  z-index: 5;
}

.toolbar-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 400px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  transition: all var(--transition-fast);
}

.search-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  background: var(--color-bg);
}

.search-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.toolbar-search {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-size: 0.875rem;
  color: var(--color-text);
  outline: none;
  min-width: 0;
}

.toolbar-search::placeholder {
  color: var(--color-text-tertiary);
}

.filter-chips {
  display: flex;
  gap: 6px;
}

.map-alert {
  padding: 8px 16px;
  color: #92400e;
  background: #fffbeb;
  border-bottom: 1px solid #fde68a;
  font-size: 0.875rem;
}

[data-theme="dark"] .map-alert {
  background: #3b2a0e;
  color: #fde68a;
  border-color: #78350f;
}

.location-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--color-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.location-dialog {
  background: var(--color-card-bg);
  border-radius: var(--radius-md);
  padding: 36px 32px 28px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-xl);
}

.location-dialog h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 12px 0 8px;
  color: var(--color-text);
}

.location-dialog p {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
  font-size: 0.9rem;
}

.location-error {
  padding: 10px 14px;
  margin-bottom: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  color: #991b1b;
  font-size: 0.85rem;
  text-align: left;
}

[data-theme="dark"] .location-error {
  background: #3b1a1a;
  border-color: #7f1d1d;
  color: #fca5a5;
}

.location-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.location-actions .btn {
  width: 100%;
}

/* Google Maps-style layout */
.explore-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
}

.explore-sidebar {
  width: 400px;
  min-width: 0;
  overflow-y: auto;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg);
}

.sidebar-loading {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-skeleton {
  height: 120px;
  border-radius: var(--radius-sm);
}

.sidebar-list {
  padding: 12px;
}

.sidebar-count {
  padding: 4px 8px 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.sidebar-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
  margin-bottom: 4px;
}

.sidebar-card:hover {
  background: var(--color-bg-secondary);
}

.sidebar-card-active {
  background: var(--color-accent-light);
  border-color: var(--color-accent-light);
}

.sidebar-card-img {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-bg-tertiary);
}

.sidebar-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-card-body {
  flex: 1;
  min-width: 0;
}

.sidebar-card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.sidebar-store {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.sidebar-card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sidebar-price {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-accent);
}

.sidebar-original-price {
  font-size: 0.8125rem;
  color: var(--color-text-tertiary);
  text-decoration: line-through;
}

.sidebar-distance {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  margin-left: auto;
}

.sidebar-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-stock {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.stock-low {
  color: var(--color-warning);
  font-weight: 600;
}

/* Map section */
.map-section {
  flex: 1;
  position: relative;
  min-width: 0;
}

.map-canvas {
  height: 100%;
  width: 100%;
}

.map-info-window {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  max-width: calc(100% - 32px);
  background: var(--color-card-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
  padding: 16px;
  z-index: 1000;
  animation: fade-in-up 0.2s ease;
}

.info-close {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-tertiary);
  cursor: pointer;
  line-height: 1;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.info-close:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.info-header {
  margin-bottom: 12px;
  padding-right: 24px;
}

.info-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-size: 0.6875rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.info-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.8125rem;
}

.info-label {
  color: var(--color-text-tertiary);
}

.info-row strong {
  color: var(--color-accent);
  font-size: 0.9375rem;
}

.info-row s {
  color: var(--color-text-tertiary);
  margin-left: 4px;
  font-size: 0.75rem;
}

.info-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.info-actions .btn {
  flex: 1;
}

.info-route {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: center;
}

@media (max-width: 1024px) {
  .explore-sidebar {
    width: 340px;
  }
}

@media (max-width: 768px) {
  .explore-page {
    height: calc(100vh - 60px);
  }

  .explore-layout {
    flex-direction: column;
  }

  .explore-sidebar {
    width: 100%;
    height: 40%;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }

  .map-section {
    height: 60%;
  }

  .map-info-window {
    bottom: 12px;
    width: calc(100% - 24px);
    padding: 14px;
  }

  .sidebar-card-img {
    width: 64px;
    height: 64px;
  }

  .filter-chips {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .search-wrapper {
    max-width: none;
  }
}
</style>

<style>
/* ===== Deal Marker Pin (CSS-only, Google Maps style) ===== */
.map-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.2));
}
.map-pin:hover { transform: scale(1.1); }
.map-pin-selected {
  transform: scale(1.15);
  animation: pin-bounce 0.35s ease;
  filter: drop-shadow(0 3px 14px rgba(5,150,105,0.6));
}

.map-pin-price {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: white;
  border: 2.5px solid var(--pin-color, #10b981);
  border-radius: 14px;
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
  line-height: 1.3;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
  transition: all 0.2s;
  position: relative;
}
.map-pin-selected .map-pin-price {
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5,150,105,0.2), 0 2px 12px rgba(5,150,105,0.4);
  transform: scale(1.08);
}
.map-pin-selected .map-pin-price::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px solid rgba(5,150,105,0.15);
  animation: pin-ring 1.5s ease infinite;
}

.map-pin-dot {
  width: 8px;
  height: 8px;
  background: var(--pin-color, #10b981);
  border: 2.5px solid white;
  border-radius: 50%;
  margin-top: -5px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: all 0.2s;
}
.map-pin-dot-selected {
  width: 12px;
  height: 12px;
  background: #059669;
  border-width: 3px;
  box-shadow: 0 0 0 3px rgba(5,150,105,0.25);
}

@keyframes pin-bounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
@keyframes pin-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

/* ===== User Location Pin ===== */
.user-marker-pin {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-marker-pin::before {
  content: '';
  position: absolute;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.15);
  animation: user-pulse 2s ease infinite;
}
.user-marker-inner {
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  border: 3px solid white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  position: relative;
  z-index: 1;
}

@keyframes user-pulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 0.2; }
  100% { transform: scale(0.8); opacity: 0.6; }
}
</style>
