# 🚀 Hướng dẫn deploy RunTrack lên Vercel

## Bước 1: Tạo database PostgreSQL miễn phí (Neon)

1. Vào **https://neon.tech** → bấm "Sign up" (miễn phí, không cần thẻ)
2. Tạo project mới → đặt tên "runtrack"
3. Copy **connection string** (dạng `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`)
4. Lưu lại — sẽ dùng ở bước 3 & 4

## Bước 2: Tạo tables trong database

Mở terminal trên máy bạn, trong thư mục project:
```bash
# Paste connection string Neon vào file .env (thay dòng DATABASE_URL)
# Sau đó chạy:
bun run db:push
```
→ Prisma sẽ tạo tất cả tables (User, Group, GroupMember, SharedStory, etc.)

## Bước 3: Push code lên GitHub

```bash
git init
git add .
git commit -m "RunTrack — full app"
git branch -M main
git remote add origin https://github.com/TEN_CUA_BAN/runtrack.git
git push -u origin main
```

## Bước 4: Deploy lên Vercel

1. Vào **https://vercel.com** → "New Project"
2. Chọn repo "runtrack" từ GitHub → "Import"
3. Vercel tự nhận diện Next.js → giữ mặc định
4. Mở "Environment Variables" → thêm 3 biến:

| Name | Value |
|------|-------|
| `DATABASE_URL` | (connection string Neon từ bước 1) |
| `NEXTAUTH_SECRET` | (chuỗi random dài, vd: `my-secret-abc123xyz...`) |
| `NEXTAUTH_URL` | `https://ten-project.vercel.app` (URL Vercel cấp) |

5. Bấm **"Deploy"** → đợi 2-3 phút → xong! 🎉

## Bước 5: Tạo tables trên database production (nếu chưa)

Sau khi deploy thành công, chạy lệnh này 1 lần:
```bash
DATABASE_URL="connection_string_neon" bun run db:push
```

## 📱 Dùng app

- Vào URL Vercel → đăng ký tài khoản → tạo hồ sơ
- Vào "Nhóm" → tạo nhóm → copy mã mời → gửi cho bạn bè
- Bạn bè đăng ký → tham gia nhóm → share story kiểu Locket!

## 💰 Chi phí: 0₫

- Neon: free tier (10GB storage, đủ cho hàng nghìn user)
- Vercel: free tier (100GB bandwidth/tháng)
- AI: Z.ai SDK (free)

## ⚠️ Lưu ý

- **Dữ liệu chạy bộ & cân nặng** lưu trên trình duyệt (IndexedDB) — riêng tư, không lên server
- **Story nhóm** lưu trên server (Neon PostgreSQL) — chia sẻ với nhóm
- **AI recap/food** cần internet (gọi LLM API) — phần còn lại chạy offline
