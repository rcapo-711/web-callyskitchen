-- ==============================================================================
-- CARA MEMBERIKAN ROLE ADMIN SECARA AMAN DI SUPABASE SQL EDITOR
-- ==============================================================================
-- 1. Buka Supabase Dashboard proyek Anda -> SQL Editor -> New Query
-- 3. Ganti 'admin@callskitchen.com' di bawah ini dengan email akun yang sudah terdaftar
-- 4. Klik 'Run'

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

-- Verifikasi role akun:
SELECT u.email, r.role, r.created_at
FROM auth.users u
JOIN public.user_roles r ON u.id = r.user_id
WHERE u.email = 'admin@callskitchen.com';
