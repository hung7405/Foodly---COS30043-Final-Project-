# Foodly — Consumer Flow (Từ Truy Cập Đến Nhận Sản Phẩm)

## Tổng Quan Các Scenario

| # | Scenario | Mô tả | Độ phổ biến |
|---|----------|-------|-------------|
| A | **Happy Path** | Guest → browse → register → reserve → pickup → done | ~60% |
| B | **Returning User** | Login → reserve nhanh → pickup | ~25% |
| C | **Sold Out** | Reserve khi deal hết hàng | ~8% |
| D | **Hết giờ pickup** | Reserved nhưng không kịp pickup | ~3% |
| E | **Huỷ reservation** | Chủ động cancel | ~2% |
| F | **Lỗi network** | Mất kết nối giữa chừng | ~1% |
| G | **Lần đầu tiên** | Chưa biết app, cần onboarding | ~5% |
| H | **AI Search** | Tìm deal bằng ảnh chụp | ~3% |
| I | **Click link chia sẻ** | Vào thẳng deal từ link ngoài | ~3% |
| J | **Store đã đóng cửa** | Đến store nhưng không pickup được | ~1% |

---

## Chi Tiết Từng Scenario

---

### A. Happy Path (Luồng Chuẩn)

```
[A0] USER MỞ APP
     ├── Trạng thái: chưa login (hoặc token hết hạn)
     ├── Màn hình: Landing Page (/)
     │   ├── Hero: "Discover Fresh Deals. Near You. Now."
     │   ├── Featured Deals (top 6 deal đang hot)
     │   ├── Live Stats Socket: "234 deals · 89 reservations · 12 new today"
     │   └── CTA: "Start Exploring" → /explore
     └── Gọi API: GET /api/deals/featured (public)

[A1] BROWSE DEAL
     ├── Màn hình: Explore Map (/explore)
     ├── Gọi API: GET /api/deals?lat=10.78&lng=106.69&radius=5000 (public)
     ├── UI:
     │   ├── Leaflet Map: markers cluster theo vị trí
     │   ├── Sidebar: virtual scroll list (100+ deals)
     │   ├── Search bar: text search (autocomplete, 300ms debounce)
     │   ├── Filter chips: Category | Price range | Khoảng cách
     │   └── Sort dropdown: Mới nhất | Giá thấp | Gần hết hạn | Gần nhất
     ├── Socket.IO subscribe: deal:created (deal mới tự động xuất hiện)
     └── Người dùng pan map → refetch deals trong bounds (throttle 500ms)

[A2] XEM DEAL DETAIL
     ├── Click 1 marker hoặc 1 card trong sidebar
     ├── Màn hình: Deal Detail slide-over panel (hoặc /deals/:id nếu mobile)
     ├── Gọi API: GET /api/deals/:id (public)
     ├── UI:
     │   ├── Gallery ảnh (swipe horizontal)
     │   ├── Giá: 💰 25,000 → 10,000 (-60%)
     │   ├── ⏱ Countdown: "Expires in 2h 34m" (real-time, WebSocket sync)
     │   ├── 📍 Store info: tên, địa chỉ, khoảng cách, "Get Directions" (Google Maps URL)
     │   ├── ⭐ Trust Score: 4.8 (dựa trên tỉ lệ pickup thành công)
     │   ├── 📦 Quantity: "5/15 remaining"
     │   ├── 🏷 Tags: #cơmgà #bento #trưa
     │   ├── 💬 Comments: scroll list, real-time comment mới
     │   ├── Bookmark toggle (❤️): nếu đã login
     │   └── Nút "🛒 Reserve Now" (nếu chưa login → redirect /login)
     └── Side effect: lưu vào recently viewed (localStorage)

[A3] REGISTER (nếu chưa có tài khoản)
     ├── Màn hình: /register
     ├── Form: email | username | password | confirm password | full name
     ├── Validation:
     │   ├── Client-side: regex email, password ≥ 8 ký tự
     │   ├── Server-side: unique email + username
     │   └── Loading state: button "Creating account..."
     ├── Gọi API: POST /api/auth/register
     ├── Thành công:
     │   ├── Response: { accessToken, refreshToken, user }
     │   ├── Client: lưu token vào localStorage + auto redirect về deal detail
     │   ├── Socket.IO: reconnect với token mới
     │   └── Toast: "✅ Welcome to Foodly, [name]!"
     └── Thất bại:
         ├── 409: "Email already registered" → focus email field
         ├── 400: Validation error → show từng field
         └── 500: "Server error, try again" → toast + retry

[A4] RESERVE DEAL
     ├── Màn hình: Deal Detail panel (đã login)
     ├── Click "🛒 Reserve Now"
     ├── Gọi API: POST /api/deals/:id/reserve (cần auth)
     ├── Client-side:
     │   ├── Optimistic UI: quantity giảm ngay, button → loading "Reserving..."
     │   ├── Timeout: 10 giây nếu không response → toast "Taking longer than usual"
     │   └── Retry: nếu timeout → auto retry 1 lần
     ├── Thành công (HTTP 201):
     │   ├── Response: { reservationId, qrCodeUrl, expiresAt }
     │   ├── UI chuyển sang màn hình "Reserved! 🎉"
     │   │   ├── QR Code lớn (dùng để scan ở store)
     │   │   ├── ⏱ Countdown: "Show this QR within 14:59"
     │   │   ├── 📍 Store address + "Get Directions"
     │   │   └── Nút "View My Reservations"
     │   ├── Socket.IO:
     │   │   ├── Server gửi reservation:created → client cập nhật quantity real-time
     │   │   └── Server gửi notification: "Your reservation at [store] is confirmed!"
     │   └── Side effect: push notification browser (nếu được permission)
     └── Thất bại (HTTP 409):
         ├── Response: { error: "INSUFFICIENT_QUANTITY", available: 0 }
         ├── UI:
         │   ├── Toast: "❌ Sorry, this deal just sold out!"
         │   ├── Button → "🔔 Notify me when available" (gọi POST /api/deals/:id/notify)
         │   └── Quantity hiển thị "0 remaining"
         └── Socket.IO: đã cập nhật quantity real-time trước đó

[A5] ĐẾN STORE PICKUP
     ├── Màn hình: My Reservations (/profile/reservations)
     ├── Gọi API: GET /api/reservations (cần auth)
     ├── UI:
     │   ├── List reservation: Active (pickup window) | Completed | Cancelled | Expired
     │   ├── Mỗi item:
     │   │   ├── Deal ảnh + tên + store
     │   │   ├── ⏱ Countdown (nếu active)
     │   │   ├── Status badge (🟢 Active | ✅ Completed | ❌ Expired | 🚫 Cancelled)
     │   │   └── "Show QR" button → full-screen QR
     │   └── QR Full-screen:
     │       ├── QR code + reservation code (text)
     │       ├── ⏱ Countdown lớn
     │       ├── Nút "I'm at the store" → gửi notification đến merchant
     │       └── Nút "Cancel" (nếu muốn huỷ)
     ├── Tại store:
     │   ├── Merchant scan QR (hoặc nhập mã)
     │   ├── Socket.IO: reservation:confirmed event
     │   ├── Client nhận event → chuyển status → ✅ Completed
     │   ├── Toast: "✅ Pickup successful! Enjoy your [deal name]"
     │   └── UI tự động chuyển về danh sách + show confetti animation
     └── Side effect:
         ├── Tăng trust score cho user + store
         └── Gửi email (hoặc in-app notification): "How was your experience?"

[A6] SAU PICKUP (POST-PURCHASE)
     ├── Màn hình: Deal Review prompt (modal)
     │   ├── ⭐ Star rating (1-5)
     │   ├── 📝 Optional comment
     │   ├── 📸 Upload ảnh đồ ăn thực tế
     │   └── Nút "Submit Review"
     ├── Gọi API: POST /api/deals/:id/review (cần auth)
     ├── UI:
     │   ├── Nếu submit → "Thanks for your review!"
     │   ├── Nếu bỏ qua → toast "You can review later in your history"
     │   └── Review xuất hiện real-time trong comment section
     └── Kết thúc: quay lại Explore để tìm deal mới
```

