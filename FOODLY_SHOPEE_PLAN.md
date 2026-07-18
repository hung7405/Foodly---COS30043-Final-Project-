# Foodly — Phân Tích Điểm Yếu & Kế Hoạch Chi Tiết

> **Mục tiêu:** Biến Foodly từ food-rescue platform thành **"Shopee phiên bản Foodly"** — nơi merchant có thể đăng ký, bán hàng, nhận thanh toán, và quản lý analytics real-time.

---

## Phần 1: ĐIỂM YẾU & NHỮNG GÌ CÒN THIẾU

### 🔴 CRITICAL — Chưa làm thì không thể có Merchant Platform

| # | Vấn đề | Chi tiết | File |
|---|--------|----------|------|
| 1 | **Store không có owner** | Bất kỳ user nào cũng có thể tạo/sửa store. Merchant không sở hữu store của họ. | `stores.controller.ts`, `store.entity.ts` |
| 2 | **Không có file upload** | Deal chỉ nhận URL ảnh, không có `<input type="file">`. Merchant documents không thể upload. | `ai.controller.ts`, `CreateDealView.vue` |
| 3 | **`synchronize: true` ở production** | TypeORM tự động xóa/tạo column khi schema thay đổi → **mất dữ liệu**. | `app.module.ts`, `docker-compose.yml` |
| 4 | **JWT hết hạn sau 15 phút** | User bị logout mỗi 15 phút, không có refresh token. Merchant không thể làm việc. | `auth.module.ts`, `axios.ts` |
| 5 | **Không có email service** | Không thể gửi email verify, password reset, notification cho merchant. | Không có trong dependencies |
| 6 | **Store endpoint không có pagination** | Khi có >100 merchant, API sẽ chậm dần. | `stores.controller.ts` |

### 🟡 HIGH — Bảo mật & chất lượng chưa đạt production

| # | Vấn đề | Chi tiết | File |
|---|--------|----------|------|
| 7 | **Auth không có rate limiting riêng** | Login/register dùng chung global 100 req/min. Brute force được 100 lần/phút. | `app.module.ts` |
| 8 | **Không có unit test** | 0 file `*.spec.ts`. Logic quan trọng (reservation optimistic lock, recommendation) không được test. | Toàn bộ project |
| 9 | **E2E chỉ 6 test cơ bản** | Không test authorization, error cases, concurrency, admin operations. | `test/app.e2e-spec.ts` |
| 10 | **Không có caching** | Mỗi request analytics đều query DB. Với merchant analytics, performance sẽ rất tệ. | Không có cache layer |
| 11 | **Không có background job queue** | Payment processing, email sending, notification delivery đều chạy sync. Nếu crash thì mất. | Không có Bull/Agenda |
| 12 | **ExploreView.vue 1160 dòng** | Mock data embedded, memory leak từ markerMap, không dùng virtual-scroller. Khó maintain. | `ExploreView.vue` |

### 🟢 MEDIUM — Có thể làm sau nhưng cần biết

| # | Vấn đề | Mô tả |
|---|--------|-------|
| 13 | Không có CSP headers (Helmet mặc định) → có thể block map tiles |
| 14 | OwnerGuard được viết nhưng không dùng ở đâu |
| 15 | Recommendations endpoint public (không auth guard) |
| 16 | Không có audit logging (admin không biết ai đã làm gì) |
| 17 | Docker server container không có health check + restart policy |
| 18 | Seed data không chạy trong Docker (DB trống khi deploy) |
| 19 | Config chỉ validate JWT_SECRET, bỏ qua DATABASE_URL, CORS |
| 20 | Analytics errors bị .catch(() => {}) nuốt im lặng |

---

## Phần 2: KẾ HOẠCH CỤ THỂ

### Phase 0 — Hotfix (Làm ngay, 2-3 ngày)

_Không làm thì không thể triển khai feature gì khác._

| Task | Chi tiết | File | Thời gian |
|------|----------|------|-----------|
| **0.1** Store ownership | Thêm `userId` vào Store entity. Sửa `StoresService` chỉ cho phép owner edit. | `store.entity.ts`, `stores.service.ts`, `stores.controller.ts` | 4h |
| **0.2** File upload system | Cấu hình MulterModule. Tạo `POST /api/upload` endpoint. Lưu file vào `uploads/`. | `upload.module.ts`, `main.ts` | 4h |
| **0.3** JWT refresh token | Thêm `POST /auth/refresh`. Client interceptor tự động refresh khi 401. | `auth.module.ts`, `auth.service.ts`, `axios.ts` | 6h |
| **0.4** Rate limiting cho auth | AuthModule: 5 req/min login, 3 req/min register. Phần còn lại giữ 100 req/min. | `app.module.ts` | 2h |
| **0.5** Seed script trong Docker | Thêm `docker-entrypoint.sh` chạy seed nếu DB trống. | `Dockerfile`, `seed.ts` | 2h |
| **0.6** Pagination cho stores | Thêm `?page=1&limit=20` cho `GET /stores`. | `stores.controller.ts` | 1h |

