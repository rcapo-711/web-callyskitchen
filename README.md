# Calls Kitchen — Toko Online Keripik Pisang & Keripik Singkong

Aplikasi web e-commerce *full-stack* modern, responsif, dan aman untuk **Calls Kitchen** — toko online yang menjual aneka varian keripik pisang dan keripik singkong renyah berkualitas tinggi.

> **Slogan:** *"Renyahnya Bikin Nagih, Rasanya Bikin Happy!"*

---

## 1. TEKNOLOGI YANG DIGUNAKAN

- **Frontend Framework:** React 19 dengan TypeScript (Strict Mode)
- **Build Tool & Dev Server:** Vite 8
- **Styling:** Tailwind CSS dengan palet warna hangat khusus Calls Kitchen (*Cream*, *Brown/Cokelat*, dan *Caramel*)
- **Routing:** React Router DOM v7
- **Backend & Database:** Supabase PostgreSQL dengan Row Level Security (RLS)
- **Autentikasi:** Supabase Authentication (Email & Password, pemulihan sesi otomatis)
- **Penyimpanan Gambar:** Supabase Storage (`product-images` bucket)
- **Manajemen Formulir & Validasi:** React Hook Form + Zod
- **Ikon UI:** Lucide React
- **Visualisasi & Grafik:** Recharts
- **QR Code Renderer:** `qrcode.react` (untuk tampilan QRIS Dinamis)
- **Unit & Integration Testing:** Vitest + Testing Library + jsdom

---

## 2. STRUKTUR FOLDER PROYEK

```text
Call Kitchen/
├── public/
│   ├── favicon.svg             # Logo merek Calls Kitchen
│   ├── hero-chips.svg          # Visual ilustrasi kemasan keripik pisang & singkong di Hero
│   └── products/               # Aset ilustrasi SVG lokal untuk 12 varian rasa produk
│       ├── pisang-original.svg
│       ├── pisang-cokelat.svg
│       ├── pisang-keju.svg
│       ├── pisang-balado.svg
│       ├── pisang-karamel.svg
│       ├── pisang-matcha.svg
│       ├── singkong-original.svg
│       ├── singkong-balado.svg
│       ├── singkong-pedas-daun-jeruk.svg
│       ├── singkong-keju.svg
│       ├── singkong-bbq.svg
│       └── singkong-jagung-bakar.svg
├── scripts/
│   └── generate-assets.js      # Generator aset SVG lokal mandiri
├── src/
│   ├── components/
│   │   ├── common/             # Button, Badge, Modal, Skeleton, EmptyState
│   │   ├── layout/             # Navbar, Footer, PublicLayout, AdminLayout
│   │   └── product/            # ProductCard, ProductFilter
│   ├── context/
│   │   ├── AuthContext.tsx     # Sesi pengguna, listener auth, dan resolusi role aman
│   │   └── CartContext.tsx     # Keranjang, seleksi item checkout, batas stok
│   ├── data/
│   │   └── seedData.ts         # Data awal kategori, 12 varian produk, dan pengaturan toko
│   ├── lib/
│   │   ├── payment/            # Adapter QRIS Dinamis & COD dengan pemisahan status
│   │   │   ├── types.ts
│   │   │   ├── qrisAdapter.ts
│   │   │   └── codAdapter.ts
│   │   ├── storage.ts          # Helper upload gambar Supabase Storage (validasi tipe & batas 2MB)
│   │   ├── supabase.ts         # Inisialisasi Supabase client dengan fallback lokal
│   │   └── utils.ts            # Helper formatRupiah, formatDate, no. pesanan, validasi HP
│   ├── pages/
│   │   ├── admin/              # Dashboard, Kelola Produk, Pesanan, Pembayaran, Pelanggan, Laporan, Pengaturan
│   │   ├── Auth/               # Login & Register
│   │   ├── Cart.tsx            # Keranjang (layout 65/35, checkbox seleksi, validasi kuantitas)
│   │   ├── Catalog.tsx         # Katalog (filter kategori, pencarian rasa, sorting)
│   │   ├── Checkout.tsx        # Form checkout (hanya 3 field penerima: nama, HP, alamat)
│   │   ├── Home.tsx            # Beranda (Hero resmi, CTA "Lihat Menu", produk unggulan)
│   │   ├── Payment.tsx         # Halaman pembayaran QRIS Dinamis (tanpa tombol unduh) & COD
│   │   └── Profile.tsx         # Profil pengguna & riwayat pesanan (akses terlindungi RLS)
│   ├── test/                   # Test suite Vitest
│   ├── types/                  # Definisi tipe TypeScript
│   ├── App.tsx                 # Routing utama aplikasi
│   ├── index.css               # Direktif Tailwind CSS & scrollbar
│   └── main.tsx                # Entry point React
├── supabase/
│   ├── migrations/
│   │   └── 20261018000000_calls_kitchen_schema.sql  # Schema SQL, RLS, functions, triggers, seed
│   └── grant_admin.sql         # SQL query helper untuk menetapkan role admin secara aman
├── .env.example                # Contoh template variabel lingkungan
├── package.json
├── tailwind.config.js          # Palet warna merek: cream, caramel, brown
├── tsconfig.json
└── vite.config.ts              # Konfigurasi Vite & Vitest
```

