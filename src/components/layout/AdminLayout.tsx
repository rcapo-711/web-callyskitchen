import React, { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, role, logout, isLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Kelola Produk', href: '/admin/products', icon: Package },
    { label: 'Kelola Pesanan', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Pembayaran', href: '/admin/payments', icon: CreditCard },
    { label: 'Pelanggan', href: '/admin/customers', icon: Users },
    { label: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3 },
    { label: 'Pengaturan Toko', href: '/admin/settings', icon: Settings },
  ]

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true
    if (path !== '/admin' && location.pathname.startsWith(path)) return true
    return false
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-caramel-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Security Guard: Check Admin role
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-red-200 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-brown-900">Akses Ditolak</h2>
          <p className="text-xs text-brown-600 leading-relaxed">
            Halaman ini hanya dapat diakses oleh akun dengan role <strong>admin</strong> yang terotorisasi pada database.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            {!user ? (
              <Link
                to="/login?redirect=/admin"
                className="py-3 px-4 bg-caramel-500 hover:bg-caramel-600 text-white font-bold rounded-xl text-sm"
              >
                Masuk dengan Akun Admin
              </Link>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="py-3 px-4 bg-cream-200 hover:bg-cream-300 text-brown-800 font-bold rounded-xl text-sm"
              >
                Kembali ke Beranda
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100/60 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-brown-950/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-brown-900 text-cream-100 z-50 flex flex-col transition-transform duration-300 ease-in-out border-r border-brown-800 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-brown-800 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-caramel-500 flex items-center justify-center text-white font-black text-lg shadow">
              CK
            </div>
            <div>
              <span className="font-extrabold text-lg text-cream-50 block leading-tight">
                Calls Kitchen
              </span>
              <span className="text-[11px] font-semibold text-caramel-400 block">
                Admin Panel
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-cream-400 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Menu Admin">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-caramel-500 text-white shadow-sm'
                    : 'text-cream-300 hover:bg-brown-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions & User Profile */}
        <div className="p-4 border-t border-brown-800 space-y-3">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-cream-300 hover:bg-brown-800 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-caramel-400" />
              <span>Lihat Toko Publik</span>
            </span>
          </Link>

          <div className="bg-brown-800/80 p-3 rounded-2xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-xs font-bold text-cream-50 block truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrator'}
              </span>
              <span className="text-[10px] text-caramel-400 font-semibold block uppercase">
                {role}
              </span>
            </div>
            <button
              onClick={async () => {
                await logout()
                navigate('/', { replace: true })
              }}
              className="p-2 text-cream-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Mobile Toggle */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-cream-300 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-brown-800 hover:bg-cream-100 rounded-xl"
            aria-label="Buka menu admin"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-black text-brown-900 text-sm">Calls Kitchen Admin</span>
          <div className="w-6" />
        </header>

        {/* Routed Sub-pages */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
