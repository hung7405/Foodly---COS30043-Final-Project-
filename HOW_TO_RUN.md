# How to Run Foodly

## Yêu cầu
- Node.js >= 18
- npm >= 9

## 0. Thiết lập Supabase (bắt buộc)

Dự án dùng **Supabase (PostgreSQL)** qua REST API (`@supabase/supabase-js`).  
Database connection kiểu PostgreSQL direct bị chặn (IPv6 không khả dụng trên môi trường dev).

### Tạo Supabase project:

1. Tạo tài khoản tại https://supabase.com
2. Tạo project mới:
   - **Name**: `foodly` (hoặc tên tuỳ chọn)
   - **Database Password**: đặt mật khẩu và nhớ kỹ
   - **Region**: chọn **Singapore** (gần VN nhất)
   - **Pricing Plan**: Free
3. Chờ vài phút cho project được tạo

### Lấy API keys:

Vào **Project Settings → API**:
- **Project URL** (SUPABASE_URL): `https://[your-project].supabase.co`
- **service_role secret** (SUPABASE_SECRET_KEY): copy từ mục `service_role`

### Chạy migration + seed:

**Migration SQL** có sẵn ở `server/src/supabase-migration.sql`.  
Mở **Supabase Dashboard → SQL Editor**, paste và chạy toàn bộ file để tạo bảng.

> Migration file gồm 2 phần: **base schema** (bảng, enum, RLS) và **phần incremental** ở cuối file
> (pgvector embeddings + merchant platform). Luôn chạy **toàn bộ** file nếu DB là mới.

Sau đó chạy seed từ local:

```bash
cd server
npx ts-node src/seed-supabase.ts
```

(Seed script tạo 11 users, 33 stores, 109 deals + reservations cho merchant demo.)

> **DB đã có dữ liệu từ trước khi có merchant platform?** Chỉ cần chạy phần **incremental merchant**
> (mục "Merchant Platform" ở cuối `supabase-migration.sql`: `ALTER TYPE ... ADD 'merchant'` +
> `ALTER TABLE stores ADD COLUMN user_id`), rồi chạy script bổ sung:
>
> ```bash
> cd server
> npx ts-node src/seed-merchant.ts
> ```
>
> `seed-merchant.ts` tạo tài khoản `merchant@foodly.app` / `Password123!`, gán 5 stores,
> và seed orders cho dashboard — không đụng vào dữ liệu đã có (seed chính `seed-supabase.ts`
> dùng `.insert()` nên **không idempotent**, đừng chạy lại trên DB cũ).

## 1. Cấu hình môi trường

```bash
cd server

# Copy env mẫu (nếu chưa có)
cp .env.example .env

# Sửa file .env với thông tin từ Supabase dashboard:
#   SUPABASE_URL=https://[your-project].supabase.co
#   SUPABASE_SECRET_KEY=[service_role_key]
```

### (Optional) Bật AI — Vision search + Vector search

Nếu đặt API key, app dùng AI thật thay vì keyword fallback:

```env
# server/.env — dùng 1 trong 2 (hoặc cả 2)
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Tuỳ chọn — model mặc định đã hợp lý:
# AI_VISION_MODEL=gemini-2.0-flash            # hoặc gpt-4o-mini
# AI_EMBEDDING_MODEL=text-embedding-3-small
```

Sau khi có key, backfill embeddings để bật hybrid search:

```bash
# GET /api/ai/embeddings/status  → xem trạng thái
# POST /api/ai/embeddings/backfill (cần login admin) hoặc đợi cron 10 phút
```

## 2. Chạy Server (Backend)

```bash
cd server

# Cài dependencies (lần đầu)
npm install

# Chạy dev server (hot-reload)
npm run start:dev
```

Server chạy tại: **http://localhost:3000**
Socket.IO cùng port: **http://localhost:3000**
API prefix: `/api`

> **Note**: Server chạy bằng `ts-node` trực tiếp (không cần build riêng).

## 3. Chạy Client (Frontend)

Mở terminal riêng:

```bash
cd client

# Cài dependencies (lần đầu)
npm install

# Chạy dev server
npm run dev
```

Client chạy tại: **http://localhost:5173**

## 4. Tài khoản mẫu (sau khi seed)

| Vai trò | Email | Password |
|---------|-------|----------|
| Admin | `admin@foodly.app` | `Admin@123` |
| Merchant (sở hữu 5 stores + có orders) | `merchant@foodly.app` | `Password123!` |
| Moderator | `binh@foodly.app` | `Password123!` |
| User (demo) | `demo@foodly.app` | `Password123!` |
| User | `lan@foodly.app` | `Password123!` |
| User | `huy@foodly.app` | `Password123!` |
| User | `mai@foodly.app` | `Password123!` |