**Tổng Phase 0:** ~19h (2.5 ngày)

---

### Phase 1 — Merchant Foundation (5-6 ngày)

_Sau phase này: merchant có thể đăng ký, được duyệt, login, quản lý store._

#### 1A. Database & Backend (3 ngày)

| Task | File mới / Sửa | Chi tiết |
|------|----------------|----------|
| **1A.1** Merchant role + fields | `user.entity.ts` | Thêm `MERCHANT` vào enum. Thêm fields: `businessName`, `phoneNumber`, `businessRegistrationId`, `isVerifiedMerchant`, `verifiedAt` |
| **1A.2** Migration script | `src/database/migrations/` | Tạo migration đầu tiên. Tắt `synchronize: true` trong production. |
| **1A.3** Auth: merchant register | `auth.controller.ts`, `auth.service.ts` | `POST /auth/register/merchant` — nhận business info, tạo user với role MERCHANT, isVerifiedMerchant = false |
| **1A.4** Admin: merchant approval | `admin.controller.ts`, `admin.service.ts` | `GET /admin/merchants` (list pending), `POST /admin/merchants/:id/verify`, `POST /admin/merchants/:id/reject` |
| **1A.5** Merchant module | `merchant/merchant.module.ts` | Module mới: `MerchantController` + `MerchantService` |
| **1A.6** Merchant profile API | `merchant.controller.ts` | `GET /merchant/profile`, `PUT /merchant/profile`, `POST /merchant/documents` (upload giấy tờ) |
| **1A.7** Store ownership | `stores.service.ts` | Khi merchant tạo store → tự động gán `userId`. Merchant chỉ được sửa store của mình. |

#### 1B. Client (2-3 ngày)

| Task | File | Chi tiết |
|------|------|----------|
| **1B.1** Register merchant form | `RegisterMerchantView.vue` | Form: business name, phone, reg ID, file upload documents |
| **1B.2** Merchant profile | `MerchantProfileView.vue` | Xem/sửa thông tin merchant, upload documents |
| **1B.3** Admin merchant list | `AdminMerchantsView.vue` | Table merchants + verify/reject buttons |
| **1B.4** Router updates | `router/index.ts` | Thêm routes: `/register/merchant`, `/merchant/*`, `/admin/merchants` |
| **1B.5** Auth store update | `auth.store.ts` | Support role `merchant`, computed `isMerchant`, `isVerifiedMerchant` |

#### 1C. Tests (1 ngày)

| Task | Chi tiết |
|------|----------|
| **1C.1** Merchant registration E2E | Register merchant → check role = MERCHANT, isVerifiedMerchant = false |
| **1C.2** Admin verify merchant | Admin verify → GET merchant profile → isVerifiedMerchant = true |
| **1C.3** Store ownership | Merchant tạo store → store.userId = merchant.id. User khác không edit được |
| **1C.4** Auth rate limiting | Gửi 6 requests login trong 1 phút → request thứ 6 bị 429 |

---

### Phase 2 — Merchant Dashboard + QR Pickup (5-6 ngày)

_Sau phase này: merchant có dashboard real-time, customer có QR code, scan để pickup._

#### 2A. Merchant Dashboard (3 ngày)

```
MERCHANT DASHBOARD — Giao diện:
┌─────────────────────────────────────────────────────────┐
│  📊 DASHBOARD     Đơn: 47   DT: 1,250,000đ   Chờ: 12   │
├─────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │ Đơn hôm    │  │ Doanh thu │  │ Đang chờ  │           │
│  │ nay: 47   │  │ 1,250,000 │  │ pickup:12 │           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                          │
│  📋 Đơn đang chờ xử lý                                    │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Mã: A3F8B2C1  |  Cơm bento cá hồi  |  ⏱ 5:32  |🔍QR││
│  │ Mã: B7D1E3F9  |  Bánh mì gà cay    |  ⏱ 8:15  |🔍QR││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  📈 Doanh thu 7 ngày  [═══════════════════]               │
└─────────────────────────────────────────────────────────┘
```