---

### B. Returning User (Người Dùng Cũ)

```
[B0] MỞ APP (đã có token trong localStorage)
     ├── Client kiểm tra token:
     │   ├── Còn hạn → auto navigate đến /explore
     │   └── Hết hạn → auto refresh token (POST /api/auth/refresh)
     │       ├── Thành công → lưu token mới, navigate /explore
     │       └── Thất bại (refresh hết hạn) → redirect /login
     ├── Gọi API: GET /api/users/me (lấy profile + prefs)
     └── Socket.IO: connect với token

[B1] RESERVE NHANH (1-CLICK)
     ├── Explore Map → thấy deal quen thuộc (bookmark / recent)
     ├── Click marker → Deal Detail panel
     ├── Thấy quantity "10/15" → click "Reserve Now"
     ├── (Không cần login lại)
     ├── Gọi API: POST /api/deals/:id/reserve
     ├── Thành công → QR code hiển thị
     └── Lên đường đến store pickup

[B2] THEO DÕI DEAL YÊU THÍCH
     ├── Mở Saved (/profile/bookmarks)
     ├── Gọi API: GET /api/bookmarks (cần auth)
     ├── Thấy danh sách deal đã bookmark
     ├── Click "🔔 Get notified" → subscribe deal restock
     └── Socket.IO: nhận notification khi deal có hàng lại
```

