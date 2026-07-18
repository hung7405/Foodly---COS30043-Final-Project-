# Foodly — Merchant Platform Roadmap
## Từ Food Rescue → Shopee phiên bản Foodly

---

## Mục lục

1. [Phân tích tổng quan](#1-phân-tích-tổng-quan)
2. [Feature Deep-Dive & Implementation Plan](#2-feature-deep-dive--implementation-plan)
   - [P1: Merchant Registration & Verification](#p1-merchant-registration--verification)
   - [P1: Merchant Dashboard](#p1-merchant-dashboard)
   - [P1: QR Pickup System](#p1-qr-pickup-system)
   - [P1: Payment Integration (MoMo/VNPay)](#p1-payment-integration-momovnpay)
   - [P1: Push Notifications](#p1-push-notifications)
   - [P1: Merchant Analytics](#p1-merchant-analytics)
3. [Dependency Graph](#3-dependency-graph)
4. [Phased Rollout](#4-phased-rollout)
5. [Database Migration Plan](#5-database-migration-plan)
6. [Full API Endpoint Map](#6-full-api-endpoint-map)
7. [Client Routes & Views](#7-client-routes--views)
8. [Estimated Effort](#8-estimated-effort)
9. [Risk Assessment](#9-risk-assessment)

---

## 1. Phân tích tổng quan

### Kiến trúc hiện tại

```
User (role: guest|user|moderator|admin)
  ├── deals (tạo deal)
  ├── reservations (đặt deal)
  └── comments (bình luận)

Store (không có owner! Bất kỳ user nào cũng edit được)
  └── deals

Reservation (có reservationCode 8 ký tự hex)
  ├── status: active|confirmed|cancelled|expired
  └── expiresAt: 15 phút
```

### Gap Analysis — Current vs Target

| Khía cạnh | Hiện tại | Target (Shopee-like) |
|-----------|----------|---------------------|
| **Merchant** | User role `user` + tạo deal | Role `merchant` riêng, có verify business |
| **Store** | Không có owner | Store gắn với merchant, có verification |
| **Payment** | Không có | MoMo/VNPay/Stripe, escrow, payout |
| **QR Pickup** | reservationCode text | QR code scan + confirm |
| **Notification** | Socket.IO in-app | Push notification (FCM + Web Push) |
| **Analytics** | Admin global | Merchant dashboard riêng |
| **Dashboard** | Admin dashboard | Merchant dashboard riêng |

---

## 2. Feature Deep-Dive & Implementation Plan

---

### P1: Merchant Registration & Verification
**Impact:** 10/10 | **Difficulty:** 4/10 | **File changes:** ~15 files

#### What needs to change

**Server:**

```
1. User entity         → Thêm role 'merchant', thêm fields:
                          businessName, phoneNumber, businessRegistrationId,
                          isVerifiedMerchant, verifiedAt, rejectedAt, rejectionReason
2. UserRole enum       → Thêm MERCHANT
3. AuthModule          → POST /auth/register/merchant (thu thập business info)
4. AuthService         → registerMerchant() — tạo user với role merchant, chưa verified
5. AdminController     → POST /admin/merchants/:id/verify
                          POST /admin/merchants/:id/reject
6. AdminService        → verifyMerchant() — set isVerifiedMerchant = true
                          rejectMerchant() — set isVerifiedMerchant = false + reason
7. MerchantModule      → Module mới: MerchantController + MerchantService
8. MerchantController  → GET /merchant/profile (hồ sơ merchant)
                          PUT /merchant/profile (cập nhật)
                          POST /merchant/documents (upload giấy tờ)
9. MerchantService     → CRUD cho merchant profile
10. Store entity       → Thêm userId (FK → User) để gắn store với merchant
11. StoresService      → Sửa create/update để check ownership
12. RolesGuard         → Thêm 'merchant' vào role checking
13. Merchant decorator → @IsMerchant() — check role + isVerifiedMerchant
```

**Client:**

```
1. RegisterMerchantView.vue   → Form đăng ký merchant (business name, phone, reg ID)
2. MerchantProfileView.vue    → Xem/sửa hồ sơ merchant
3. AdminMerchantsView.vue     → Admin duyệt/từ chối merchant
4. router/index.ts            → Thêm routes cho merchant
5. auth.store.ts              → Thêm role 'merchant' + isVerifiedMerchant
6. stores/merchant.store.ts   → Pinia store mới cho merchant state
```

#### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register/merchant` | No | Đăng ký merchant (pending verify) |
| GET | `/api/merchant/profile` | merchant | Hồ sơ merchant |
| PUT | `/api/merchant/profile` | merchant | Cập nhật hồ sơ |
| POST | `/api/merchant/documents` | merchant | Upload giấy tờ |
| GET | `/api/admin/merchants` | admin | List merchants pending |
| POST | `/api/admin/merchants/:id/verify` | admin | Duyệt merchant |
| POST | `/api/admin/merchants/:id/reject` | admin | Từ chối merchant |

---

### P1: Merchant Dashboard
**Impact:** 10/10 | **Difficulty:** 6/10 | **File changes:** ~12 files

#### What needs to change

**Server:**

```
1. MerchantController → GET /merchant/dashboard
                         GET /merchant/orders?status=active|confirmed|completed|cancelled
                         GET /merchant/orders/:id (chi tiết đơn)
                         PUT /merchant/orders/:id/confirm-pickup (xác nhận pickup)
                         GET /merchant/deals (quản lý deal)
                         POST /merchant/deals (tạo deal nhanh)
                         PUT /merchant/deals/:id/pause (tạm dừng deal)
                         PUT /merchant/deals/:id/activate (kích hoạt lại)
2. MerchantService    → getDashboard(): todayOrders, activeDeals, pendingPickups,
                          revenueToday, totalItemsSold, avgRating
                         getOrders(): reservations with deal info cho store của merchant
                         confirmPickup(): mark reservation as CONFIRMED
3. Merge với DealsService → Merchant tạo deal gắn với store của họ
```

**Client:**

```
1. MerchantDashboardView.vue   → Dashboard tổng quan merchant
2. MerchantOrdersView.vue      → Quản lý đơn hàng (pickup queue)
3. MerchantDealsView.vue       → Quản lý deal (tạo, sửa, pause)
4. MerchantOrderDetail.vue     → Chi tiết đơn hàng
5. MerchantLayout.vue          → Layout riêng cho merchant (sidebar)
6. MerchantNavBar.vue          → Navigation merchant
7. router/index.ts             → /merchant/* routes (guarded by merchant role)
8. stores/merchant.store.ts    → Thêm order/deal management state
```

#### Dashboard Metrics API Response

```json
{
  "todayStats": {
    "orders": 47,
    "revenue": 1250000,
    "itemsSold": 89,
    "pendingPickups": 12,
    "cancelled": 3
  },
  "activeDeals": 15,
  "lowStockDeals": [
    { "id": "...", "title": "Cơm gà sốt cay", "remaining": 2 }
  ],
  "recentOrders": [
    {
      "id": "...", "reservationCode": "A3F8B2C1",
      "dealTitle": "Cơm bento cá hồi",
      "quantity": 1, "status": "active",
      "reservedAt": "2026-06-21T12:30:00Z",
      "expiresAt": "2026-06-21T12:45:00Z"
    }
  ],
  "peakHours": ["11:00-13:00", "17:00-19:00"],
  "topProducts": [
    { "title": "Cơm bento cá hồi", "sold": 28 }
  ]
}
```

---

### P1: QR Pickup System
**Impact:** 10/10 | **Difficulty:** 5/10 | **File changes:** ~10 files

#### What needs to change

**Server:**

```
1. npm install qrcode          → QR generation library
2. Reservation entity          → Thêm qrCodeUrl (string, nullable)
3. ReservationsService         → Khi tạo reservation:
   - Generate QR từ reservationCode
   - Lưu qrCodeUrl vào reservation
   - Endpoint GET /reservations/:id/qr (trả về QR image)
4. MerchantController          → POST /merchant/orders/scan
   Body: { reservationCode }
   Action: xác nhận pickup, dùng optimistic lock
5. MerchantService             → scanAndConfirm(code): tìm reservation theo code,
                                  check deal thuộc store của merchant,
                                  set status = CONFIRMED
```

**Client:**

```
1. npm install qrcode          → QR generation (client-side fallback)
2. CustomerQRView.vue          → Hiển thị QR cho customer khi đến pickup
3. MerchantScannerView.vue     → Camera scanner cho merchant
4. npm install html5-qrcode    → QR scanning library
5. MerchantOrdersView.vue      → Thêm nút "Scan QR" trên mỗi đơn
```

#### Pickup Flow

```
Customer đến store
    │
    ▼
Customer mở app → My Reservations → Tap "Show QR"
    │
    ▼
QR code hiển thị (chứa reservationCode)
    │
    ▼
Merchant mở Merchant Dashboard → Scan QR
    │
    ▼
Camera scan → POST /merchant/orders/scan
    │
    ▼
Server verify: code hợp lệ, deal thuộc store, chưa confirmed
    │
    ▼
Reservation → CONFIRMED, thời gian confirmedAt
    │
    ▼
Socket.IO emit: reservation:confirmed (cập nhật real-time)
    │
    ▼
Customer thấy "Pickup successful!" + review prompt
    │
    ▼
[Future] Payment released từ escrow
```

---

### P1: Payment Integration (MoMo/VNPay)
**Impact:** 10/10 | **Difficulty:** 7/10 | **File changes:** ~20 files

#### Architecture

```
┌─────────────┐    ┌───────────────┐    ┌─────────────┐
│  Customer   │───▶│  Foodly API   │───▶│  MoMo/VNPay │
│  (Vue App)  │◀───│  (NestJS)     │◀───│              │
└─────────────┘    │               │    └─────────────┘
                   │  ┌──────────┐ │
                   │  │ Payment  │ │    ┌─────────────┐
                   │  │ Service  │ │───▶│  Merchant   │
                   │  └──────────┘ │    │  (Payout)   │
                   └───────────────┘    └─────────────┘
```

#### What needs to change

**Server:**

```
1. Payment entity          → payment_transactions table:
   id, reservationId, userId, merchantId, amount, currency,
   status (pending|held|captured|refunded|failed),
   provider (momo|vnpay|stripe), providerTransactionId,
   capturedAt, refundedAt, createdAt, updatedAt

2. Payout entity           → merchant_payouts table:
   id, merchantId, amount, status (pending|processed|failed),
   bankAccount, bankName, requestedAt, processedAt

3. PaymentModule           → Module mới
4. PaymentService          → createPayment() — tạo payment khi reserve
                             capturePayment() — capture khi pickup confirmed
                             refundPayment() — refund khi cancel
                             processPayout() — chuyển tiền cho merchant

5. MomoService             → MoMo API integration
   - POST /v2/gateway/api/create — tạo payment URL
   - Xử lý IPN (Instant Payment Notification)
   - Xác minh signature

6. VnPayService            → VNPay API integration
   - Tạo payment URL với vnp_* params
   - Xử lý return URL + IPN
   - Xác minh checksum

7. Reservation flow        → Sửa reserve():
   - Sau khi reserve thành công → tạo payment PENDING
   - Trả về payment URL (MoMo/VNPay redirect)
   - Khi payment confirmed → set reservation ACTIVE
   
8. MerchantController      → GET /merchant/payouts (lịch sử thanh toán)
                             POST /merchant/payouts/request (yêu cầu rút tiền)
                             PUT /merchant/bank-account (cập nhật tài khoản)

9. PaymentWebhookController → POST /api/payments/momo/ipn
                              POST /api/payments/vnpay/ipn
                              (không cần auth, dùng signature verification)
```

**Client:**

```
1. PaymentMethodView.vue      → Chọn MoMo/VNPay/Stripe
2. PaymentResultView.vue      → Success/Failure page
3. MerchantPayoutsView.vue    → Lịch sử + yêu cầu rút tiền
4. MerchantBankView.vue       → Quản lý tài khoản ngân hàng
5. stores/payment.store.ts    → Payment state management
```

#### Payment Flow

```
1. Customer reserve deal
2. Hệ thống tạo reservation (ACTIVE) + payment (PENDING)
3. Customer redirected đến MoMo/VNPay payment page
4. Customer thanh toán
5. MoMo/VNPay gửi IPN đến webhook
6. Payment → CONFIRMED (held in escrow)
7. 15 min hold timer bắt đầu
8. Customer đến store pickup
9. Merchant scan QR → CONFIRM pickup
10. Payment → CAPTURED (release to merchant)
11. Nếu cancel/hết hạn → Payment → REFUNDED

Nếu ko thanh toán trong 5 phút → reservation + payment auto-cancel
```

#### MoMo Integration Details

```
Endpoint: POST https://test-payment.momo.vn/v2/gateway/api/create
Headers: Content-Type: application/json
Body:
{
  "partnerCode": "MOMO_...",
  "partnerName": "Foodly",
  "storeId": "...",
  "requestId": "...",
  "amount": 25000,
  "orderId": "FOODLY_RES_{reservationId}",
  "orderInfo": "Thanh toán đơn hàng Foodly",
  "redirectUrl": "https://foodly.app/payments/result",
  "ipnUrl": "https://api.foodly.app/api/payments/momo/ipn",
  "requestType": "captureWallet",
  "extraData": "",
  "signature": "hmac_sha256(...)"
}
```

---

### P1: Push Notifications
**Impact:** 9/10 | **Difficulty:** 4/10 | **File changes:** ~10 files

#### What needs to change

**Server:**

```
1. npm install firebase-admin   → FCM SDK
2. Notification entity          → notifications table:
   id, userId, type, title, body, data (JSON),
   isRead, createdAt

3. NotificationModule           → Module mới
4. NotificationService          → sendPush(userId, title, body, data)
                                  saveNotification(userId, type, title, body, data)
                                  getNotifications(userId)
                                  markAsRead(notificationId)

5. FirebaseService              → Initialize Firebase Admin SDK
                                  sendToDevice(fcmToken, payload)

6. User entity                  → Thêm fcmToken (string, nullable)

7. Các service gọi notification:
   - ReservationsService → Gửi khi: reserve thành công, sắp hết hạn (13 min),
                            pickup confirmed, cancelled
   - DealsService → Gửi khi: deal mới từ store theo dõi, deal sắp hết hạn
   - MerchantService → Gửi khi: có đơn mới, pickup sắp đến
   - AdminService → Gửi khi: merchant được verify/reject

8. NotificationController       → GET /api/notifications
                                  PUT /api/notifications/:id/read
                                  PUT /api/notifications/read-all
                                  POST /api/notifications/fcm-token (register FCM token)
```

**Client:**

```
1. NotificationBell.vue         → Icon chuông + badge count
2. NotificationPanel.vue        → Dropdown list notifications
3. NotificationSettings.vue     → Cài đặt notification preferences
4. stores/notification.store.ts → State management
5. Firebase service worker      → firebase-messaging-sw.js
6. Register FCM token on login  → Trong auth flow
```

#### Notification Types

| Event | Recipient | Title | Body | Priority |
|-------|-----------|-------|------|----------|
| New order | Merchant | 🛒 Đơn hàng mới | "Khách đã đặt 2 phần Cơm bento cá hồi" | 🔴 |
| Pickup reminder | Customer | ⏰ Nhắc nhở pickup | "Đơn hàng sắp hết hạn trong 2 phút!" | 🔴 |
| Pickup confirmed | Customer | ✅ Đã xác nhận | "Cảm ơn bạn! Đã xác nhận pickup thành công" | 🟢 |
| Reservation expired | Customer | ⏱ Đã hết hạn | "Đơn hàng Cơm bento cá hồi đã hết hạn" | 🟡 |
| Merchant verified | Merchant | ✅ Đã duyệt | "Tài khoản merchant của bạn đã được duyệt!" | 🟢 |
| Merchant rejected | Merchant | ❌ Không duyệt | "Lý do: Giấy tờ không hợp lệ" | 🔴 |
| Daily summary | Merchant | 📊 Báo cáo cuối ngày | "Hôm nay bạn đã bán 47 đơn, doanh thu 1,250,000đ" | 🟡 |
| New deal from store | Customer | 🆕 Deal mới | "Circle K Nguyễn Huệ vừa đăng Cơm gà sốt cay" | 🟢 |

---

### P1: Merchant Analytics
**Impact:** 9/10 | **Difficulty:** 5/10 | **File changes:** ~8 files

#### What needs to change

**Server:**

```
1. MerchantAnalyticsService     → getMerchantDashboard(merchantId, period)
                                  getRevenueChart(merchantId, from, to)
                                  getProductPerformance(merchantId, from, to)
                                  getHourlyDistribution(merchantId, from, to)
                                  getDailySummary(merchantId)

2. MerchantController           → GET /merchant/analytics/dashboard
                                  GET /merchant/analytics/revenue?from=&to=
                                  GET /merchant/analytics/products?from=&to=
                                  GET /merchant/analytics/hours?from=&to=
                                  GET /merchant/analytics/export?format=csv|pdf

3. AnalyticsAggregation         → SQL queries aggregating từ reservations + deals:
   - Revenue: SUM(deal.discountPrice) WHERE reservation.confirmedAt IN range
   - Orders: COUNT(reservations) GROUP BY date
   - Products: GROUP BY deal.title ORDER BY COUNT DESC
   - Hours: GROUP BY strftime('%H', reservedAt)
   - Conversion: reservations / deal views
```

**Client:**

```
1. MerchantDashboardView.vue    → Tích hợp biểu đồ Chart.js
   - Revenue chart (7-day / 30-day)
   - Orders chart (line)
   - Product ranking (bar)
   - Hourly heatmap

2. MerchantReportsView.vue      → Báo cáo chi tiết + export

3. npm install vue-chartjs      → Đã có trong dependencies
   chart.js

4. Các component Chart:
   - RevenueChart.vue
   - OrdersTrendChart.vue
   - ProductPerformanceChart.vue
   - HourlyDistributionChart.vue
```

#### Analytics Metrics

| Metric | Source | Tính toán |
|--------|--------|-----------|
| Doanh thu hôm nay | Reservation | SUM(discountPrice) WHERE confirmedAt = TODAY AND deal.storeId IN merchantStores |
| Tổng đơn hôm nay | Reservation | COUNT(*) WHERE reservedAt = TODAY AND deal.storeId IN merchantStores |
| Đơn đang chờ pickup | Reservation | COUNT(*) WHERE status = 'active' AND deal.storeId IN merchantStores |
| Tỉ lệ pickup | Reservation | COUNT(confirmed) / COUNT(active) * 100 |
| Sản phẩm bán chạy | Reservation | GROUP BY dealId ORDER BY COUNT DESC LIMIT 10 |
| Giờ cao điểm | Reservation | GROUP BY HOUR(reservedAt) |
| Doanh thu 7 ngày | Reservation | GROUP BY DATE(confirmedAt) SUM(discountPrice) |
| Tồn kho thấp | Deal | WHERE remainingQuantity < 3 AND storeId IN merchantStores |

---

## 3. Dependency Graph

```
Merchant Registration ───▶ Merchant Dashboard ───▶ Merchant Analytics
        │                                                │
        ▼                                                ▼
Store Ownership ◀─────────────────────────────────── Merchant Metrics
        │
        ▼
QR Pickup System ───▶ Payment Integration
        │                    │
        ▼                    ▼
Confirm Pickup ◀─────── Release Escrow
        │
        ▼
Push Notification ───▶ Notification on Pickup
```

### Thứ tự triển khai khuyến nghị

```
Phase 1 (Foundation) ─── 7-10 ngày
  Merchant Registration & Verification
  Store Ownership (userId trên Store)
  └── prerequisite cho mọi thứ

Phase 2 (Core Operations) ─── 7-10 ngày  
  Merchant Dashboard
  QR Pickup System
  └── tạo luồng operation cơ bản

Phase 3 (Revenue) ─── 10-14 ngày
  Payment Integration (MoMo/VNPay)
  └── cần merchant + dashboard + QR trước

Phase 4 (Growth) ─── 5-7 ngày
  Push Notifications
  Merchant Analytics
  └── có thể chạy song song
```

---

## 4. Phased Rollout

### Phase 1 — Foundation (Days 1-7)

**Mục tiêu:** Merchant có thể đăng ký, được duyệt, quản lý store.

| Day | Task | Files |
|-----|------|-------|
| 1 | User entity: thêm role `merchant`, fields mới | `user.entity.ts` |
| 1 | UserRole enum: thêm MERCHANT | `user.entity.ts` |
| 2 | Auth: `POST /auth/register/merchant` | `auth.controller.ts`, `auth.service.ts` |
| 2 | Admin: duyệt/từ chối merchant | `admin.controller.ts`, `admin.service.ts` |
| 3 | Store entity: thêm `userId` | `store.entity.ts` |
| 3 | StoresService: ownership check | `stores.service.ts` |
| 4 | MerchantModule + Controller | `merchant/` |
| 4 | `GET /merchant/profile`, `PUT /merchant/profile` | `merchant.controller.ts` |
| 5 | Client: `RegisterMerchantView.vue` | Client |
| 6 | Client: `MerchantProfileView.vue` | Client |
| 6 | Client: `AdminMerchantsView.vue` | Client |
| 7 | Router updates + auth store | `router/index.ts`, `auth.store.ts` |
| 7 | E2E tests cho merchant registration | `test/` |

**Deliverable:** Merchant đăng ký → Admin duyệt → Merchant login thấy profile.

### Phase 2 — Core Operations (Days 8-14)

**Mục tiêu:** Merchant dashboard + QR pickup flow hoàn chỉnh.

| Day | Task | Files |
|-----|------|-------|
| 8 | `GET /merchant/dashboard` | `merchant.controller.ts` |
| 8 | `GET /merchant/orders` | `merchant.controller.ts` |
| 9 | `PUT /merchant/orders/:id/confirm-pickup` | `merchant.controller.ts` |
| 9 | QR generation trên server | `reservations.service.ts` |
| 10 | Client: `MerchantDashboardView.vue` | Client |
| 10 | Client: `MerchantOrdersView.vue` | Client |
| 11 | Client: Merchant layout + nav | Client |
| 11 | QR scan: `MerchantScannerView.vue` | Client |
| 12 | QR display: `CustomerQRView.vue` | Client |
| 12 | `GET /reservations/:id/qr` | `reservations.controller.ts` |
| 13 | Socket.IO: reservation:confirmed | `socket.gateway.ts` |
| 13 | Client real-time cập nhật dashboard | Client |
| 14 | E2E tests: QR scan → confirm pickup | `test/` |

**Deliverable:** Customer đặt → nhận QR → Merchant scan → pickup confirmed real-time.

### Phase 3 — Revenue (Days 15-24)

**Mục tiêu:** Thanh toán online qua MoMo/VNPay.

| Day | Task | Files |
|-----|------|-------|
| 15 | Payment entity + Payout entity | New entities |
| 16 | `PaymentService.createPayment()` | `payment.service.ts` |
| 16 | MoMo integration: tạo payment URL | `momo.service.ts` |
| 17 | VNPay integration: tạo payment URL | `vnpay.service.ts` |
| 17 | Payment webhooks (IPN) | `payment-webhook.controller.ts` |
| 18 | Sửa reservation flow: reserve → payment → confirm | `reservations.service.ts` |
| 19 | Escrow: held → captured on pickup | `payment.service.ts` |
| 19 | Refund: cancel/hết hạn → refund | `payment.service.ts` |
| 20 | Merchant payout: `GET /merchant/payouts` | `merchant.controller.ts` |
| 20 | Merchant bank account: `PUT /merchant/bank-account` | `merchant.controller.ts` |
| 21 | Client: `PaymentMethodView.vue` | Client |
| 21 | Client: `PaymentResultView.vue` | Client |
| 22 | Client: `MerchantPayoutsView.vue` | Client |
| 22 | Client: `MerchantBankView.vue` | Client |
| 23 | Integration test: payment → pickup → payout | `test/` |
| 24 | Security audit: signature verification, webhook validation | Security |

**Deliverable:** Customer thanh toán MoMo/VNPay → tiền giữ escrow → pickup xong → merchant nhận tiền.

### Phase 4 — Growth (Days 25-31)

**Mục tiêu:** Push notification + merchant analytics.

| Day | Task | Files |
|-----|------|-------|
| 25 | Firebase Admin SDK setup | `firebase.service.ts` |
| 25 | Notification entity | `notification.entity.ts` |
| 26 | `NotificationService.sendPush()` | `notification.service.ts` |
| 26 | Register FCM token endpoint | `notification.controller.ts` |
| 27 | Gắn notification vào các service | `reservations.service.ts`, `deals.service.ts` |
| 28 | Client: `NotificationBell.vue` + panel | Client |
| 28 | Firebase SW + FCM token registration | Client |
| 28 | `NotificationSettingsView.vue` | Client |
| 29 | `MerchantAnalyticsService` | `merchant-analytics.service.ts` |
| 29 | Analytics endpoints | `merchant.controller.ts` |
| 30 | Client: `MerchantReportsView.vue` + Chart.js | Client |
| 31 | Export CSV/PDF | `merchant.controller.ts` |

**Deliverable:** Push notification đa kênh + merchant analytics dashboard.

---

## 5. Database Migration Plan

### New Tables

```sql
-- Payment transactions
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  merchant_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  status VARCHAR(20) DEFAULT 'pending',
    -- pending | held | captured | refunded | failed
  provider VARCHAR(20) NOT NULL,
    -- momo | vnpay | stripe
  provider_transaction_id VARCHAR(255),
  provider_response JSONB,
  captured_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant payouts
CREATE TABLE merchant_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
    -- pending | processing | completed | failed
  bank_account VARCHAR(50),
  bank_name VARCHAR(100),
  bank_holder_name VARCHAR(100),
  notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
    -- new_order | pickup_reminder | pickup_confirmed | reservation_expired
    -- merchant_verified | merchant_rejected | new_deal | daily_summary
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Existing Table Modifications

```sql
-- User table: thêm merchant fields
ALTER TABLE users ADD COLUMN business_name VARCHAR(200);
ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN business_registration_id VARCHAR(50);
ALTER TABLE users ADD COLUMN is_verified_merchant BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN rejected_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN rejection_reason TEXT;
ALTER TABLE users ADD COLUMN fcm_token TEXT;
ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(50);
ALTER TABLE users ADD COLUMN bank_name VARCHAR(100);
ALTER TABLE users ADD COLUMN bank_holder_name VARCHAR(100);

-- Thêm enum value: MERCHANT vào role column
-- (TypeORM synchronize sẽ handle)

-- Store table: thêm owner
ALTER TABLE stores ADD COLUMN user_id UUID REFERENCES users(id);
ALTER TABLE stores ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE stores ADD COLUMN phone_number VARCHAR(20);

-- Reservation table: thêm QR URL
ALTER TABLE reservations ADD COLUMN qr_code_url TEXT;
```

---

## 6. Full API Endpoint Map

### Merchant Endpoints (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register/merchant` | No | Đăng ký merchant |
| GET | `/api/merchant/profile` | merchant | Hồ sơ merchant |
| PUT | `/api/merchant/profile` | merchant | Cập nhật hồ sơ |
| POST | `/api/merchant/documents` | merchant | Upload giấy tờ |
| GET | `/api/merchant/dashboard` | merchant | Dashboard tổng quan |
| GET | `/api/merchant/orders` | merchant | Danh sách đơn hàng |
| GET | `/api/merchant/orders/:id` | merchant | Chi tiết đơn |
| PUT | `/api/merchant/orders/:id/confirm` | merchant | Xác nhận pickup (QR) |
| POST | `/api/merchant/orders/scan` | merchant | Scan QR confirm |
| GET | `/api/merchant/deals` | merchant | Quản lý deal |
| POST | `/api/merchant/deals` | merchant | Tạo deal nhanh |
| PUT | `/api/merchant/deals/:id/pause` | merchant | Tạm dừng deal |
| PUT | `/api/merchant/deals/:id/activate` | merchant | Kích hoạt deal |
| GET | `/api/merchant/payouts` | merchant | Lịch sử thanh toán |
| POST | `/api/merchant/payouts/request` | merchant | Yêu cầu rút tiền |
| PUT | `/api/merchant/bank-account` | merchant | Cập nhật tài khoản NH |
| GET | `/api/merchant/analytics/dashboard` | merchant | Analytics dashboard |
| GET | `/api/merchant/analytics/revenue` | merchant | Biểu đồ doanh thu |
| GET | `/api/merchant/analytics/products` | merchant | Top sản phẩm |
| GET | `/api/merchant/analytics/hours` | merchant | Phân bổ giờ |
| GET | `/api/merchant/analytics/export` | merchant | Export CSV/PDF |

### Admin Endpoints (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/merchants` | admin | List merchants (pending) |
| GET | `/api/admin/merchants/:id` | admin | Chi tiết merchant |
| POST | `/api/admin/merchants/:id/verify` | admin | Duyệt merchant |
| POST | `/api/admin/merchants/:id/reject` | admin | Từ chối merchant |
| GET | `/api/admin/payouts` | admin | Danh sách payout |
| PUT | `/api/admin/payouts/:id/process` | admin | Xử lý payout |

### Reservation Endpoints (Modified)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reservations/:id/qr` | user | QR code image |

### Notification Endpoints (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | user | List notifications |
| PUT | `/api/notifications/:id/read` | user | Mark as read |
| PUT | `/api/notifications/read-all` | user | Mark all as read |
| POST | `/api/notifications/fcm-token` | user | Register FCM token |

### Payment Endpoints (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/momo/ipn` | No (signed) | MoMo webhook |
| POST | `/api/payments/vnpay/ipn` | No (signed) | VNPay webhook |
| GET | `/api/payments/:id/status` | user | Check payment status |

---

## 7. Client Routes & Views

### New Routes

| Path | Name | Auth | Role | View Component |
|------|------|------|------|----------------|
| `/merchant` | MerchantHome | Yes | merchant | `MerchantDashboardView.vue` |
| `/merchant/orders` | MerchantOrders | Yes | merchant | `MerchantOrdersView.vue` |
| `/merchant/orders/:id` | MerchantOrderDetail | Yes | merchant | `MerchantOrderDetail.vue` |
| `/merchant/deals` | MerchantDeals | Yes | merchant | `MerchantDealsView.vue` |
| `/merchant/scan` | MerchantScanner | Yes | merchant | `MerchantScannerView.vue` |
| `/merchant/analytics` | MerchantAnalytics | Yes | merchant | `MerchantReportsView.vue` |
| `/merchant/payouts` | MerchantPayouts | Yes | merchant | `MerchantPayoutsView.vue` |
| `/merchant/settings` | MerchantSettings | Yes | merchant | `MerchantSettingsView.vue` |
| `/register/merchant` | RegisterMerchant | No | - | `RegisterMerchantView.vue` |
| `/reservations/:id/qr` | ReservationQR | Yes | user | `CustomerQRView.vue` |
| `/payments/result` | PaymentResult | Yes | user | `PaymentResultView.vue` |
| `/notifications` | Notifications | Yes | user | `NotificationsView.vue` |
| `/admin/merchants` | AdminMerchants | Yes | admin | `AdminMerchantsView.vue` |
| `/admin/payouts` | AdminPayouts | Yes | admin | `AdminPayoutsView.vue` |

### Modified Existing Routes

| Path | Change |
|------|--------|
| `/profile` | Thêm merchant section nếu role = merchant |
| `/profile/deals` | Merchant thấy store selector khi tạo deal |
| `/profile/reservations` | Thêm nút "Show QR" cho mỗi reservation |

### Navigation Structure (Merchant)

```
Merchant Layout
├── 📊 Dashboard (/)            ─── MerchantDashboardView
├── 📋 Orders (/orders)         ─── MerchantOrdersView
├── 📦 Deals (/deals)           ─── MerchantDealsView
├── 📈 Analytics (/analytics)   ─── MerchantReportsView
├── 💰 Payouts (/payouts)       ─── MerchantPayoutsView
├── 📱 Scan QR (/scan)          ─── MerchantScannerView
└── ⚙️ Settings (/settings)     ─── MerchantSettingsView
```

---

## 8. Estimated Effort

| Feature | Server (days) | Client (days) | Test (days) | Total |
|---------|:------------:|:-------------:|:-----------:|:-----:|
| Merchant Registration & Verification | 2 | 2 | 1 | **5 days** |
| Merchant Dashboard | 2 | 3 | 1 | **6 days** |
| QR Pickup System | 1.5 | 2 | 1 | **4.5 days** |
| Payment Integration (MoMo/VNPay) | 5 | 3 | 2 | **10 days** |
| Push Notifications | 2 | 2 | 1 | **5 days** |
| Merchant Analytics | 2 | 2 | 1 | **5 days** |
| **TOTAL** | **14.5** | **14** | **7** | **~35.5 days** |

### Rút gọn (Parallel)

Với 2 developers làm song song:

| Phase | Duration | Developers | 
|-------|----------|------------|
| Phase 1: Foundation | 5 days | Dev A (BE) + Dev B (FE) |
| Phase 2: Core Operations | 5 days | Dev A (BE) + Dev B (FE) |
| Phase 3: Revenue | 8 days | Dev A (BE) + Dev B (FE) |
| Phase 4: Growth | 5 days | Dev A (BE) + Dev B (FE) |
| **Total** | **~23 days** | 2 developers |

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| MoMo/VNPay API thay đổi | Medium | High | Abstract layer, test sandbox, webhook idempotency |
| Bảo mật payment webhook | Low | Critical | Signature verification, IP whitelist, rate limit |
| QR scan không hoạt động trên thiết bị cũ | Medium | Medium | Fallback: nhập mã thủ công |
| Merchant gian lận pickup không có thật | Medium | High | Geolocation verification, audit log, photo proof |
| Firebase FCM bị chặn ở Trung Quốc | Low | Medium | Fallback: Socket.IO + email |
| Payment escrow lỗi → mất tiền | Low | Critical | Manual reconciliation tool, test automation, gradual rollout |
| Database migration lỗi | Low | High | Backup trước migrate, rollback plan |