| Task | Backend | Client |
|------|---------|--------|
| **2.1** Dashboard API | `GET /merchant/dashboard` — todayOrders, revenue, pendingPickups, lowStockDeals | `MerchantDashboardView.vue` |
| **2.2** Orders API | `GET /merchant/orders?status=active` — list đơn + deal info | `MerchantOrdersView.vue` |
| **2.3** Xác nhận pickup | `PUT /merchant/orders/:id/confirm` — set status CONFIRMED + confirmedAt | Button confirm + toast |
| **2.4** Merchant layout | — | `MerchantLayout.vue` (sidebar nav) |
| **2.5** Socket.IO merchant room | Merchant join room `merchant:{storeId}` — nhận đơn mới realtime | Socket subscribe |

#### 2B. QR Pickup System (2-3 ngày)

```
CUSTOMER FLOW                          MERCHANT FLOW
┌─────────────┐                       ┌──────────────┐
│ Reserve deal│                       │ Dashboard    │
└──────┬──────┘                       │ thấy đơn mới │
       ▼                              └──────┬───────┘
┌─────────────┐                             │
│ Nhận QR     │     ┌──────────┐            │
│ code trong   │────▶│ Customer  │◀───────────┘
│ app         │     │ đến store │
└──────┬──────┘     │ scan QR   │
       │            └─────┬─────┘
       ▼                  ▼
┌─────────────┐     ┌──────────────┐
│ Customer     │     │ Merchant     │
│ show QR cho  │     │ scan =       │
│ merchant     │     │ confirm      │
└─────────────┘     └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │ Reservation  │
                    │ → CONFIRMED  │
                    │ Socket emit  │
                    └──────────────┘
```

| Task | Backend | Client |
|------|---------|--------|
| **2.6** QR generation | `npm install qrcode`. Sửa `ReservationService`: gen QR từ reservationCode, lưu URL | — |
| **2.7** QR display API | `GET /reservations/:id/qr` — trả về QR code image (SVG/PNG) | `CustomerQRView.vue` |
| **2.8** QR scanner | — | `MerchantScannerView.vue` (dùng `html5-qrcode`) |
| **2.9** Scan confirm API | `POST /merchant/orders/scan` body: `{ reservationCode }` → tìm + confirm | Gọi từ scanner view |

#### 2C. Tests (1 ngày)

- E2E: Tạo reservation → lấy QR → scan → confirm → status = CONFIRMED
- E2E: Merchant dashboard shows orders real-time
- Unit: QR generation
- Unit: Scan confirm với code không hợp lệ → 404

---

### Phase 3 — Payment Integration (8-10 ngày, song song với Phase 4)

_Sau phase này: customer thanh toán online, tiền giữ escrow, merchant nhận payout._

#### Kiến trúc payment

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Customer │────▶│  Foodly API  │────▶│  MoMo /  │
│ (Vue)    │◀───│              │◀───│  VNPay   │
└──────────┘     │              │     └──────────┘
                 │  Payment     │
                 │  Service     │
                 │              │     ┌──────────┐
                 │  Escrow:     │────▶│ Merchant │
                 │  hold →      │     │ Payout   │
                 │  capture     │     └──────────┘
                 └──────────────┘