---

### C. Sold Out (Hết Hàng Khi Reserve)

```
[C0] USER XEM DEAL
     ├── Deal Detail hiển thị quantity = 1 (sắp hết)
     ├── Countdown deal còn 5 phút
     └── Nút Reserve vẫn active

[C1] CLICK RESERVE
     ├── Optimistic UI: quantity → 0, loading
     ├── Gọi API: POST /api/deals/:id/reserve
     ├── Trong lúc chờ:
     │   ├── Socket.IO nhận deal:quantity_update → quantity = 0
     │   └── (Người khác vừa reserve trước)
     └── Response 409:
         ├── Client rollback optimistic UI → quantity = 0
         ├── Toast: "❌ Just missed it! Someone grabbed it first."
         ├── Button: "🔔 Notify me" → gọi POST /api/deals/:id/notify
         └── Button: "View Similar Deals" → search deals cùng store/category

[C2] XỬ LÝ NOTIFY
     ├── Gọi API: POST /api/deals/:id/notify
     ├── Response: { subscribed: true }
     ├── UI: "✅ We'll notify you when this deal restocks"
     └── Khi restock: Socket.IO push notification → user click → reserve lại
```

---

### D. Hết Giờ Pickup (Reservation Expired)

```
[D0] USER RESERVED NHƯNG CHƯA ĐẾN STORE
     ├── QR screen hiển thị countdown: 10:00 → 5:00 → 1:00
     ├── Socket.IO nhận timer sync (đồng bộ thời gian thực)
     ├── UI nhắc nhở:
     │   ├── 5 phút: toast "⏰ 5 minutes left to pick up!"
     │   ├── 2 phút: toast + vibration mobile
     │   └── 30 giây: modal "Hurry! Your reservation is about to expire!"

[D1] HẾT GIỜ
     ├── Socket.IO nhận reservation:expired
     ├── UI chuyển status → ❌ Expired
     ├── Toast: "⏰ Reservation expired. The deal is now available again."
     ├── Quantity deal được restore + real-time update
     ├── Modal gợi ý:
     │   ├── "🔔 Notify me when this deal restocks"
     │   ├── "🔄 Reserve again" (nếu còn hàng)
     │   └── "👎 Not interested" ← dismiss
     └── Side effect:
         ├── Trust score user giảm nhẹ
         └── Store nhận notification: "Reservation [code] expired"
```

---

### E. Huỷ Reservation Chủ Động

```
[E0] USER MUỐN HUỶ
     ├── Mở /profile/reservations
     ├── Click vào reservation active
     ├── Nút "Cancel Reservation" (màu đỏ, có confirmation)
     └── Click → Modal: "Are you sure? This cannot be undone."

[E1] XÁC NHẬN HUỶ
     ├── Gọi API: DELETE /api/reservations/:id (cần auth)
     ├── UI: loading "Cancelling..."
     ├── Thành công (200):
     │   ├── UI: status → 🚫 Cancelled, animation fade out
     │   ├── Toast: "✅ Reservation cancelled"
     │   ├── Socket.IO: quantity deal +1, real-time update
     │   └── Modal: "Would you like to see other deals at this store?"
     └── Thất bại:
         ├── 404: reservation không tồn tại → redirect list
         └── 400: "Cannot cancel, already picked up" → refresh list
```