## 5. Kiểm tra hoạt động

```bash
# API health check
curl http://localhost:3000/api/health

# Danh sách deals
curl http://localhost:3000/api/deals

# Danh sách stores
curl http://localhost:3000/api/stores
```

## 6. Tính năng thanh toán (Demo)

Flow: **Reserve → Pay → Pickup QR**

1. Login với `demo@foodly.app` / `Password123!`
2. Vào **Explore** → chọn deal → **View Details**
3. Click **Reserve** → tự động redirect tới trang Payment
4. Chọn **Mock Pay (Demo)** → click **Pay**
5. Click **✅ Confirm payment (Demo)** → payment thành công
6. Vào **My Reservations** → thấy reservation đã confirmed
7. Tới store → merchant scan pickup code

## 7. Cấu trúc routes chính

| Route | Mô tả | Auth |
|-------|-------|------|
| `/` | Landing page | - |
| `/explore` | Map + danh sách deal | - |
| `/deals/:id` | Deal detail | - |
| `/login` | Đăng nhập | - |
| `/register` | Đăng ký | - |
| `/profile` | Profile | ✅ |
| `/profile/reservations` | Danh sách reservation + realtime timeline | ✅ |
| `/payments/:reservationId` | Trang thanh toán | ✅ |
| `/ai-search` | AI tìm deal bằng ảnh (vision hoặc keyword) | ✅ |
| `/feed` | Community feed realtime | - |
| `/admin` | Admin dashboard | Admin |
| `/merchant` | Merchant dashboard (KPI, revenue 7 ngày, low stock) | Merchant |
| `/merchant/orders` | Pickup queue realtime (confirm pickup) | Merchant |
| `/merchant/deals` | Quản lý deal (pause/activate) | Merchant |

## 8. API Endpoints chính

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/api/health` | - | Health check |
| GET | `/api/geo` | - | IP geolocation (free) |
| POST | `/api/auth/login` | - | Login |
| POST | `/api/auth/register` | - | Register |
| GET | `/api/deals` | - | Danh sách deals |
| GET | `/api/deals/:id` | - | Deal detail |
| GET | `/api/deals/map` | - | Deals trong bounding box |
| GET | `/api/recommendations?q=` | - | Hybrid recommendation (heuristic + vector) |
| POST | `/api/ai/search` | ✅ | AI vision search (multipart image) |
| POST | `/api/deals/:id/reserve` | ✅ | Reserve deal |
| POST | `/api/payments/reservations/:id/pay` | ✅ | Tạo payment |
| PUT | `/api/payments/:id/complete-mock` | ✅ | Complete mock pay |
| PUT | `/api/payments/:id/confirm` | ✅ | Confirm payment |
| GET | `/api/stores` | - | Danh sách stores |
| GET | `/api/merchant/dashboard` | Merchant | Dashboard KPI + revenue trend |
| GET | `/api/merchant/orders` | Merchant | Pickup queue |
| PUT | `/api/merchant/orders/:id/confirm` | Merchant | Confirm pickup (realtime emit) |
| GET | `/api/merchant/deals` | Merchant | Danh sách deal của store mình |
| PUT | `/api/merchant/deals/:id/status` | Merchant | Pause/activate deal |
| GET | `/api/ai/embeddings/status` | Mod/Admin | Trạng thái embeddings |
| POST | `/api/ai/embeddings/backfill` | Admin | Backfill embeddings ngay |

## 9. PWA (Progressive Web App)

Client build tự sinh service worker + manifest (`vite-plugin-pwa`).

```bash
cd client
npm run dev        # dev không có SW
npm run build && npm run preview   # preview có đầy đủ PWA
```

Trên trình duyệt hỗ trợ (Chrome/Edge), app hiện banner **Install Foodly** — cài được ra home screen với offline cache.

## 10. Docker (Optional)

> Lưu ý: server **không** dùng postgres cục bộ nữa — cần Supabase key trước khi chạy.

```bash
# Tạo file .env ở root với SUPABASE_URL, SUPABASE_SECRET_KEY, JWT_SECRET
docker compose up --build
# Server: http://localhost:3000 | Client: http://localhost:80
```

## 11. Scripts hữu ích

```bash
# Seed database (Supabase REST API)
cd server && npx ts-node src/seed-supabase.ts

# Kiểm tra TypeScript
cd server && npx tsc --noEmit
cd client && npx vue-tsc -b --force

# Build production
cd server && npm run build && node dist/main.js
cd client && npm run build
```