```

| Task | Chi tiết | Thời gian |
|------|----------|-----------|
| **3.1** Payment entity | `payment_transactions` table: reservationId, amount, status (pending/held/captured/refunded), provider, providerTxId | 4h |
| **3.2** Payout entity | `merchant_payouts` table: merchantId, amount, bankAccount, status | 2h |
| **3.3** PaymentService | `createPayment()`, `capturePayment()`, `refundPayment()`, `processPayout()` | 8h |
| **3.4** MoMo integration | Tạo payment URL, xử lý IPN webhook, signature verification | 12h |
| **3.5** VNPay integration | Tạo payment URL, checksum, IPN + return URL handling | 12h |
| **3.6** Sửa reservation flow | Reserve → payment PENDING → pay → held → pickup → capture | 6h |
| **3.7** Merchant bank account API | `PUT /merchant/bank-account` — lưu thông tin NH | 2h |
| **3.8** Merchant payout API | `GET /merchant/payouts`, `POST /merchant/payouts/request` | 4h |
| **3.9** Client payment views | `PaymentMethodView`, `PaymentResultView`, `MerchantPayoutsView` | 8h |
| **3.10** Admin payout approval | `GET /admin/payouts`, `PUT /admin/payouts/:id/process` | 4h |
| **3.11** E2E tests | Payment → webhook → escrow → pickup → capture → payout | 8h |

**⚠️ Rủi ro Phase 3:**
- MoMo/VNPay yêu cầu **business registration** để có API key thật
- Sandbox API có thể thay đổi không báo trước
- Webhook security: cần signature verification + IP whitelist + rate limit

---

### Phase 4 — Push Notification + Merchant Analytics (5-7 ngày, song song Phase 3)

#### 4A. Push Notification (3 ngày)

| Task | File | Chi tiết |
|------|------|----------|
| **4.1** Firebase Admin SDK | `npm install firebase-admin` | Initialize với service account |
| **4.2** Notification entity | `notification.entity.ts` | userId, type, title, body, data JSON, isRead |
| **4.3** NotificationService | `notification.service.ts` | `sendPush()`, `saveNotification()`, `getNotifications()`, `markAsRead()` |
| **4.4** Register FCM token | `notification.controller.ts` | `POST /notifications/fcm-token` |
| **4.5** Gắn vào services | `reservations.service.ts`, `deals.service.ts`, `merchant.service.ts` | Gửi push khi: new order, pickup reminder, deal expired, merchant verified |
| **4.6** Client notification | `NotificationBell.vue`, `NotificationPanel.vue` | Icon chuông + badge + dropdown |

#### 4B. Merchant Analytics (2-3 ngày)

| Task | Backend | Client |
|------|---------|--------|
| **4.7** Dashboard analytics | `GET /merchant/analytics/dashboard` — metrics tổng quan | Chart.js: StatCard × 4 |
| **4.8** Revenue chart | `GET /merchant/analytics/revenue?from=&to=` — daily/weekly/monthly | `RevenueChart.vue` (line chart) |
| **4.9** Product performance | `GET /merchant/analytics/products` — top products by revenue | `ProductPerformanceChart.vue` (bar) |
| **4.10** Hour distribution | `GET /merchant/analytics/hours` — peak hours | `HourlyDistributionChart.vue` (heatmap) |
| **4.11** Export CSV | `GET /merchant/analytics/export?format=csv` — download report | Button export |

---

## Phần 3: TỔNG QUAN LỘ TRÌNH

```
Tuần 1          Tuần 2          Tuần 3          Tuần 4
──────────────────────────────────────────────────────────────
Phase 0. Hotfix
├── Store ownership
├── File upload
├── JWT refresh
├── Rate limit auth
└── Seed + pagination

Phase 1. Merchant Foundation
├── 1A. Backend (3 ngày)
├── 1B. Client (2-3 ngày)
└── 1C. Tests (1 ngày)

                Phase 2. Dashboard + QR
                ├── 2A. Dashboard (3 ngày)
                ├── 2B. QR Pickup (2-3 ngày)
                └── 2C. Tests (1 ngày)

                                Phase 3. Payment
                                ├── MoMo + VNPay (6 ngày)
                                ├── Escrow + Payout (3 ngày)
                                └── Tests + Security (2 ngày)

                                Phase 4. Growth
                                ├── Push notification (3 ngày)
                                ├── Merchant analytics (2 ngày)
                                └── Testing + Polish (1 ngày)
