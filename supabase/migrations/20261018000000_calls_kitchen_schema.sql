-- ==============================================================================
-- CALLS KITCHEN - FULL-STACK SUPABASE DATABASE SCHEMA & RLS MIGRATION
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
-- Menyimpan informasi profil pengguna yang terikat pada auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. USER ROLES TABLE
-- Role pengguna (customer, admin). Terpisah dari profiles agar tidak dapat diubah sendiri oleh client
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. PRODUCTS TABLE
-- Menggunakan NUMERIC untuk harga uang guna mencegah error floating-point
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    sold_count INTEGER NOT NULL DEFAULT 0,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. CART ITEMS TABLE (Server-side cart sync)
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_product_cart UNIQUE (user_id, product_id)
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'processing', 'shipped', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'expired', 'refunded')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('qris', 'cod')),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. ORDER ITEMS TABLE (Snapshot nama dan harga produk saat pesanan dibuat)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('qris', 'cod')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('unpaid', 'pending', 'paid', 'failed', 'expired', 'refunded')),
    gateway_reference TEXT,
    payment_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    verified_at TIMESTAMPTZ,
    verified_by TEXT
);

-- 10. ORDER STATUS HISTORY TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_by TEXT
);

-- ==============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active, is_archived);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON public.cart_items(user_id);

-- ==============================================================================
-- SECURITY HELPER FUNCTIONS
-- ==============================================================================

-- Function: Cek apakah user saat ini memiliki role admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Function: Pengurangan stok produk yang aman terhadap race condition
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_id TEXT, p_quantity INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - p_quantity,
        sold_count = sold_count + p_quantity,
        updated_at = NOW()
    WHERE id = p_id AND stock >= p_quantity;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stok produk % tidak mencukupi atau produk tidak ditemukan.', p_id;
    END IF;
END;
$$;

