import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, ShieldCheck, Truck, Flame } from 'lucide-react'
import { ProductCard } from '../components/product/ProductCard'
import { ProductCardSkeleton } from '../components/common/Skeleton'
import { Product } from '../types'
import { INITIAL_PRODUCTS } from '../data/seedData'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      setLoading(true)
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .eq('is_archived', false)
            .order('sold_count', { ascending: false })
            .limit(4)

          if (!error && data && data.length > 0 && mounted) {
            setFeaturedProducts(data)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Failed to fetch featured products from live DB, using seed data:', err)
        }
      }

      // Fallback to top seed data products
      if (mounted) {
        setFeaturedProducts(INITIAL_PRODUCTS.slice(0, 4))
        setLoading(false)
      }
    }

    loadProducts()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cream-200/80 via-cream-100 to-cream-50 pt-8 sm:pt-14 pb-16 sm:pb-24 border-b border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-caramel-100 border border-caramel-300 text-caramel-800 text-xs sm:text-sm font-bold shadow-xs">
                <Sparkles className="w-4 h-4 text-caramel-600" />
                <span>Camilan Keripik Pisang &amp; Singkong</span>
              </div>

              {/* Exact Hero Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brown-900 tracking-tight leading-[1.15]">
                Renyahnya Bikin Nagih, Rasanya Bikin Happy!
              </h1>

              {/* Brand Description */}
              <p className="text-base sm:text-lg text-brown-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Calls Kitchen menghadirkan sensasi kelezatan keripik pisang dan singkong dengan bumbu melimpah, tekstur super renyah tanpa keras, serta bahan alami pilihan terbaik petani lokal.
              </p>

              {/* Single Primary CTA */}
              <div className="pt-2 flex justify-center lg:justify-start">
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-caramel-500 hover:bg-caramel-600 active:bg-caramel-700 text-white font-extrabold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group focus:outline-none focus:ring-4 focus:ring-caramel-300"
                >
                  <span>Lihat Menu</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Quick Trust badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-cream-300 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <span className="block text-2xl font-black text-brown-900">100%</span>
                  <span className="text-xs font-semibold text-brown-500">Bahan Alami</span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-brown-900">12+</span>
                  <span className="text-xs font-semibold text-brown-500">Varian Rasa</span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-brown-900">0.0/5</span>
                  <span className="text-xs font-semibold text-brown-500">Rating Kepuasan</span>
                </div>
              </div>
            </div>

            {/* Right Visual Column (Crispy Chips Bag & Chips visuals) */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-md lg:max-w-none aspect-[4/3] rounded-3xl bg-cream-50 p-4 border border-cream-300 shadow-2xl flex items-center justify-center overflow-hidden group">
                <img
                  src="/hero-chips.svg"
                  alt="Aneka Keripik Pisang dan Singkong Calls Kitchen"
                  className="w-full h-full object-contain drop-shadow-md group-hover:scale-102 transition-transform duration-500"
                />
                
                {/* Floating highlight badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-cream-300 shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-caramel-100 flex items-center justify-center text-caramel-600 font-bold">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-brown-900">Best Seller Minggu Ini</span>
                      <span className="block text-[11px] text-brown-500">Pisang Cokelat &amp; Singkong Pedas Jeruk</span>
                    </div>
                  </div>
                  <Link
                    to="/catalog"
                    className="text-xs font-extrabold text-caramel-600 hover:text-caramel-700 bg-caramel-50 px-3 py-1.5 rounded-lg"
                  >
                    Beli
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-caramel-600 mb-1">
              <Flame className="w-4 h-4" />
              <span>Favorit Pelanggan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-brown-900">
              Produk Terlaris Calls Kitchen
            </h2>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-caramel-600 hover:text-caramel-700 group"
          >
            <span>Lihat Semua Menu</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-brown-500 bg-white rounded-3xl border border-cream-300">
              Belum ada produk unggulan yang ditampilkan.
            </div>
          )}
        </div>
      </section>

      {/* Categories Banner Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-brown-900 mb-3">
            Dua Kategori Istimewa
          </h2>
          <p className="text-sm text-brown-600 leading-relaxed">
            Dibuat dari bahan baku singkong dan pisang pilihan yang diolah dengan resep autentik khas Calls Kitchen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Banana Chips Card */}
          <Link
            to="/catalog?category=cat-pisang"
            className="group relative bg-gradient-to-br from-amber-50 to-cream-100 rounded-3xl p-8 border border-amber-200/80 hover:border-amber-400 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-3 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                Varian Pisang Kepok
              </span>
              <h3 className="text-2xl font-black text-brown-900 group-hover:text-caramel-600 transition-colors">
                Keripik Pisang
              </h3>
              <p className="text-sm text-brown-600 leading-relaxed max-w-xs">
                Sensasi manis gurih pisang dengan balutan Cokelat lumer, Karamel glazed, Keju tebal, dan Matcha nikmat.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between z-10">
              <span className="text-sm font-extrabold text-caramel-600 group-hover:underline inline-flex items-center gap-1">
                Jelajahi Keripik Pisang <ArrowRight className="w-4 h-4" />
              </span>
            </div>
            <img
              src="/products/pisang-cokelat.svg"
              alt="Keripik Pisang"
              className="absolute -right-6 -bottom-6 w-48 h-48 object-contain opacity-85 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
            />
          </Link>

          {/* Cassava Chips Card */}
          <Link
            to="/catalog?category=cat-singkong"
            className="group relative bg-gradient-to-br from-rose-50 to-cream-100 rounded-3xl p-8 border border-rose-200/80 hover:border-rose-400 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="space-y-3 z-10">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-200 text-rose-900">
                Varian Singkong Renyah
              </span>
              <h3 className="text-2xl font-black text-brown-900 group-hover:text-caramel-600 transition-colors">
                Keripik Singkong
              </h3>
              <p className="text-sm text-brown-600 leading-relaxed max-w-xs">
                Renyah tipis dengan racikan Pedas Daun Jeruk nampol, Balado cabai asli, BBQ panggang, dan Jagung Bakar.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between z-10">
              <span className="text-sm font-extrabold text-caramel-600 group-hover:underline inline-flex items-center gap-1">
                Jelajahi Keripik Singkong <ArrowRight className="w-4 h-4" />
              </span>
            </div>
            <img
              src="/products/singkong-pedas-daun-jeruk.svg"
              alt="Keripik Singkong"
              className="absolute -right-6 -bottom-6 w-48 h-48 object-contain opacity-85 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
            />
          </Link>
        </div>
      </section>

      {/* Why Choose Us / Value Proposition */}
      <section className="bg-white py-16 border-y border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-brown-900 mb-3">
              Kenapa Memilih Calls Kitchen?
            </h2>
            <p className="text-sm text-brown-600 leading-relaxed">
              Kami berkomitmen menyajikan kualitas camilan terbaik dari bahan baku alami tanpa bahan pengawet berbahaya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-cream-50 border border-cream-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-caramel-100 text-caramel-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-brown-900">Renyah Tanpa Keras</h3>
              <p className="text-sm text-brown-500 leading-relaxed">
                Diolah dengan suhu dan waktu presisi sehingga menghasilkan tekstur krispi renyah yang ringan dan tidak melukai gusi.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-cream-50 border border-cream-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-caramel-100 text-caramel-600 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-brown-900">Bumbu Melimpah &amp; Higienis</h3>
              <p className="text-sm text-brown-500 leading-relaxed">
                Kaya taburan bumbu racikan istimewa pada setiap keping keripik, diproses dalam dapur bersih standar higienitas tinggi.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-cream-50 border border-cream-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-caramel-100 text-caramel-600 flex items-center justify-center mx-auto shadow-inner">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-brown-900">QRIS &amp; COD</h3>
              <p className="text-sm text-brown-500 leading-relaxed">
                Kemudahan pembayaran menggunakan QRIS serba praktis atau Cash on Delivery (bayar tunai saat paket diterima).
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
