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

Sau đó chạy seed từ local:

```bash
cd server
npx ts-node src/seed-supabase.ts
```

(Seed script tạo 10 users, 33 stores, 109 deals + dữ liệu mẫu.)

## 1. Cấu hình môi trường

```bash
cd server

# Copy env mẫu (nếu chưa có)
cp .env.example .env

# Sửa file .env với thông tin từ Supabase dashboard:
#   SUPABASE_URL=https://[your-project].supabase.co
#   SUPABASE_SECRET_KEY=[service_role_key]
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
| Admin | `admin@foodly.app` | `Password123!` |
| Moderator | `moderator@foodly.app` | `Password123!` |
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
| `/profile/reservations` | Danh sách reservation | ✅ |
| `/payments/:reservationId` | Trang thanh toán | ✅ |
| `/ai-search` | AI tìm deal bằng ảnh | ✅ |
| `/feed` | Community feed realtime | - |
| `/admin` | Admin dashboard | Admin |

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
| POST | `/api/deals/:id/reserve` | ✅ | Reserve deal |
| POST | `/api/payments/reservations/:id/pay` | ✅ | Tạo payment |
| PUT | `/api/payments/:id/complete-mock` | ✅ | Complete mock pay |
| PUT | `/api/payments/:id/confirm` | ✅ | Confirm payment |
| GET | `/api/stores` | - | Danh sách stores |

## 9. Scripts hữu ích

```bash
# Seed database (Supabase REST API)
cd server && npx ts-node src/seed-supabase.ts

# Kiểm tra TypeScript
cd server && npx tsc --noEmit

# Build production
cd server && npm run build && node dist/main.js
```
