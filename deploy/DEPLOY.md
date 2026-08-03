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

- **Trang web root của COS30043:** `https://mercury.swin.edu.au/cos30043/s104775470/`
  (map tới thư mục server `/home/students/accounts/s104775470/cos30043/www/htdocs`)
- **Foodly nằm trong subfolder `foodly`** để không đụng A1/A2:
  `https://mercury.swin.edu.au/cos30043/s104775470/foodly/`

Các bước:

1. Kết nối **Cisco AnyConnect** vào Swinburne VPN.
2. Mở **WinSCP** → đăng nhập host Mercury (SFTP port 22, theo thông tin trường cấp).
3. Vào thư mục `htdocs/foodly` (tạo folder `foodly` nếu chưa có).
4. Upload **toàn bộ nội dung bên trong** `deploy/foodly-frontend` (index.html,
   assets/, data/, pwa/, favicon.svg, icons.svg, manifest.webmanifest, sw.js,
   workbox-bdb082da.js) vào `htdocs/foodly` — KHÔNG kéo cả folder `foodly-frontend`.
5. Mở URL `.../cos30043/s104775470/foodly/` → xem app.

> **Lưu ý build:** chạy script một lệnh để build + đóng gói với base path Mercury:
> ```
> powershell -ExecutionPolicy Bypass -File deploy/build-for-mercury.ps1 `
>   -BackendUrl "https://BACKEND-URL" `
>   -BasePath "/cos30043/s104775470/foodly/"
> ```
> Script tự backup/khôi phục `client/.env` nên bản local (localhost) vẫn dùng được
> để quay video. Bản build đã có sẵn nằm ở `deploy/foodly-frontend/` + zip.

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