---

### F. Lỗi Network / Server

```
[F0] MẤT KẾT NỐI INTERNET
     ├── Client detect: navigator.onLine = false
     ├── UI: banner "⚠️ You're offline. Some features may be unavailable."
     ├── Socket.IO: disconnect
     ├── Local state: deal browse vẫn xem được (cache)
     ├── Reserve: button disabled + tooltip "You need internet to reserve"
     └── Khi online lại: auto reconnect Socket.IO + refetch data

[F1] API LỖI 5XX
     ├── Gọi API bất kỳ → response 500
     ├── UI: toast "Something went wrong. Please try again."
     ├── Retry logic:
     │   ├── GET: auto retry 2 lần (1s, 3s delay)
     │   ├── POST (reserve): auto retry 1 lần, nếu fail → show "Try again" button
     │   └── Không retry: DELETE, PATCH idempotent
     └── Nếu 3 lần đều fail → modal: "Our servers are having trouble. Check back soon."

[F2] TOKEN HẾT HẠN (401)
     ├── Gọi API → response 401
     ├── Interceptor: auto gọi POST /api/auth/refresh
     │   ├── Thành công → retry API gốc
     │   └── Thất bại → redirect /login + toast "Session expired. Please login again."
     └── User không thấy gì (silent refresh)

[F3] CONCURRENT RESERVE (RACE CONDITION)
     ├── 2 user reserve deal cuối cùng cùng lúc
     ├── Cả 2 đều optimistic UI (quantity → 0)
     ├── Server optimistic lock: 1 success, 1 fail
     ├── User thua:
     │   ├── Nhận 409 + Socket.IO quantity_update
     │   ├── UI rollback + toast "Someone got it first! Better luck next time."
     │   └── Option: "🔔 Notify me"
     └── User thắng: → QR screen bình thường
```

---

### G. Lần Đầu Tiên Dùng App

```
[G0] MỞ APP LẦN ĐẦU
     ├── Landing Page với onboarding walkthrough
     ├── Step 1: "Find fresh deals near you" (highlight map)
     ├── Step 2: "Reserve in one tap" (highlight Reserve button)
     ├── Step 3: "Show QR & pickup" (highlight QR)
     ├── Step 4: "Save money & reduce waste" (highlight savings counter)
     ├── Nút "Get Started" → /register (hoặc "Skip" → /explore)
     └── Skip → auto hiển thị tooltip trên các element lần đầu

[G1] CHƯA CÓ DEAL GẦN ĐÂY
     ├── /explore, map rỗng (không có deal trong bán kính)
     ├── UI:
     │   ├── Empty state: "No deals near you yet 🗺️"
     │   ├── CTA: "Invite stores to join" → copy link giới thiệu
     │   ├── CTA: "Expand your search radius" → slider
     │   └── Suggested: chuyển sang chế độ list view (không map)
     └── Nếu user kéo map đến khu vực khác → refetch deals

[G2] REGISTER LẦN ĐẦU
     ├── Form register (xem A3)
     ├── Sau register success:
     │   ├── Modal: "Welcome to Foodly! 🎉"
     │   ├── "Here's 5,000đ credit for your first reservation!"
     │   ├── CTA: "Find your first deal" → quay lại explore
     │   └── CTA: "How it works" → xem lại onboarding
     └── Trigger: gọi POST /api/users/welcome-bonus (tạo coupon)
```

---

### H. AI Image Search