```

### Tổng effort

| Phase | BE (ngày) | FE (ngày) | Test (ngày) | Total |
|-------|:---------:|:---------:|:-----------:|:-----:|
| Phase 0 — Hotfix | 2 | 0.5 | 0.5 | **3** |
| Phase 1 — Foundation | 3 | 2 | 1 | **6** |
| Phase 2 — Dashboard + QR | 2 | 3 | 1 | **6** |
| Phase 3 — Payment | 6 | 2 | 2 | **10** |
| Phase 4 — Notification + Analytics | 2 | 3 | 1 | **6** |
| **TOTAL** | **15** | **10.5** | **5.5** | **~31 ngày** |

### Với 2 developer song song:
- **~20 ngày làm việc** (4 tuần)
- Dev 1 (BE chính): Phase 0 → Phase 1A → Phase 3
- Dev 2 (FE + BE phụ): Phase 1B → Phase 2 → Phase 4

---

## Phần 4: NHỮNG GÌ CHƯA THỂ LÀM (Giới hạn thực tế)

1. **MoMo/VNPay API keys** — Cần có business registration (GPKD) để đăng ký tài khoản merchant thật. Sandbox có thể test nhưng không chạy production được.

2. **Firebase Cloud Messaging** — Cần Google Cloud project + billing account. Miễn phí nhưng cần setup.

3. **HTTPS + Domain** — Push notification API yêu cầu HTTPS. Cần domain + SSL certificate.

4. **Email service** (SendGrid/Mailgun) — Cần API key từ third-party, thường có free tier 100 email/ngày.

5. **QR scanner trên mobile browser** — `html5-qrcode` hoạt động được nhưng UX không bằng native app. Camera permission cần HTTPS.

6. **Real-time delivery tracking** — GPS tracking real-time từ shipper đến customer. Cần mobile app + background location service.

7. **Multi-language support** — i18n cần overhaul toàn bộ UI texts.

8. **AI recommendation cho từng merchant** — Hiện tại recommendation engine chỉ tính theo tag profile chung, chưa có personalization cho từng merchant.

---

## Phần 5: FILE MAP CHI TIẾT

### New Files

```
server/src/
├── merchant/
│   ├── merchant.module.ts
│   ├── merchant.controller.ts      # CRUD + dashboard + analytics
│   ├── merchant.service.ts
│   └── merchant.guard.ts           # Kiểm tra verified merchant
├── payment/
│   ├── payment.module.ts
│   ├── payment.service.ts          # create/capture/refund/payout
│   ├── payment.controller.ts       # Merchant payout endpoints
│   ├── payment-webhook.controller.ts  # MoMo/VNPay IPN
│   ├── momo.service.ts
│   ├── vnpay.service.ts
│   └── entities/
│       ├── payment.entity.ts
│       └── payout.entity.ts
├── notification/
│   ├── notification.module.ts
│   ├── notification.service.ts     # sendPush + saveNotification
│   ├── notification.controller.ts  # GET/PUT notifications + FCM
│   ├── firebase.service.ts         # Firebase Admin SDK
│   └── entities/
│       └── notification.entity.ts
├── upload/
│   ├── upload.module.ts
│   └── upload.controller.ts        # POST /upload (Multer)
├── database/migrations/
│   └── 001-merchant-payment.ts     # Migration đầu tiên
└── merchant-analytics/
    └── merchant-analytics.service.ts  # Aggregate queries

client/src/
├── views/merchant/
│   ├── MerchantDashboardView.vue
│   ├── MerchantOrdersView.vue
│   ├── MerchantOrderDetail.vue
│   ├── MerchantDealsView.vue
│   ├── MerchantScannerView.vue
│   ├── MerchantReportsView.vue
│   ├── MerchantPayoutsView.vue
│   ├── MerchantSettingsView.vue
│   └── MerchantProfileView.vue
├── views/customer/
│   ├── CustomerQRView.vue
│   └── PaymentResultView.vue
├── views/admin/
│   ├── AdminMerchantsView.vue
│   └── AdminPayoutsView.vue
├── views/auth/
│   └── RegisterMerchantView.vue
├── components/merchant/
│   ├── MerchantLayout.vue
│   ├── MerchantNavBar.vue
│   ├── RevenueChart.vue
│   ├── OrdersTrendChart.vue
│   └── ProductPerformanceChart.vue
├── components/notification/
│   ├── NotificationBell.vue
│   └── NotificationPanel.vue
├── stores/
│   ├── merchant.store.ts
│   ├── notification.store.ts
│   └── payment.store.ts
├── components/payment/
│   ├── PaymentMethodSelector.vue
│   └── PaymentStatusBadge.vue
└── types/
    ├── merchant.types.ts
    ├── payment.types.ts
    └── notification.types.ts
```

### Modified Files

```
server/src/
├── users/entities/user.entity.ts       # + MERCHANT role + merchant fields + fcmToken
├── stores/entities/store.entity.ts      # + userId (FK → User) + isVerified
├── stores/stores.controller.ts          # + ownership check
├── stores/stores.service.ts             # + pagination
├── reservations/reservations.service.ts # + QR gen + payment trigger
├── reservations/entities/reservation.entity.ts  # + qrCodeUrl
├── admin/admin.controller.ts            # + merchant approval endpoints
├── admin/admin.service.ts               # + verify/reject merchant
├── auth/auth.controller.ts              # + POST /auth/register/merchant
├── auth/auth.service.ts                 # + registerMerchant()
├── auth/auth.module.ts                  # + JWT expiry config (15m → 24h cho merchant?)
├── auth/jwt.strategy.ts                 # + role validation
├── app.module.ts                        # + import merchant/payment/notification/upload
├── main.ts                              # + body size limit, CSP
├── config.ts                            # + validate DATABASE_URL, CORS
└── .env.example                         # + MoMo/VNPay/FCM keys