-- Function & Trigger: Otomatis buat profile dan role customer saat pengguna mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert default profile
    INSERT INTO public.profiles (id, full_name, phone, address, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        updated_at = NOW();

    -- Insert default customer role (hanya customer, admin ditetapkan melalui SQL Editor)
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (NEW.id, 'customer', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Users can read own profile or admin can read all"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 2. User Roles RLS (Pengguna TIDAK BISA menaikkan role sendiri)
CREATE POLICY "Users can read own role or admin can read all"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admin can manage roles"
ON public.user_roles FOR ALL
USING (public.is_admin());

-- 3. Categories RLS (Publik bisa membaca, hanya admin bisa mengubah)
CREATE POLICY "Categories are readable by everyone"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Categories are manageable by admin"
ON public.categories FOR ALL
USING (public.is_admin());

-- 4. Products RLS (Publik bisa membaca produk aktif yang tidak diarsipkan, admin bisa akses semua)
CREATE POLICY "Active products readable by everyone"
ON public.products FOR SELECT
USING (NOT is_archived OR public.is_admin());

CREATE POLICY "Products manageable only by admin"
ON public.products FOR ALL
USING (public.is_admin());

-- 5. Cart Items RLS (Pengguna hanya bisa mengakses item keranjang miliknya)
CREATE POLICY "Users can manage own cart items"
ON public.cart_items FOR ALL
USING (auth.uid() = user_id);

-- 6. Orders RLS (Pengguna hanya melihat pesanan miliknya, admin melihat semua)
CREATE POLICY "Users can read own orders or admin read all"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update orders"
ON public.orders FOR UPDATE
USING (public.is_admin());

-- 7. Order Items RLS
CREATE POLICY "Users can read items of own orders or admin read all"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "Users can insert items for own orders"
ON public.order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
);

-- 8. Payments RLS
CREATE POLICY "Users can read payments of own orders or admin read all"
ON public.payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = payments.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "System or admin can manage payments"
ON public.payments FOR ALL
USING (public.is_admin() OR auth.role() = 'service_role');

-- 9. Order Status History RLS
CREATE POLICY "Users can read status history of own orders"
ON public.order_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_status_history.order_id
        AND (orders.user_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "Admin can insert status history"
ON public.order_status_history FOR INSERT
WITH CHECK (public.is_admin());

-- 10. Store Settings RLS
CREATE POLICY "Store settings readable by everyone"
ON public.store_settings FOR SELECT
USING (true);

CREATE POLICY "Store settings manageable only by admin"
ON public.store_settings FOR ALL
USING (public.is_admin());

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Categories
INSERT INTO public.categories (id, slug, name, description)
VALUES
    ('cat-pisang', 'keripik-pisang', 'Keripik Pisang', 'Olahan pisang pilihan dengan kerenyahan istimewa dan varian rasa favorit.'),
    ('cat-singkong', 'keripik-singkong', 'Keripik Singkong', 'Keripik singkong renyah gurih bumbu rempah pilihan khas Calls Kitchen.')
ON CONFLICT (id) DO NOTHING;

-- Initial Products (12 Varian Resmi)
INSERT INTO public.products (id, category_id, name, slug, description, price, stock, image_url, is_active, is_archived, sold_count, rating)
VALUES
    -- Keripik Pisang
    ('prod-pisang-original', 'cat-pisang', 'Keripik Pisang Original', 'keripik-pisang-original', 'Irisan pisang kepok pilihan digoreng renyah dengan rasa manis alami dan sentuhan gurih lembut. Renyah nagih di setiap gigitan.', 18000, 45, '/products/pisang-original.svg', true, false, 142, 4.9),
    ('prod-pisang-cokelat', 'cat-pisang', 'Keripik Pisang Cokelat', 'keripik-pisang-cokelat', 'Perpaduan renyahnya pisang bertabur lelehan cokelat pekat premium. Manisnya pas, lumer di mulut dan bikin happy!', 20000, 50, '/products/pisang-cokelat.svg', true, false, 285, 5.0),
    ('prod-pisang-keju', 'cat-pisang', 'Keripik Pisang Keju', 'keripik-pisang-keju', 'Rasa gurih keju cheddar melimpah menyelimuti setiap keping keripik pisang. Sensasi manis gurih yang bikin tidak bisa berhenti ngunyah.', 20000, 35, '/products/pisang-keju.svg', true, false, 110, 4.8),
    ('prod-pisang-balado', 'cat-pisang', 'Keripik Pisang Balado', 'keripik-pisang-balado', 'Kombinasi unik manisnya pisang berpadu racikan bumbu balado pedas manis segar. Cocok untuk pecinta tantangan rasa baru.', 19000, 30, '/products/pisang-balado.svg', true, false, 98, 4.7),
    ('prod-pisang-karamel', 'cat-pisang', 'Keripik Pisang Karamel', 'keripik-pisang-karamel', 'Glazed gula karamel aromatik dengan tekstur super crunchy dan aroma wangi butter khas Calls Kitchen.', 21000, 25, '/products/pisang-karamel.svg', true, false, 164, 4.9),
    ('prod-pisang-matcha', 'cat-pisang', 'Keripik Pisang Matcha', 'keripik-pisang-matcha', 'Bubuk matcha hijau berkualitas dengan rasa creamy dan sedikit aroma teh hijau yang menenangkan, berpadu manisnya pisang.', 22000, 20, '/products/pisang-matcha.svg', true, false, 87, 4.8),

    -- Keripik Singkong
    ('prod-singkong-original', 'cat-singkong', 'Keripik Singkong Original', 'keripik-singkong-original', 'Singkong renyah tipis berbumbu garam laut murni dan bawang putih rempah tradisional. Camilan klasik yang tak lekang oleh waktu.', 15000, 60, '/products/singkong-original.svg', true, false, 210, 4.8),
    ('prod-singkong-balado', 'cat-singkong', 'Keripik Singkong Balado', 'keripik-singkong-balado', 'Bumbu balado merah merona dengan cabai asli, gurih pedas manis yang meresap sempurna ke dalam pori-pori keripik singkong.', 16000, 55, '/products/singkong-balado.svg', true, false, 310, 4.9),
    ('prod-singkong-pedas-daun-jeruk', 'cat-singkong', 'Keripik Singkong Pedas Daun Jeruk', 'keripik-singkong-pedas-daun-jeruk', 'Varian terlaris Calls Kitchen! Pedas nampol dipadukan aroma wangi daun jeruk segar yang meletup di lidah.', 17000, 40, '/products/singkong-pedas-daun-jeruk.svg', true, false, 420, 5.0),
    ('prod-singkong-keju', 'cat-singkong', 'Keripik Singkong Keju', 'keripik-singkong-keju', 'Keripik singkong dengan taburan keju cheddar spesial, gurih renyah tanpa meninggalkan rasa seret di tenggorokan.', 16000, 35, '/products/singkong-keju.svg', true, false, 95, 4.7),
    ('prod-singkong-bbq', 'cat-singkong', 'Keripik Singkong BBQ', 'keripik-singkong-bbq', 'Aroma panggang smoky barbeque yang menggoda selera dengan rasa manis, asin, dan gurih rempah pilihan.', 16000, 30, '/products/singkong-bbq.svg', true, false, 130, 4.8),
    ('prod-singkong-jagung-bakar', 'cat-singkong', 'Keripik Singkong Jagung Bakar', 'keripik-singkong-jagung-bakar', 'Rasa manis jagung bakar berpadu aroma butter hangat dan kerenyahan singkong yang bikin suasana ngobrol makin seru.', 16000, 35, '/products/singkong-jagung-bakar.svg', true, false, 155, 4.8)
ON CONFLICT (id) DO NOTHING;

-- Store Settings Seed
INSERT INTO public.store_settings (key, value)
VALUES
    ('general', '{
        "store_name": "Calls Kitchen",
        "phone": "0812-3456-7890",
        "whatsapp": "6281234567890",
        "address": "Jl. Rasa Bahagia No. 12, Jakarta",
        "default_shipping_cost": 1000,
        "is_store_open": true
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;