```
[H0] MỞ AI SEARCH
     ├── Màn hình: /ai-search (từ bottom nav: 🔍 → "Search by image" tab)
     ├── UI:
     │   ├── File drop zone: "Drop an image or click to upload"
     │   ├── Camera button (mobile): chụp ảnh trực tiếp
     │   └── Text search fallback: "Or type what you're looking for"
     └── Gọi API: GET /api/ai-search/config → { supportedFormats, maxSize }

[H1] UPLOAD ẢNH
     ├── User upload ảnh (file picker / camera)
     ├── Client validation:
     │   ├── Format: jpg, png, webp
     │   ├── Size: ≤ 5MB
     │   └── Nếu không hợp lệ → toast "Please upload a valid image"
     ├── Upload progress bar (nếu file lớn)
     ├── Gọi API: POST /api/ai-search (multipart form)
     ├── Loading state: skeleton + "Analyzing your image..."
     └── Thành công:
         ├── Response: { items: [{ label: "Cơm gà sốt cay", confidence: 92 }, ...] }
         ├── UI: show kết quả nhận diện + deal matching
         ├── Mỗi item → click → /deals/:id
         └── Nếu không tìm thấy deal: "No matching deals found. Try another image or search text."

[H2] TEXT SEARCH (FALLBACK)
     ├── User gõ: "cơm gà sốt cay"
     ├── Gọi API: GET /api/deals?q=cơm+gà+sốt+cay (300ms debounce)
     ├── Autocomplete dropdown
     └── Kết quả → list deal cards
```

---

### I. Click Link Chia Sẻ (Deep Link)

```
[I0] USER NHẬN LINK CHIA SẺ
     ├── Link: https://foodly.app/deals/abc-123
     ├── Mở trên browser (mobile hoặc desktop)
     ├── Nếu cài app: mở app trực tiếp (deep link)
     └── Nếu chưa cài: mở web app PWA

[I1] XỬ LÝ DEEP LINK
     ├── Client đọc route: /deals/:id
     ├── Gọi API: GET /api/deals/:id (public)
     ├── Nếu deal tồn tại:
     │   ├── Hiển thị Deal Detail screen
     │   ├── Nếu chưa login → Reserve button redirect /login
     │   └── Nếu đã login → Reserve button active
     └── Nếu deal không tồn tại (404 / expired):
         ├── UI: "This deal is no longer available"
         ├── Suggested: "View similar deals from this store" (GET /api/stores/:id/deals)
         ├── Suggested: "Explore other deals" → /explore
         └── CTA: "Search for something else" → /ai-search

[I2] SHARE REFERRAL
     ├── User share deal:
     │   ├── Click "Share" button trên deal detail
     │   ├── Web Share API (native share sheet)
     │   └── Link: https://foodly.app/deals/:id?ref=user123
     └── Người nhận click → I1 + nếu register → referrer bonus
```

---

### J. Store Đã Đóng Cửa / Không Pickup Được

```
[J0] USER ĐẾN STORE NHƯNG CỬA ĐÓNG
     ├── User mở QR screen, click "I'm at the store"
     ├── Gọi API: POST /api/reservations/:id/arrived
     ├── Socket.IO gửi notification đến merchant
     ├── Merchant không phản hồi trong 5 phút
     └── UI: "Store hasn't responded. Try contacting them."

[J1] KHÔNG PICKUP ĐƯỢC
     ├── User gặp vấn đề:
     │   ├── Store closed (không đúng giờ)
     │   ├── Store hết hàng (deal đã hết nhưng chưa update)
     │   ├── Merchant không scan QR (không có device)
     │   └── User đến sai địa chỉ
     ├── Các nút trong UI:
     │   ├── "🔄 Report a problem" → form report
     │   │   ├── Reason: dropdown (Store closed | Out of stock | Wrong location | Other)
     │   │   ├── Description: textarea
     │   │   └── Submit → gọi POST /api/reports
     │   ├── "🔄 Extend pickup window" → POST /api/reservations/:id/extend
     │   │   └── Nếu được: +15 phút, countdown reset
     │   └── "❌ Cancel & move on" → huỷ reservation (xem E)
     └── Side effect:
         ├── Report gửi đến admin để review
         └── Store trust score giảm nếu có nhiều report
```

---

## State Machine: Reservation Lifecycle