client/src/
├── router/index.ts                      # + 15 routes mới
├── stores/auth.store.ts                 # + merchant role
├── services/api/index.ts                # + merchant/payment/notification endpoints
├── services/api/axios.ts                # + refresh token interceptor + timeout
└── App.vue                              # + notification bell
```

---

## Phần 6: TESTING STRATEGY

### Unit Tests cần viết (theo priority)

```
1. AuthService — login rate limit, merchant registration validation
2. ReservationsService — optimistic locking, QR generation, concurrent reserve
3. PaymentService — escrow hold → capture → refund cycle
4. MerchantService — dashboard metrics calculation
5. OwnerGuard + RolesGuard — role hierarchy (admin can do moderator things)
6. DTO validation — register dto, deal dto, merchant dto
7. RecommendationService — scoring algorithm edge cases
8. NotificationService — push send, FCM error handling
```

### E2E Tests cần thêm

```
Phase 0:
- Auth: register duplicate email → 409
- Auth: login wrong password 5 lần → account lockout
- Auth: JWT expired → refresh → new token works
- File upload: POST /upload → 200 + file URL

Phase 1:
- Merchant register → role = MERCHANT
- Admin verify merchant → GET profile → isVerifiedMerchant = true
- Store: merchant tạo store → store.userId = merchant.id
- Store: user khác edit → 403

Phase 2:
- Reserve → QR code generated
- Scan QR → confirm → status = CONFIRMED
- Merchant dashboard → todayOrders > 0
- Socket.IO: reservation:confirmed event emitted

Phase 3:
- Reserve → payment PENDING created
- MoMo IPN → payment CONFIRMED (held)
- Pickup confirmed → payment CAPTURED
- Cancel → payment REFUNDED
- Merchant payout request → admin approve → payout PROCESSED

Phase 4:
- FCM token register → POST /notifications/fcm-token
- Create reservation → notification created
- GET /notifications → list has new item
- Analytics endpoint → correct metrics
```

---

## Phần 7: CHECKLIST HOÀN THÀNH

### Phase 0 — Hotfix
- [ ] 0.1 Store có owner (userId)
- [ ] 0.2 File upload system
- [ ] 0.3 JWT refresh token
- [ ] 0.4 Rate limit auth riêng
- [ ] 0.5 Seed script trong Docker
- [ ] 0.6 Pagination stores

### Phase 1 — Merchant Foundation
- [ ] 1A.1 Merchant role + fields
- [ ] 1A.2 Migration script
- [ ] 1A.3 Merchant register endpoint
- [ ] 1A.4 Admin merchant approval
- [ ] 1A.5 Merchant module
- [ ] 1A.6 Merchant profile API
- [ ] 1A.7 Store ownership check
- [ ] 1B.1-5 Client views
- [ ] 1C.1-4 Tests

### Phase 2 — Dashboard + QR
- [ ] 2.1 Dashboard API + view
- [ ] 2.2 Orders API + view
- [ ] 2.3 Confirm pickup
- [ ] 2.4 Merchant layout
- [ ] 2.5 Socket.IO merchant room
- [ ] 2.6 QR generation
- [ ] 2.7 QR display
- [ ] 2.8 QR scanner
- [ ] 2.9 Scan confirm API

### Phase 3 — Payment
- [ ] 3.1 Payment entity
- [ ] 3.2 Payout entity
- [ ] 3.3 PaymentService
- [ ] 3.4 MoMo integration
- [ ] 3.5 VNPay integration
- [ ] 3.6 Sửa reservation flow
- [ ] 3.7 Bank account API
- [ ] 3.8 Payout API
- [ ] 3.9 Client payment views
- [ ] 3.10 Admin payout approval
- [ ] 3.11 Tests

### Phase 4 — Notifications + Analytics
- [ ] 4.1 Firebase SDK
- [ ] 4.2 Notification entity
- [ ] 4.3 NotificationService
- [ ] 4.4 FCM register endpoint
- [ ] 4.5 Gắn vào services
- [ ] 4.6 Client notification UI
- [ ] 4.7 Dashboard analytics API
- [ ] 4.8 Revenue chart
- [ ] 4.9 Product performance
- [ ] 4.10 Hour distribution
- [ ] 4.11 CSV export