---

## 3. CARA MEMASANG DEPENDENSI

Buka PowerShell atau terminal di folder proyek `Call Kitchen`, lalu jalankan:

```powershell
npm install
```

---

## 4. CARA MENJALANKAN APLIKASI SECARA LOKAL

Jalankan perintah berikut:

```powershell
npm run dev
```

Aplikasi akan berjalan dan dapat diakses di browser pada:
`http://localhost:5173`

---

## 5. VARIABEL ENVIRONMENT YANG DIPERLUKAN

Salin file `.env.example` menjadi `.env`:

```powershell
Copy-Item .env.example .env
```

Isi variabel di file `.env`:

```env
# Supabase URL:
VITE_SUPABASE_URL=https://your-project.supabase.co

# Anon / Public API Key Supabase (Dapatkan dari Supabase Dashboard -> Project Settings -> API):
VITE_SUPABASE_ANON_KEY=masukkan_anon_key_anda_di_sini

# Payment Gateway (Midtrans Sandbox / Akun Pembayaran):
VITE_PAYMENT_GATEWAY_CLIENT_KEY=masukkan_client_key_gateway_jika_ada
VITE_PAYMENT_ENVIRONMENT=sandbox
```

> **CATATAN KEAMANAN PENTING:**  
> Jangan pernah memasukkan `Server Secret Key` pembayaran atau `service_role key` Supabase ke dalam file `.env` frontend (variabel dengan prefix `VITE_*`). Kunci rahasia hanya boleh disimpan di Supabase Edge Function Secrets!

---

## 6. CARA MENGHUBUNGKAN PROYEK SUPABASE

1. Buka browser dan login ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Buka proyek Supabase Anda.
3. Buka menu **Project Settings** (ikon gerigi di kiri bawah) -> **API**.
4. Salin **Project URL** dan **Project API Keys (`anon` / `public`)**.
5. Buka file `.env` di VS Code, lalu tempelkan nilainya:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
6. Restart server development (`Ctrl + C` lalu `npm run dev`).

---

## 7. CARA MENERAPKAN MIGRASI SQL DENGAN AMAN

Seluruh skema tabel, indeks performa, fungsi pengurangan stok atomik, pemicu pembuatan profil otomatis, kebijakan Row Level Security (RLS), dan seed data awal telah disiapkan di file:
`supabase/migrations/20261018000000_calls_kitchen_schema.sql`.

