-- ==============================================================================
-- CALLS KITCHEN - SEEDER DATA PENGGUNA (ADMIN & CUSTOMER)
-- Buka menu SQL Editor di Supabase Dashboard -> New Query -> Tempel dan klik Run
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_pw_hash TEXT;
  
  -- Akun Admin 1: admin@gmail.com (Sesuai input login Anda)
  v_admin_gmail_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_admin_gmail_email TEXT := 'admin@gmail.com';

  -- Akun Admin 2: admin@callskitchen.com
  v_admin_ck_id UUID := 'a0000000-0000-0000-0000-000000000002';
  v_admin_ck_email TEXT := 'admin@callskitchen.com';

  -- Akun Admin 3: admin.callskitchen@gmail.com
  v_admin_alt_id UUID := 'a0000000-0000-0000-0000-000000000003';
  v_admin_alt_email TEXT := 'admin.callskitchen@gmail.com';

  -- Akun Pelanggan 1: budi.santoso@gmail.com
  v_budi_id UUID := 'c0000000-0000-0000-0000-000000000001';
  v_budi_email TEXT := 'budi.santoso@gmail.com';

  -- Akun Pelanggan 2: siti.rahma@gmail.com
  v_siti_id UUID := 'c0000000-0000-0000-0000-000000000002';
  v_siti_email TEXT := 'siti.rahma@gmail.com';
BEGIN
  -- Password default untuk semua akun: Password123!
  v_pw_hash := extensions.crypt('Password123!', extensions.gen_salt('bf'));

  -- ============================================================================
  -- 1. SEED: admin@gmail.com
  -- ============================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_gmail_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_gmail_id, 'authenticated', 'authenticated',
      v_admin_gmail_email, v_pw_hash, NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrator Calls Kitchen","phone":"081234567890","address":"Jl. Dapur Pusat No. 1, Jakarta Selatan"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (v_admin_gmail_id::text, v_admin_gmail_id, format('{"sub":"%s","email":"%s"}', v_admin_gmail_id::text, v_admin_gmail_email)::jsonb, 'email', v_admin_gmail_email, NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    SELECT id INTO v_admin_gmail_id FROM auth.users WHERE email = v_admin_gmail_email;
    UPDATE auth.users
    SET encrypted_password = v_pw_hash, email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_admin_gmail_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, address, created_at, updated_at)
  VALUES (v_admin_gmail_id, 'Administrator Calls Kitchen', '081234567890', 'Jl. Dapur Pusat No. 1, Jakarta Selatan', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW();

  DELETE FROM public.user_roles WHERE user_id = v_admin_gmail_id;
  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (v_admin_gmail_id, 'admin', NOW());


  -- ============================================================================
  -- 2. SEED: admin@callskitchen.com
  -- ============================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_ck_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_ck_id, 'authenticated', 'authenticated',
      v_admin_ck_email, v_pw_hash, NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrator Calls Kitchen","phone":"081234567890","address":"Jl. Dapur Pusat No. 1, Jakarta Selatan"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (v_admin_ck_id::text, v_admin_ck_id, format('{"sub":"%s","email":"%s"}', v_admin_ck_id::text, v_admin_ck_email)::jsonb, 'email', v_admin_ck_email, NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    SELECT id INTO v_admin_ck_id FROM auth.users WHERE email = v_admin_ck_email;
    UPDATE auth.users
    SET encrypted_password = v_pw_hash, email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_admin_ck_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, address, created_at, updated_at)
  VALUES (v_admin_ck_id, 'Administrator Calls Kitchen', '081234567890', 'Jl. Dapur Pusat No. 1, Jakarta Selatan', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW();

  DELETE FROM public.user_roles WHERE user_id = v_admin_ck_id;
  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (v_admin_ck_id, 'admin', NOW());


  -- ============================================================================
  -- 3. SEED: admin.callskitchen@gmail.com
  -- ============================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_admin_alt_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_admin_alt_id, 'authenticated', 'authenticated',
      v_admin_alt_email, v_pw_hash, NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Administrator Calls Kitchen","phone":"081234567890","address":"Jl. Dapur Pusat No. 1, Jakarta Selatan"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (v_admin_alt_id::text, v_admin_alt_id, format('{"sub":"%s","email":"%s"}', v_admin_alt_id::text, v_admin_alt_email)::jsonb, 'email', v_admin_alt_email, NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    SELECT id INTO v_admin_alt_id FROM auth.users WHERE email = v_admin_alt_email;
    UPDATE auth.users
    SET encrypted_password = v_pw_hash, email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_admin_alt_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, address, created_at, updated_at)
  VALUES (v_admin_alt_id, 'Administrator Calls Kitchen', '081234567890', 'Jl. Dapur Pusat No. 1, Jakarta Selatan', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW();

  DELETE FROM public.user_roles WHERE user_id = v_admin_alt_id;
  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (v_admin_alt_id, 'admin', NOW());


  -- ============================================================================
  -- 4. SEED: budi.santoso@gmail.com (Customer)
  -- ============================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_budi_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_budi_id, 'authenticated', 'authenticated',
      v_budi_email, v_pw_hash, NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Budi Santoso","phone":"081298765432","address":"Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (v_budi_id::text, v_budi_id, format('{"sub":"%s","email":"%s"}', v_budi_id::text, v_budi_email)::jsonb, 'email', v_budi_email, NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    SELECT id INTO v_budi_id FROM auth.users WHERE email = v_budi_email;
    UPDATE auth.users
    SET encrypted_password = v_pw_hash, email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_budi_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, address, created_at, updated_at)
  VALUES (v_budi_id, 'Budi Santoso', '081298765432', 'Jl. Melati No. 12, Kebayoran Baru, Jakarta Selatan', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW();

  DELETE FROM public.user_roles WHERE user_id = v_budi_id;
  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (v_budi_id, 'customer', NOW());


  -- ============================================================================
  -- 5. SEED: siti.rahma@gmail.com (Customer)
  -- ============================================================================
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_siti_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_siti_id, 'authenticated', 'authenticated',
      v_siti_email, v_pw_hash, NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Siti Rahma","phone":"081387654321","address":"Jl. Anggrek No. 8, Bandung, Jawa Barat"}'::jsonb,
      NOW(), NOW(), '', '', '', ''
    );

    BEGIN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (v_siti_id::text, v_siti_id, format('{"sub":"%s","email":"%s"}', v_siti_id::text, v_siti_email)::jsonb, 'email', v_siti_email, NOW(), NOW(), NOW())
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  ELSE
    SELECT id INTO v_siti_id FROM auth.users WHERE email = v_siti_email;
    UPDATE auth.users
    SET encrypted_password = v_pw_hash, email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_siti_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, address, created_at, updated_at)
  VALUES (v_siti_id, 'Siti Rahma', '081387654321', 'Jl. Anggrek No. 8, Bandung, Jawa Barat', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, address = EXCLUDED.address, updated_at = NOW();

  DELETE FROM public.user_roles WHERE user_id = v_siti_id;
  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (v_siti_id, 'customer', NOW());

END $$;

-- Verifikasi akun
SELECT 
    u.id,
    u.email,
    p.full_name,
    r.role,
    u.email_confirmed_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles r ON u.id = r.user_id
WHERE u.email IN (
    'admin@gmail.com',
    'admin@callskitchen.com',
    'admin.callskitchen@gmail.com',
    'budi.santoso@gmail.com',
    'siti.rahma@gmail.com'
)
ORDER BY r.role ASC, u.email ASC;
