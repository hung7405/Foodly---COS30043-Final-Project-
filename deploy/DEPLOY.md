# Deploy Foodly — Mercury (WinSCP) + Vercel

## Kiến trúc

```
┌─ Mercury (trường Úc chấm) ─────────────────────┐
│  frontend tĩnh (client/dist)  ← upload qua      │
│  WinSCP (SFTP, qua Cisco VPN)                   │
└─────────────────────────────────────────────────┘
        ▲                         ▲ (API + socket)
┌───────┴────────────┐            │
│  Vercel (thầy VN)  │────────────┘
│  frontend (vercel) │   cùng 1 backend
└─────────────────────────────────────────────────┘
```

- **Mercury** là web space tĩnh của Swinburne — CHỈ chạy file HTML/JS/CSS.
  Không chạy được backend NestJS + Socket.IO (realtime), không có Docker.
- **Backend** phải chạy ở nơi có Node (Vercel serverless, hoặc 1 host Node).

## Các file có sẵn

| File | Mục đích |
|------|----------|
| `client/vercel.json` | Cấu hình deploy frontend lên Vercel (điền URL Mercury/backend vào 3 chỗ `your-mercury-api-host`) |
| `mercury.yml` | Manifest deploy Mercury (nếu trường dùng CI thay vì WinSCP) |
| `client/nginx.conf`, `client/Dockerfile` | Dùng khi chạy Docker local |
| `deploy/foodly-frontend.zip` | Gói frontend đã build sẵn để kéo lên WinSCP |
| `client/.env` | URL API/socket mà `npm run build` đọc (đổi trước khi build) |

## Cách deploy

### 1. Deploy frontend lên Mercury (bằng WinSCP)

1. Kết nối **Cisco AnyConnect** vào Swinburne VPN.
2. Mở **WinSCP** → đăng nhập host Mercury (SFTP port 22, theo thông tin trường cấp).
3. Vào thư mục web (thường là `public_html` hoặc thư mục assignment, ví dụ
   `cos10026/s104775470/assignment1/`).
4. Upload **toàn bộ nội dung bên trong** `client/dist` (index.html, assets/,
   sw.js, ...) vào thư mục đó.
5. Mở URL Mercury → xem app.

> **Lưu ý:** trước khi build bản deploy, đổi `client/.env`:
> ```
> VITE_API_URL=https://BACKEND-URL/api
> VITE_SOCKET_URL=https://BACKEND-URL
> VITE_ANALYTICS_SOCKET_URL=https://BACKEND-URL:3001
> ```
> rồi chạy `cd client && npm run build` để ghi URL backend vào bản build.
> Sau khi nộp, đổi lại về localhost để quay video.

### 2. Deploy backend + frontend lên Vercel (cho thầy VN)

```powershell
# backend (serverless)
cd server
vercel login
vercel --prod

# frontend (sau khi đã sửa vercel.json)
cd ../client
vercel --prod
```

- `client/vercel.json` đã có sẵn env trỏ backend (điền URL backend vào
  `your-mercury-api-host`).
- Backend serverless: realtime qua Socket.IO sẽ hoạt động dạng polling.