### Langkah Eksekusi:
1. Buka menu **SQL Editor** di Supabase Dashboard proyek Anda.
2. Klik tombol **New Query**.
3. Buka file `supabase/migrations/20261018000000_calls_kitchen_schema.sql` di editor, salin seluruh kodenya, lalu tempelkan di SQL Editor Supabase.
4. Klik tombol **Run**.
5. Skema tabel dan data awal produk akan terpasang tanpa menghapus data secara destruktif (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

---

## 8. CARA MENGONFIGURASI SUPABASE AUTHENTICATION

1. Di Supabase Dashboard, buka menu **Authentication** -> **Providers**.
2. Pastikan provider **Email** berstatus **Enabled**.
3. Pada tab **Email Templates** / **Auth Settings**:
   - Jika ingin mempermudah pendaftaran pelanggan tanpa wajib konfirmasi email saat pengujian lokal, matikan opsi *Confirm email* (*Allow unconfirmed email logins*).

---

## 9. CARA MENGATUR ROLE ADMIN SECARA AMAN

Role pengguna tidak boleh diubah dari browser demi keamanan. Untuk memberikan hak akses `admin` kepada suatu akun:

1. Daftarkan akun baru melalui halaman Registrasi aplikasi (`http://localhost:5173/register`), misalnya: `admin@callskitchen.com`.
2. Buka **Supabase SQL Editor** di browser.
3. Jalankan query berikut (tersedia juga di `supabase/grant_admin.sql`):

```sql
-- 1. Update role yang sudah ada menjadi 'admin'
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@callskitchen.com'
);

-- 2. Sisipkan baris admin jika akun belum memiliki baris role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@callskitchen.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.users.id
  );

-- 3. Hapus duplikasi role 'customer' jika sebelumnya sempat tersimpan ganda
DELETE FROM public.user_roles
WHERE role = 'customer'
  AND user_id IN (
    SELECT id FROM auth.users WHERE email = 'admin@callskitchen.com'
  );
```

4. Setelah query berhasil dijalankan, login kembali menggunakan akun tersebut. Akun akan otomatis memiliki akses penuh ke `/admin` dan navigasi panel admin akan muncul di navbar.

### Seeder Pengguna Otomatis (Admin & Pelanggan):
Tersedia file [seed_users.sql](file:///c:/Users/User/projects/kelarin/bug-fix/web-callyskitchen-fix/supabase/seed_users.sql) untuk membuat akun Admin dan Pelanggan sekaligus tanpa perlu konfirmasi email:
- Buka **Supabase SQL Editor** -> Buka file `supabase/seed_users.sql` -> Salin dan jalankan (*Run*).
- Akun yang dibuat:
  - **Admin:** `admin@callskitchen.com` / `admin.callskitchen@gmail.com` (Password: `Password123!`)
  - **Pelanggan:** `budi.santoso@gmail.com` (Password: `Password123!`)
  - **Pelanggan:** `siti.rahma@gmail.com` (Password: `Password123!`)

---

## 10. CARA MENGONFIGURASI SUPABASE STORAGE (FOTO PRODUK)

Jika ingin mengaktifkan upload gambar produk melalui Admin Panel:

1. Di Supabase Dashboard, buka menu **Storage**.
2. Klik **New Bucket**, beri nama persis: `product-images`.
3. Centang opsi **Public Bucket** agar foto katalog dapat dimuat oleh pengunjung toko.
4. Klik **Save**.
5. Kebijakan akses (*Policies*):
   - **SELECT:** Izinkan publik membaca gambar (`true`).
   - **INSERT/UPDATE/DELETE:** Izinkan hanya pengguna dengan role admin (`public.is_admin()`).

---

## 11. CARA MENGAKTIFKAN INTEGRASI PEMBAYARAN

Aplikasi mendukung 2 metode pembayaran:

### A. QRIS Dinamis (GoPay / Midtrans / Bank Lain)
- Menggunakan arsitektur adapter resmi di `src/lib/payment/qrisAdapter.ts`.
- Kode QRIS yang dihasilkan terikat secara unik pada nomor pesanan dan nominal belanja aktual.
- Menampilkan QRIS dinamis di halaman pembayaran tanpa fitur unduh gambar (sesuai spesifikasi).
- Memiliki tombol **Periksa Status Pembayaran** yang memvalidasi status transaksi ke server.
- *Catatan akun GoPay Merchant Call-Kitchen:* Jika akun merchant Anda belum memiliki kredensial API/webhook e-commerce, aplikasi berjalan dalam mode **Sandbox Adapter**. Saat akun resmi Midtrans / payment gateway Anda telah aktif, cukup masukkan `Client Key` di `.env` dan pasang secret key di Supabase Edge Functions.

### B. Cash on Delivery (COD)
- Pesanan dibuat dengan status pembayaran awal `Belum Dibayar` (`unpaid`).
- Status pesanan (`confirmed`, `processing`, `shipped`, `completed`) dipisahkan secara ketat dari status pembayaran.
- Admin dapat mencatat penerimaan uang tunai saat kurir menyetorkan uang melalui menu **Admin -> Pembayaran -> Catat Uang Tunai Diterima**.

---

## 12. CARA MENJALANKAN TES

Aplikasi dilengkapi unit dan integration test menggunakan Vitest:

```powershell
# Jalankan seluruh unit & integration test
npm test

# Jalankan test dalam mode watch (interaktif saat coding)
npm run test:watch
```

---

## 13. CARA MEMBUAT PRODUCTION BUILD

Untuk mengompilasi aplikasi untuk siap deploy ke hosting (Vercel, Netlify, Cloudflare Pages, dll):

```powershell
npm run build
```

Hasil kompilasi optimal akan berada di folder `dist/`. Anda dapat menguji hasil build secara lokal dengan perintah:

```powershell
npm run preview
```

---

## 14. HAL-HAL YANG HARUS DILAKUKAN SEBELUM PRODUCTION DEPLOYMENT

1. [ ] Jalankan migrasi SQL di Supabase Dashboard SQL Editor.
2. [ ] Masukkan `VITE_SUPABASE_ANON_KEY` resmi ke environment hosting produksi Anda.
3. [ ] Buat bucket storage `product-images` di Supabase.
4. [ ] Tetapkan akun admin pertama Anda melalui query `supabase/grant_admin.sql`.
5. [ ] Jika menggunakan payment gateway (Midtrans):
   - Konfigurasi Webhook Notification URL di dashboard gateway mengarah ke endpoint backend / Supabase Edge Function `check-payment-status`.
   - Ubah `VITE_PAYMENT_ENVIRONMENT` menjadi `production` di environment produksi.
