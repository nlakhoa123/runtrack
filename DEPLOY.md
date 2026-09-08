# 🚀 Hướng dẫn deploy RunTrack lên Vercel

## Bước 1: Tạo database PostgreSQL miễn phí (Neon)

1. Vào **https://neon.tech** → "Sign up" (miễn phí, không cần thẻ)
2. Tạo project → đặt tên "runtrack"
3. Copy **connection string** (dạng `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`)

## Bước 2: Sửa Prisma schema cho PostgreSQL

Mở file `prisma/schema.prisma`, đổi dòng:
```prisma
datasource db {
  provider = "sqlite"       // ← đổi thành postgresql
  url      = env("DATABASE_URL")
}
```
Thành:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Bước 3: Tạo tables

Chạy trong terminal:
```bash
DATABASE_URL="connection_string_neon" bun run db:push
```
→ Prisma tạo tất cả tables trong PostgreSQL.

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

1. Vào **https://vercel.com** → "New Project"
2. Chọn repo "runtrack" → "Import"
3. Thêm Environment Variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | (connection string Neon) |
| `NEXTAUTH_SECRET` | (chuỗi random dài) |
| `NEXTAUTH_URL` | `https://ten-project.vercel.app` |

4. Bấm **"Deploy"** → đợi 2-3 phút → xong! 🎉

## 💰 Chi phí: 0₫

- Neon: free tier (10GB storage)
- Vercel: free tier (100GB bandwidth)
- AI: Z.ai SDK (free)

## ⚠️ Lưu ý

- **Dữ liệu chạy bộ & cân nặng** lưu trên trình duyệt (IndexedDB) — riêng tư
- **Tài khoản & auth** lưu trên server (Neon PostgreSQL)
- **AI recap/food** cần internet (gọi LLM) — phần còn lại offline
- Để dùng AI trên Vercel, cần đảm bảo `z-ai-web-dev-sdk` có quyền truy cập (thường đã có sẵn trong môi trường Z.ai; trên Vercel có thể cần thêm env nếu SDK yêu cầu)
