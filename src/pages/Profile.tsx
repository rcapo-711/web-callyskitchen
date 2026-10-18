import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  User as UserIcon,
  Phone,
  MapPin,
  Mail,
  Package,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Clock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/common/Button'
import { StatusBadge } from '../components/common/Badge'
import { formatRupiah, formatDate } from '../lib/utils'
import { Order } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const Profile: React.FC = () => {
  const { user, profile, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const isLoggingOutRef = useRef(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    },
  })

  // Synchronize form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      })
    }
  }, [profile, reset])

  // Redirect if not logged in (unless intentionally logging out to home)
  useEffect(() => {
    if (!user && !isLoggingOutRef.current) {
      navigate('/login?redirect=/profile', { replace: true })
    }
  }, [user, navigate])

  // Fetch orders owned by current user
  useEffect(() => {
    if (!user) return

    const fetchMyOrders = async () => {
      setLoadingOrders(true)
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (!error && data) {
            setOrders(data)
            setLoadingOrders(false)
            return
          }
        } catch (err) {
          console.warn('Error fetching orders from DB:', err)
        }
      }

      // Check local storage orders for this user
      try {
        const localOrders: Order[] = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        )
        const userOrders = localOrders.filter((o) => o.user_id === user.id)
        setOrders(userOrders)
      } catch {
        setOrders([])
      }

      setLoadingOrders(false)
    }

    fetchMyOrders()
  }, [user])

  const onUpdateProfile = async (values: {
    full_name: string
    phone: string
    address: string
  }) => {
    setSaveError(null)
    setSaveSuccess(false)
    const { error } = await updateProfile(values)
    if (error) {
      setSaveError(error.message || 'Gagal menyimpan profil.')
    } else {
      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const handleLogout = async () => {
    isLoggingOutRef.current = true
    await logout()
    navigate('/', { replace: true })
  }

  if (!user) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cream-300">
        <div>
          <h1 className="text-3xl font-black text-brown-900 tracking-tight">Profil &amp; Pesanan Saya</h1>
          <p className="text-sm text-brown-600">
            Kelola data akun dan lihat riwayat pembelian camilan Calls Kitchen Anda.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Akun</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Details Card (Left: 4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-cream-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-cream-200">
            <h2 className="text-lg font-black text-brown-900">Data Diri</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-caramel-600 hover:text-caramel-700 underline"
            >
              {isEditing ? 'Batal' : 'Edit Profil'}
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profil berhasil diperbarui!</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{saveError}</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  {...register('full_name')}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  {...register('phone')}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
                  Alamat Pengiriman
                </label>
                <textarea
                  rows={3}
                  {...register('address')}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 outline-none resize-none"
                />
              </div>

              <Button type="submit" variant="primary" size="sm" className="w-full font-bold">
                Simpan Perubahan
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <UserIcon className="w-4 h-4 text-caramel-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-brown-400 font-semibold">Nama Lengkap</span>
                  <span className="font-bold text-brown-900">
                    {profile?.full_name || user.user_metadata?.full_name || '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-caramel-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-brown-400 font-semibold">Email</span>
                  <span className="font-bold text-brown-900">{user.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-caramel-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-brown-400 font-semibold">Nomor Telepon</span>
                  <span className="font-bold text-brown-900">{profile?.phone || '-'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-caramel-600 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs text-brown-400 font-semibold">Alamat Tersimpan</span>
                  <span className="font-medium text-brown-800 leading-relaxed block">
                    {profile?.address || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order History List (Right: 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {(() => {
            const pendingCount = orders.filter(
              (o) => o.payment_status === 'pending' && o.payment_method === 'qris'
            ).length

            return (
              <>
                <div className="flex flex-wrap items-center justify-between pb-2 gap-2">
                  <h2 className="text-xl font-black text-brown-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-caramel-600" />
                    <span>Riwayat Pesanan ({orders.length})</span>
                  </h2>
                  {pendingCount > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      <span>{pendingCount} Pesanan Menunggu Pembayaran</span>
                    </span>
                  )}
                </div>

                {pendingCount > 0 && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300/80 flex items-start gap-3 text-xs text-amber-900 shadow-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-amber-950 block">
                        Anda memiliki {pendingCount} pesanan yang belum dibayar
                      </span>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Klik tombol <strong>Bayar Sekarang</strong> pada kartu pesanan di bawah untuk membuka kode QRIS dan mengunggah bukti transfer Anda.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          {loadingOrders ? (
            <div className="p-8 bg-white rounded-3xl border border-cream-300 text-center text-brown-500">
              Memuat riwayat pesanan...
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-cream-300 shadow-xs space-y-4 hover:border-caramel-300 transition-colors"
                >
                  {/* Order Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cream-200 text-xs">
                    <div>
                      <span className="text-brown-400 font-semibold block">Nomor Pesanan</span>
                      <span className="font-mono font-bold text-brown-900 text-sm">
                        {order.order_number}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-brown-400 font-semibold block">Tanggal</span>
                      <span className="font-bold text-brown-800">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status} type="order" />
                    <StatusBadge status={order.payment_status} type="payment" />
                    <StatusBadge status={order.payment_method} type="method" />
                  </div>

                  {/* Purchased Items List */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="space-y-2 bg-cream-50 p-3 rounded-2xl border border-cream-200 text-xs">
                      {order.order_items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="font-bold text-brown-900">
                            {item.product_name} <span className="text-brown-500">x{item.quantity}</span>
                          </span>
                          <span className="font-bold text-brown-800">
                            {formatRupiah(item.subtotal || item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Shipping Address Snapshot */}
                  <div className="text-xs text-brown-600 bg-cream-50/50 p-3 rounded-xl border border-cream-200/60">
                    <span className="font-bold text-brown-800 block mb-0.5">
                      Tujuan Pengiriman ({order.recipient_name} - {order.recipient_phone})
                    </span>
                    <span>{order.shipping_address}</span>
                  </div>

                  {/* Total & Action */}
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-brown-400 block font-semibold">Total Pembayaran</span>
                      <span className="text-lg font-black text-caramel-600">
                        {formatRupiah(order.total_amount)}
                      </span>
                    </div>

                    {order.payment_method === 'qris' && order.payment_status === 'pending' && (
                      <Link
                        to={`/payment/${order.id}?orderNumber=${order.order_number}&method=qris`}
                        className="px-4 py-2 bg-caramel-500 hover:bg-caramel-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                      >
                        Bayar Sekarang
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-10 border border-cream-300 text-center space-y-3">
              <Package className="w-12 h-12 text-cream-400 mx-auto" />
              <h3 className="font-bold text-brown-900">Belum Ada Pesanan</h3>
              <p className="text-xs text-brown-500 max-w-sm mx-auto">
                Anda belum pernah melakukan pesanan. Jelajahi katalog kami dan temukan varian keripik favorit Anda!
              </p>
              <Link
                to="/catalog"
                className="inline-block px-5 py-2.5 rounded-xl bg-caramel-500 hover:bg-caramel-600 text-white text-xs font-bold shadow-sm"
              >
                Mulai Belanja
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
