import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingBag, User as UserIcon, Menu, X, ShieldAlert, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const { user, isAdmin, logout } = useAuth()
  const { totalItemsCount } = useCart()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  // Track pending payment orders for the current user
  useEffect(() => {
    if (!user) {
      setPendingOrdersCount(0)
      return
    }

    const checkPendingOrders = async () => {
      let count = 0
      if (isSupabaseConfigured()) {
        try {
          const { count: dbCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('payment_status', 'pending')
          if (dbCount !== null && dbCount !== undefined) count = dbCount
        } catch {
          // Ignore
        }
      } else {
        try {
          const localOrders = JSON.parse(
            localStorage.getItem('calls_kitchen_local_orders') || '[]'
          )
          count = localOrders.filter(
            (o: any) => o.user_id === user.id && o.payment_status === 'pending'
          ).length
        } catch {
          // Ignore
        }
      }
      setPendingOrdersCount(count)
    }

    checkPendingOrders()
  }, [user, location.pathname])

  const navLinks = [
    { label: 'Beranda', href: '/' },
    { label: 'Katalog', href: '/catalog' },
    { label: 'Keranjang', href: '/cart' },
  ]

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-40 bg-cream-50/95 backdrop-blur-md border-b border-cream-300 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-caramel-400 rounded-xl p-1"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-caramel-500 to-caramel-700 flex items-center justify-center text-white font-black text-xl shadow-md group-hover:scale-105 transition-transform border border-caramel-300">
              CK
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight text-brown-900 group-hover:text-caramel-600 transition-colors">
                Calls Kitchen
              </span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-brown-500">
                Keripik Pisang &amp; Singkong
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-cream-200/70 p-1.5 rounded-2xl border border-cream-300" aria-label="Navigasi Utama">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-brown-900 text-cream-50 shadow-sm'
                      : 'text-brown-700 hover:text-brown-950 hover:bg-cream-100'
                  }`}
                >
                  {link.label}
                  {link.href === '/cart' && totalItemsCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-caramel-500 rounded-full">
                      {totalItemsCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Action Icons (Auth & Cart on Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Cart button */}
            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl text-brown-700 hover:text-caramel-600 hover:bg-cream-200 transition-colors"
              aria-label={`Keranjang belanja, ${totalItemsCount} item`}
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-caramel-500 text-white font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {totalItemsCount}
                </span>
              )}
            </Link>

            {/* Admin Badge/Link if user is Admin */}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-caramel-800 bg-caramel-100 hover:bg-caramel-200 border border-caramel-300 rounded-xl transition-colors shadow-xs"
              >
                <ShieldAlert className="w-4 h-4 text-caramel-600" />
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Profile or Login */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-brown-800 bg-cream-200 hover:bg-cream-300/80 transition-colors border border-cream-300"
                >
                  <UserIcon className="w-4 h-4 text-caramel-600" />
                  <span className="max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Profil'}
                  </span>
                  {pendingOrdersCount > 0 && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse shadow-xs"
                      title={`${pendingOrdersCount} pesanan menunggu pembayaran`}
                    >
                      {pendingOrdersCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-brown-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Keluar"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold bg-caramel-500 hover:bg-caramel-600 text-white shadow-sm transition-all"
              >
                Masuk
              </Link>
            )}
          </div>

          {/* Mobile Menu & Cart Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/cart"
              className="relative p-2 rounded-xl text-brown-800 hover:bg-cream-200"
              aria-label={`Keranjang belanja, ${totalItemsCount} item`}
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItemsCount > 0 && (
                <span className="absolute top-0 right-0 bg-caramel-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItemsCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-brown-800 hover:bg-cream-200 transition-colors"
              aria-label="Buka menu navigasi"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cream-300 bg-cream-50 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200 shadow-xl">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-base transition-colors ${
                    active
                      ? 'bg-brown-900 text-white'
                      : 'text-brown-800 hover:bg-cream-200'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.href === '/cart' && totalItemsCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-caramel-500 rounded-full">
                      {totalItemsCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="pt-3 border-t border-cream-200 space-y-2">
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-bold text-caramel-800 bg-caramel-100 rounded-xl"
              >
                <ShieldAlert className="w-5 h-5 text-caramel-600" />
                <span>Dashboard Admin</span>
              </Link>
            )}

            {user ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-brown-900 bg-cream-200 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-caramel-600" />
                    <span>Profil Saya ({user.email})</span>
                  </div>
                  {pendingOrdersCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white animate-pulse">
                      {pendingOrdersCount} Belum Dibayar
                    </span>
                  )}
                </Link>
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false)
                    await handleLogout()
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 text-center text-sm font-bold bg-caramel-500 text-white rounded-xl shadow-sm"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-3 text-center text-sm font-bold bg-cream-200 text-brown-800 rounded-xl border border-cream-300"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
