import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  QrCode,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Search,
  Eye,
  Check,
  X,
  FileImage,
} from 'lucide-react'
import { Order, PaymentRecord } from '../../types'
import { formatRupiah, formatDate } from '../../lib/utils'
import { StatusBadge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { CODAdapter } from '../../lib/payment/codAdapter'
import { QRISAdapter } from '../../lib/payment/qrisAdapter'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export const AdminPayments: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Proof Modal state
  const [selectedProof, setSelectedProof] = useState<{
    url: string
    orderNumber: string
    totalAmount: number
    uploadedAt?: string
  } | null>(null)

  // Reject Modal state
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  
const fetchPayments = async () => {
  setLoading(true)

  // Gunakan localStorage hanya jika Supabase memang tidak dikonfigurasi.
  if (!isSupabaseConfigured()) {
    try {
      const local: Order[] = JSON.parse(
        localStorage.getItem('calls_kitchen_local_orders') || '[]'
      )
      setOrders(local)
      setPayments([])
    } catch (err) {
      console.error('Error membaca transaksi lokal:', err)
      setOrders([])
      setPayments([])
    } finally {
      setLoading(false)
    }

    return
  }

  // Jika Supabase aktif, gunakan Supabase sebagai satu-satunya sumber data.
  try {
    const [
      { data: ordersData, error: ordersError },
      { data: paymentsData, error: paymentsError },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    if (ordersError) throw ordersError
    if (paymentsError) throw paymentsError

    setOrders(ordersData ?? [])
    setPayments(paymentsData ?? [])
  } catch (err) {
    console.error('Error mengambil data pembayaran dari Supabase:', err)
    setOrders([])
    setPayments([])
  } finally {
    setLoading(false)
  }
}


  useEffect(() => {
    fetchPayments()
  }, [])

  const adminName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin Calls Kitchen'

  // Admin action for recording COD Cash collection
  const handleConfirmCODCash = async (order: Order) => {
    const confirmPrompt = window.confirm(
      `Konfirmasi bahwa uang tunai sebesar ${formatRupiah(
        order.total_amount
      )} untuk pesanan ${order.order_number} telah Anda terima secara fisik?`
    )
    if (!confirmPrompt) return

    setActionLoading(true)
    setActionFeedback(null)

    const result = await CODAdapter.confirmCashReceived(
      order.id,
      user?.id || 'admin',
      adminName
    )

    if (result.success) {
      setActionFeedback(result.message)
      const now = new Date().toISOString()
      const updatedOrders = orders.map((o) =>
        o.id === order.id ? { ...o, payment_status: 'paid' as const, updated_at: now } : o
      )
      setOrders(updatedOrders)

      if (!isSupabaseConfigured()) {
        localStorage.setItem('calls_kitchen_local_orders',
          JSON.stringify(updatedOrders)
        )
      } else {
      setActionFeedback(result.message) }
    }

    setActionLoading(false)
  }

  // Admin action for verifying QRIS payment
  const handleVerifyQRIS = async (order: Order) => {
    const confirmPrompt = window.confirm(
      `Verifikasi bahwa dana transfer QRIS sebesar ${formatRupiah(
        order.total_amount
      )} untuk pesanan ${order.order_number} telah masuk ke rekening toko?`
    )
    if (!confirmPrompt) return

    setActionLoading(true)
    setActionFeedback(null)

    const result = await QRISAdapter.verifyPaymentByAdmin(
      order.id,
      user?.id || 'admin',
      adminName
    )

    if (result.success) {
      setActionFeedback(result.message)
      const now = new Date().toISOString()
      const updatedOrders = orders.map((o) =>
        o.id === order.id
          ? { ...o, payment_status: 'paid' as const, status: 'processing' as const, updated_at: now }
          : o
      )
      setOrders(updatedOrders)
      setPayments((prev) =>
        prev.map((p) =>
          p.order_id === order.id ? { ...p, status: 'paid', verified_at: now } : p
        )
      )
    } else {
      setActionFeedback(result.message)
    }

    setActionLoading(false)
  }

  // Admin action for rejecting QRIS payment
  const handleRejectQRIS = async () => {
    if (!rejectOrder) return
    const reason = rejectionReason.trim() || 'Bukti transfer tidak sesuai atau dana belum masuk.'

    setActionLoading(true)
    setActionFeedback(null)

    const result = await QRISAdapter.rejectPaymentByAdmin(
      rejectOrder.id,
      user?.id || 'admin',
      adminName,
      reason
    )

    if (result.success) {
      setActionFeedback(result.message)
      const now = new Date().toISOString()
      const updatedOrders = orders.map((o) =>
        o.id === rejectOrder.id
          ? {
              ...o,
              payment_status: 'failed' as const,
              status: 'cancelled' as const,
              cancellation_reason: reason,
              updated_at: now,
            }
          : o
      )
      setOrders(updatedOrders)
      setPayments((prev) =>
        prev.map((p) =>
          p.order_id === rejectOrder.id ? { ...p, status: 'failed' } : p
        )
      )
      setRejectOrder(null)
      setRejectionReason('')
    } else {
      setActionFeedback(result.message)
    }

    setActionLoading(false)
  }

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-cream-300">
        <h1 className="text-3xl font-black text-brown-900 tracking-tight">Kelola Pembayaran</h1>
        <p className="text-sm text-brown-600 mt-1">
          Daftar transaksi verifikasi QRIS statis dan pencatatan penerimaan uang tunai COD.
        </p>
      </div>

      {actionFeedback && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Security Rule Warning */}
      <div className="p-4 bg-cream-50 rounded-2xl border border-cream-300 text-xs text-brown-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-caramel-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-brown-900 block">
            Kebijakan Integritas Pembayaran Calls Kitchen
          </span>
          <p className="leading-relaxed text-[11px] text-brown-500">
            Transaksi QRIS diverifikasi secara manual oleh admin setelah mencocokkan bukti transfer dengan mutasi rekening bank/QRIS toko. Status COD dicatat lunas setelah uang tunai fisik diterima kurir.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-cream-300 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-brown-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari no. pesanan atau nama pelanggan..."
          className="w-full text-sm bg-transparent outline-none text-brown-900"
        />
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-200 text-brown-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Pesanan</th>
                <th className="py-3.5 px-4">Metode</th>
                <th className="py-3.5 px-4">Nominal Tagihan</th>
                <th className="py-3.5 px-4">Status Pembayaran</th>
                <th className="py-3.5 px-4">Bukti Transfer</th>
                <th className="py-3.5 px-4">Waktu Transaksi</th>
                <th className="py-3.5 px-4">Aksi Verifikasi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 font-medium">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const isCOD = o.payment_method === 'cod'
                  const isPaid = o.payment_status === 'paid'
                  const isFailed = o.payment_status === 'failed'
                  const paymentRecord =
                    payments.find((p) => p.order_id === o.id) || o.payment
                  const proofUrl = paymentRecord?.payment_details?.proof_url
                  const proofUploadedAt = paymentRecord?.payment_details?.proof_uploaded_at

                  return (
                    <tr key={o.id} className="hover:bg-cream-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-brown-900">{o.order_number}</div>
                        <div className="text-[11px] text-brown-500">{o.recipient_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={o.payment_method} type="method" />
                      </td>
                      <td className="py-3.5 px-4 font-black text-brown-900">
                        {formatRupiah(o.total_amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={o.payment_status} type="payment" />
                      </td>
                      {/* Proof Column */}
                      <td className="py-3.5 px-4">
                        {isCOD ? (
                          <span className="text-brown-400 text-[11px]">- (Tunai COD)</span>
                        ) : proofUrl ? (
                          <button
                            onClick={() =>
                              setSelectedProof({
                                url: proofUrl,
                                orderNumber: o.order_number,
                                totalAmount: o.total_amount,
                                uploadedAt: proofUploadedAt,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cream-100 text-brown-800 hover:bg-caramel-100 hover:text-caramel-800 font-bold text-[11px] transition-colors border border-cream-300"
                          >
                            <Eye className="w-3.5 h-3.5 text-caramel-600" />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                            Belum Ada Bukti
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-brown-600">
                        {formatDate(o.created_at)}
                      </td>
                      {/* Action Column */}
                      <td className="py-3.5 px-4">
                        {isCOD && !isPaid ? (
                          <Button
                            onClick={() => handleConfirmCODCash(o)}
                            isLoading={actionLoading}
                            variant="primary"
                            size="sm"
                            className="font-bold text-xs"
                          >
                            Catat Uang Tunai Diterima
                          </Button>
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Terverifikasi Lunas</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span>Pembayaran Ditolak</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleVerifyQRIS(o)}
                              isLoading={actionLoading}
                              variant="primary"
                              size="sm"
                              className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700"
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Verifikasi Lunas
                            </Button>
                            <Button
                              onClick={() => {
                                setRejectOrder(o)
                                setRejectionReason('')
                              }}
                              isLoading={actionLoading}
                              variant="outline"
                              size="sm"
                              className="font-bold text-xs text-red-600 border-red-200 hover:bg-red-50"
                              leftIcon={<X className="w-3.5 h-3.5" />}
                            >
                              Tolak
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brown-400">
                    Belum ada riwayat transaksi pembayaran.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Modal */}
      <Modal
        isOpen={Boolean(selectedProof)}
        onClose={() => setSelectedProof(null)}
        title="Pratinjau Bukti Transfer Pembayaran"
        maxWidth="lg"
      >
        {selectedProof && (
          <div className="space-y-4 p-2">
            <div className="bg-black/5 p-3 rounded-2xl border border-cream-200 flex items-center justify-center">
              <img
                src={selectedProof.url}
                alt="Bukti Transfer Resolusi Penuh"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="bg-cream-100/70 p-3 rounded-xl border border-cream-200 text-xs text-brown-700 space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold text-brown-500">Nomor Pesanan:</span>
                <span className="font-mono font-bold text-brown-900">{selectedProof.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-brown-500">Nominal Tagihan:</span>
                <span className="font-bold text-caramel-700">{formatRupiah(selectedProof.totalAmount)}</span>
              </div>
              {selectedProof.uploadedAt && (
                <div className="flex justify-between">
                  <span className="font-semibold text-brown-500">Waktu Unggah:</span>
                  <span>{formatDate(selectedProof.uploadedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectOrder)}
        onClose={() => setRejectOrder(null)}
        title="Tolak Pembayaran QRIS"
        maxWidth="md"
      >
        {rejectOrder && (
          <div className="space-y-4 p-2 text-xs">
            <p className="text-brown-700">
              Apakah Anda yakin ingin menolak pembayaran untuk pesanan{' '}
              <strong className="font-mono text-brown-900">{rejectOrder.order_number}</strong>{' '}
              sebesar <strong>{formatRupiah(rejectOrder.total_amount)}</strong>?
            </p>
            <div>
              <label className="block font-bold text-brown-800 mb-1">
                Alasan Penolakan (akan disimpan ke riwayat pesanan):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Bukti transfer buram / nominal tidak sesuai / dana belum masuk."
                className="w-full p-3 rounded-xl border border-cream-300 text-xs text-brown-900 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectOrder(null)}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRejectQRIS}
                isLoading={actionLoading}
              >
                Tolak Pembayaran
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