```
                    ┌─────────────┐
                    │  PENDING    │  (vừa reserve, chờ thanh toán nếu có)
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
            ┌──────→│  ACTIVE     │  (đã confirm, QR có hiệu lực)
            │       └──────┬──────┘
            │              │
            │        ┌─────┴─────┐
            │        ▼           ▼
            │  ┌──────────┐ ┌──────────┐
            │  │ EXPIRED  │ │PICKED_UP │
            │  │ (15ph)   │ │  (done)  │
            │  └────┬─────┘ └──────────┘
            │       │
            │       ▼
            │  ┌──────────┐
            └──│CANCELLED │  (user chủ động huỷ)
               └──────────┘

    Trạng thái khác:
    ┌──────────┐    ┌───────────┐
    │NO_SHOW   │    │  REFUNDED │  (có payment)
    └──────────┘    └───────────┘
```

---

## Tổng Quan API Calls (Từ Client → Server)

| Step | Method | Endpoint | Auth | Cache |
|------|--------|----------|------|-------|
| Browse | `GET` | `/api/deals?lat=&lng=&radius=` | No | 30s |
| Featured | `GET` | `/api/deals/featured` | No | 60s |
| Deal detail | `GET` | `/api/deals/:id` | No | 15s |
| Register | `POST` | `/api/auth/register` | No | - |
| Login | `POST` | `/api/auth/login` | No | - |
| Refresh token | `POST` | `/api/auth/refresh` | Yes | - |
| Reserve | `POST` | `/api/deals/:id/reserve` | Yes | - |
| Get reservations | `GET` | `/api/reservations` | Yes | 5s |
| Cancel reservation | `DELETE` | `/api/reservations/:id` | Yes | - |
| Arrive at store | `POST` | `/api/reservations/:id/arrived` | Yes | - |
| Submit review | `POST` | `/api/deals/:id/review` | Yes | - |
| Bookmark | `POST` | `/api/bookmarks` | Yes | - |
| AI search | `POST` | `/api/ai-search` | No | - |
| Notify me | `POST` | `/api/deals/:id/notify` | Yes | - |

---

## Socket.IO Events (Client Side)

| Event | Direction | Khi nào | UI phản hồi |
|-------|-----------|---------|-------------|
| `deal:created` | Server → Client | Store tạo deal mới | Card xuất hiện real-time trên map |
| `deal:quantity_update` | Server → Client | Ai đó reserve/huỷ | Quantity cập nhật, nếu = 0 → disable Reserve |
| `deal:expired` | Server → Client | Deal hết hạn | Badge "Expired", remove khỏi featured |
| `reservation:confirmed` | Server → Client | Merchant scan QR | Status → ✅ Completed + confetti |
| `reservation:expired` | Server → Client | Hết 15 phút | Status → ❌ Expired + toast |
| `reservation:updated` | Server → Client | Merchant extend/cancel | Cập nhật countdown/status |
| `notification:new` | Server → Client | Có notification mới | Badge trên bell icon + toast |
| `comment:new` | Server → Client | Ai đó comment | Comment xuất hiện real-time |
| `live_stats` | Server → Client | 30s interval | Cập nhật "X deals · Y reservations" |

---

## Error Handling Matrix

| API Error | HTTP Code | Client Action | User Thấy Gì |
|-----------|-----------|---------------|-------------|
| Token hết hạn | 401 | Auto refresh → retry | Không thấy gì |
| Refresh hết hạn | 401 | Clear token → redirect /login | "Session expired. Please login again." |
| Email đã tồn tại | 409 | Focus email field | "This email is already registered" |
| Deal không tồn tại | 404 | Redirect /explore | "Deal not found" |
| Hết hàng | 409 | Rollback UI + show notify | "Just missed it! Someone grabbed it first." |
| Deal đã hết hạn | 400 | Disable Reserve | "This deal has expired" |
| Đã reserve rồi | 409 | Show QR hiện tại | "You already reserved this deal. Show your QR at store." |
| Store không tồn tại | 404 | Remove marker khỏi map | "This store is no longer available" |
| Server lỗi | 500 | Retry 2 lần → show error | "Something went wrong. Please try again." |
| Rate limit | 429 | Countdown 60s + block button | "Too many requests. Please wait 60s." |
| Validation lỗi | 400 | Show field error | "Please check your input" |
| Network offline | - | Banner + block actions | "⚠️ You're offline" |
