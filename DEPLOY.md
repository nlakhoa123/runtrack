# 🚀 Hướng dẫn deploy RunTrack lên Vercel

## Bước 1: Tạo database PostgreSQL miễn phí (Neon)

1. Vào **https://neon.tech** → "Sign up" (miễn phí)
2. Tạo project → copy **connection string** (dạng `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`)

## Bước 2: Sửa Prisma schema cho PostgreSQL

Mở file `prisma/schema.prisma`, đổi dòng `provider`:
```prisma
datasource db {
  provider = "postgresql"   # đổi từ "sqlite" thành "postgresql"
  url      = env("DATABASE_URL")
}
```

## Bước 3: Tạo tables

```bash
DATABASE_URL="connection_string_neon" bun run db:push
```

## Bước 4: Push code lên GitHub

```bash
git init
git add .
git commit -m "RunTrack"
git branch -M main
git remote add origin https://github.com/TEN_CUA_BAN/runtrack.git
git push -u origin main
```

## Bước 5: Deploy lên Vercel

1. Vào **https://vercel.com** → "New Project" → chọn repo "runtrack"
2. Thêm **TẤT CẢ** Environment Variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | connection string Neon |
| `NEXTAUTH_SECRET` | chuỗi random dài |
| `NEXTAUTH_URL` | `https://ten-project.vercel.app` |
| `ZAI_BASE_URL` | `https://internal-api.z.ai/v1` |
| `ZAI_API_KEY` | `Z.ai` |
| `ZAI_TOKEN` | (token JWT từ file .env hoặc /etc/.z-ai-config) |
| `ZAI_CHAT_ID` | (chat ID từ file .env) |
| `ZAI_USER_ID` | (user ID từ file .env) |

3. Bấm **"Deploy"** → đợi 2-3 phút → xong! 🎉

## ⚠️ Quan trọng: AI credentials

AI features (tính calo, gợi ý thực đơn, recap tháng) dùng Z.ai API. Credentials nằm trong file `.env`:
```
ZAI_BASE_URL=https://internal-api.z.ai/v1
ZAI_API_KEY=Z.ai
ZAI_TOKEN=eyJhbGci...  (JWT token)
ZAI_CHAT_ID=chat-xxxx
ZAI_USER_ID=xxxx
```

Trên Vercel, thêm TẤT CẢ 5 biến `ZAI_*` vào Environment Variables. Không có chúng, AI sẽ trả fallback (không tính được).

## 💰 Chi phí: 0₫

- Neon: free tier (10GB)
- Vercel: free tier (100GB bandwidth)
- AI: Z.ai SDK (free trong sandbox; trên Vercel cần credentials)

## 📝 Lưu ý

- **Dữ liệu chạy bộ & cân nặng**: IndexedDB trên trình duyệt — riêng tư
- **Tài khoản & auth**: PostgreSQL (Neon) trên server
- **AI**: gọi API Z.ai qua direct fetch (không cần SDK trên Vercel)
- App offline cho tính năng local; chỉ auth + AI cần internet
