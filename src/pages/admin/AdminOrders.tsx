import React, { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Order, OrderStatus } from '../../types'
import { formatRupiah, formatDate } from '../../lib/utils'
import { StatusBadge } from '../../components/common/Badge'
import { Modal } from '../../components/common/Modal'
import { Button } from '../../components/common/Button'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export const AdminOrders: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [updateStatusLoading, setUpdateStatusLoading] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  
  const fetchOrders = async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      // Gunakan data lokal hanya jika Supabase belum dikonfigurasi.
      try {
        const local = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        );
        setOrders(local);
      } catch (err) {
        console.error('Gagal membaca pesanan lokal:', err);
        setOrders([]);
      } finally {
        setLoading(false);
      }

      return;
    }

    // Jika Supabase aktif, jangan mengambil fallback lokal.
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data ?? []);
    } catch (err) {
      console.error('Gagal mengambil pesanan dari Supabase:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchOrders()
  }, [])

  const handleUpdateOrderStatus = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return
    setUpdateStatusLoading(true)
    setFeedbackMsg(null)

    const now = new Date().toISOString()
    const updatedOrder: Order = {
      ...selectedOrder,
      status: newStatus,
      cancellation_reason: newStatus === 'cancelled' ? cancellationReason : selectedOrder.cancellation_reason,
      updated_at: now,
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('orders')
          .update({
            status: newStatus,
            cancellation_reason: newStatus === 'cancelled' ? cancellationReason : null,
            updated_at: now,
          })
          .eq('id', selectedOrder.id)

        // Record status change history
        await supabase.from('order_status_history').insert({
          order_id: selectedOrder.id,
          previous_status: selectedOrder.status,
          new_status: newStatus,
          changed_by: user?.id || 'admin',
          notes: statusNotes || `Status diubah menjadi ${newStatus} oleh admin`,
        })
      } catch (err) {
        console.warn('Error updating live order status:', err)
      }
    }

    // Local storage sync
    const updatedList = orders.map((o) =>
      o.id === selectedOrder.id ? updatedOrder : o
    )
    setOrders(updatedList)
    localStorage.setItem('calls_kitchen_local_orders', JSON.stringify(updatedList))
    setSelectedOrder(updatedOrder)

    setFeedbackMsg(`Status pesanan berhasil diubah menjadi: ${newStatus}`)
    setUpdateStatusLoading(false)
    setStatusNotes('')
  }

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient_phone.includes(search)

    const matchStatus = statusFilter === 'all' || o.status === statusFilter

    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-cream-300">
        <h1 className="text-3xl font-black text-brown-900 tracking-tight">Kelola Pesanan</h1>
        <p className="text-sm text-brown-600 mt-1">
          Pantau status pengiriman, proses pesanan masuk, dan kelola rincian pelanggan.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-cream-300 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. pesanan, nama penerima, atau nomor HP..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-cream-50 border border-cream-300 text-sm text-brown-900 outline-none focus:bg-white focus:border-caramel-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'confirmed', label: 'Baru' },
            { id: 'processing', label: 'Diproses' },
            { id: 'shipped', label: 'Dikirim' },
            { id: 'completed', label: 'Selesai' },
            { id: 'cancelled', label: 'Batal' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-brown-900 text-cream-50'
                  : 'bg-cream-100 hover:bg-cream-200 text-brown-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-200 text-brown-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Pesanan</th>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Penerima &amp; Alamat</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Metode &amp; Bayar</th>
                <th className="py-3.5 px-4">Status Pesanan</th>
                <th className="py-3.5 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 font-medium">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-cream-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brown-900">
                      {o.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-brown-600">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-brown-900 block truncate max-w-xs">
                        {o.recipient_name} ({o.recipient_phone})
                      </span>
                      <span className="text-[11px] text-brown-500 line-clamp-1 max-w-xs">
                        {o.shipping_address}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-brown-900">
                      {formatRupiah(o.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      <StatusBadge status={o.payment_method} type="method" />
                      <div>
                        <StatusBadge status={o.payment_status} type="payment" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={o.status} type="order" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(o)
                          setFeedbackMsg(null)
                          setIsDetailModalOpen(true)
                        }}
                        className="p-2 text-caramel-600 hover:bg-caramel-50 rounded-xl transition-colors font-bold inline-flex items-center gap-1"
                        title="Lihat Detail Pesanan"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Kelola</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brown-400">
                    Tidak ada pesanan yang sesuai dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Status Transition Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Kelola Pesanan: ${selectedOrder?.order_number}`}
        maxWidth="lg"
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs">
            {feedbackMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center gap-2 border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {/* Status Information Box */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-cream-100/70 rounded-2xl border border-cream-300">
              <div>
                <span className="text-brown-500 font-semibold block mb-1">Status Pengiriman</span>
                <StatusBadge status={selectedOrder.status} type="order" />
              </div>
              <div>
                <span className="text-brown-500 font-semibold block mb-1">Status Pembayaran</span>
                <StatusBadge status={selectedOrder.payment_status} type="payment" />
              </div>
            </div>

            {/* Recipient & Shipping Snapshot */}
            <div className="p-4 bg-white rounded-2xl border border-cream-200 space-y-2">
              <span className="font-bold text-brown-900 block uppercase tracking-wider text-[11px]">
                Data Penerima &amp; Alamat Lengkap
              </span>
              <div className="text-brown-800 space-y-1">
                <p>
                  <strong>Nama:</strong> {selectedOrder.recipient_name}
                </p>
                <p>
                  <strong>No. Telepon:</strong> {selectedOrder.recipient_phone}
                </p>
                <p>
                  <strong>Alamat:</strong> {selectedOrder.shipping_address}
                </p>
              </div>
            </div>

            {/* Items Purchased List */}
            <div className="space-y-2">
              <span className="font-bold text-brown-900 block uppercase tracking-wider text-[11px]">
                Daftar Produk ({selectedOrder.order_items?.length || 0} item)
              </span>
              <div className="divide-y divide-cream-100 bg-white rounded-2xl border border-cream-200 p-3">
                {selectedOrder.order_items?.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-brown-900">{item.product_name}</span>
                      <span className="text-brown-500 block">
                        {item.quantity} x {formatRupiah(item.price)}
                      </span>
                    </div>
                    <span className="font-black text-brown-900">
                      {formatRupiah(item.subtotal || item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="pt-3 flex justify-between font-bold text-brown-800">
                  <span>Ongkos Kirim Toko:</span>
                  <span>{formatRupiah(selectedOrder.shipping_cost)}</span>
                </div>
                <div className="pt-2 flex justify-between text-sm font-black text-caramel-600">
                  <span>Total Tagihan:</span>
                  <span>{formatRupiah(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Transition Status Workflow Controls */}
            <div className="p-4 bg-cream-50 rounded-2xl border border-cream-300 space-y-3">
              <span className="font-bold text-brown-900 block uppercase tracking-wider text-[11px]">
                Perbarui Status Pesanan
              </span>
              <p className="text-brown-500 text-[11px]">
                Alur status resmi: Dikonfirmasi &rarr; Diproses &rarr; Dikirim &rarr; Selesai.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleUpdateOrderStatus('confirmed')}
                  disabled={updateStatusLoading || selectedOrder.status === 'confirmed'}
                  variant="outline"
                  size="sm"
                >
                  Dikonfirmasi
                </Button>
                <Button
                  onClick={() => handleUpdateOrderStatus('processing')}
                  disabled={updateStatusLoading || selectedOrder.status === 'processing'}
                  variant="primary"
                  size="sm"
                >
                  Mulai Diproses
                </Button>
                <Button
                  onClick={() => handleUpdateOrderStatus('shipped')}
                  disabled={updateStatusLoading || selectedOrder.status === 'shipped'}
                  variant="secondary"
                  size="sm"
                  leftIcon={<Truck className="w-3.5 h-3.5" />}
                >
                  Pesanan Dikirim
                </Button>
                <Button
                  onClick={() => handleUpdateOrderStatus('completed')}
                  disabled={updateStatusLoading || selectedOrder.status === 'completed'}
                  variant="secondary"
                  size="sm"
                  leftIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                >
                  Pesanan Selesai
                </Button>
                <Button
                  onClick={() => handleUpdateOrderStatus('cancelled')}
                  disabled={updateStatusLoading || selectedOrder.status === 'cancelled'}
                  variant="danger"
                  size="sm"
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Batalkan Pesanan
                </Button>
              </div>

              {selectedOrder.status === 'cancelled' && (
                <div className="pt-2">
                  <label className="block font-bold text-red-700 mb-1">
                    Alasan Pembatalan:
                  </label>
                  <input
                    type="text"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Contoh: Stok bahan habis mendadak atau permintaan pelanggan"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-red-300 text-xs text-brown-900 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsDetailModalOpen(false)} variant="outline">
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
