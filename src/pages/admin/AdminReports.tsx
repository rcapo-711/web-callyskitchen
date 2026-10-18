import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import { Order } from '../../types'
import { formatRupiah, formatDate } from '../../lib/utils'
import { Button } from '../../components/common/Button'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const AdminReports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days'>('all')

  
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)

      // Gunakan data lokal hanya jika Supabase tidak dikonfigurasi.
      if (!isSupabaseConfigured()) {
        try {
          const local: Order[] = JSON.parse(
            localStorage.getItem('calls_kitchen_local_orders') || '[]'
          )
          setOrders(local)
        } catch (err) {
          console.error('Error membaca transaksi lokal:', err)
          setOrders([])
        } finally {
          setLoading(false)
        }

        return
      }

      // Jika Supabase aktif, jangan mengambil data lokal sebagai fallback.
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false })

        if (error) throw error

        setOrders(data ?? [])
      } catch (err) {
        console.error('Error mengambil pesanan untuk laporan:', err)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])


  // Filter orders by date range
  const filteredOrders = orders.filter((o) => {
    if (dateRange === 'all') return true
    const orderDate = new Date(o.created_at).getTime()
    const now = Date.now()
    if (dateRange === '7days') {
      return now - orderDate <= 7 * 24 * 60 * 60 * 1000
    }
    if (dateRange === '30days') {
      return now - orderDate <= 30 * 24 * 60 * 60 * 1000
    }
    return true
  })

  // Total verified payments (ONLY paid)
  const paidOrders = filteredOrders.filter((o) => o.payment_status === 'paid')
  const verifiedRevenue = paidOrders.reduce((acc, o) => acc + o.total_amount, 0)
  const unpaidOrders = filteredOrders.filter((o) => o.payment_status !== 'paid')
  const unpaidPotential = unpaidOrders.reduce((acc, o) => acc + o.total_amount, 0)

  // Top products from order items
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>()
  filteredOrders.forEach((o) => {
    o.order_items?.forEach((item) => {
      const existing = productSalesMap.get(item.product_name)
      if (existing) {
        existing.qty += item.quantity
        existing.revenue += item.subtotal || item.price * item.quantity
      } else {
        productSalesMap.set(item.product_name, {
          name: item.product_name,
          qty: item.quantity,
          revenue: item.subtotal || item.price * item.quantity,
        })
      }
    })
  })
  const topSoldProducts = Array.from(productSalesMap.values()).sort(
    (a, b) => b.qty - a.qty
  )

  // Export to CSV function
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data pesanan untuk diekspor.')
      return
    }

    const headers = [
      'Nomor Pesanan',
      'Tanggal',
      'Penerima',
      'No Telepon',
      'Alamat Pengiriman',
      'Metode Pembayaran',
      'Status Pembayaran',
      'Status Pesanan',
      'Subtotal (Rp)',
      'Ongkir (Rp)',
      'Total Akhir (Rp)',
    ]

    const rows = filteredOrders.map((o) => [
      `"${o.order_number}"`,
      `"${formatDate(o.created_at)}"`,
      `"${o.recipient_name.replace(/"/g, '""')}"`,
      `"${o.recipient_phone}"`,
      `"${o.shipping_address.replace(/"/g, '""')}"`,
      `"${o.payment_method}"`,
      `"${o.payment_status}"`,
      `"${o.status}"`,
      o.subtotal,
      o.shipping_cost,
      o.total_amount,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan-penjualan-calls-kitchen-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cream-300">
        <div>
          <h1 className="text-3xl font-black text-brown-900 tracking-tight">Laporan Penjualan</h1>
          <p className="text-sm text-brown-600 mt-1">
            Rekap pendapatan terverifikasi, volume pesanan, dan ekspor data pembukuan.
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="primary"
          leftIcon={<Download className="w-4 h-4" />}
          className="font-bold self-start sm:self-auto"
        >
          Ekspor Laporan (CSV)
        </Button>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-cream-300 w-fit">
        <Calendar className="w-4 h-4 text-caramel-600 ml-2" />
        <button
          onClick={() => setDateRange('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            dateRange === 'all'
              ? 'bg-brown-900 text-white'
              : 'text-brown-700 hover:bg-cream-100'
          }`}
        >
          Semua Waktu
        </button>
        <button
          onClick={() => setDateRange('30days')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            dateRange === '30days'
              ? 'bg-brown-900 text-white'
              : 'text-brown-700 hover:bg-cream-100'
          }`}
        >
          30 Hari Terakhir
        </button>
        <button
          onClick={() => setDateRange('7days')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            dateRange === '7days'
              ? 'bg-brown-900 text-white'
              : 'text-brown-700 hover:bg-cream-100'
          }`}
        >
          7 Hari Terakhir
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-cream-300 shadow-xs space-y-2">
          <span className="text-xs font-bold text-brown-500 uppercase tracking-wider block">
            Pendapatan Lunas (Kas Masuk)
          </span>
          <div className="text-2xl font-black text-emerald-700">
            {formatRupiah(verifiedRevenue)}
          </div>
          <span className="text-[11px] text-brown-400 block">
            Dari {paidOrders.length} transaksi yang sudah lunas
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-300 shadow-xs space-y-2">
          <span className="text-xs font-bold text-brown-500 uppercase tracking-wider block">
            Total Transaksi Masuk
          </span>
          <div className="text-2xl font-black text-brown-900">
            {filteredOrders.length} Pesanan
          </div>
          <span className="text-[11px] text-brown-400 block">
            {paidOrders.length} lunas, {unpaidOrders.length} tertunda/COD
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-cream-300 shadow-xs space-y-2">
          <span className="text-xs font-bold text-brown-500 uppercase tracking-wider block">
            Nilai Pesanan Belum Lunas
          </span>
          <div className="text-2xl font-black text-amber-600">
            {formatRupiah(unpaidPotential)}
          </div>
          <span className="text-[11px] text-brown-400 block">
            Tidak dimasukkan ke pendapatan riil sampai diverifikasi
          </span>
        </div>
      </div>

      {/* Product Sales Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-cream-300 shadow-xs space-y-4">
        <h2 className="text-base font-black text-brown-900">
          Rekap Produk Terjual dalam Periode
        </h2>

        {topSoldProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/70 border-b border-cream-200 text-brown-600 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Jumlah Terjual</th>
                  <th className="py-3 px-4 text-right">Total Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100 font-medium">
                {topSoldProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-cream-50/70">
                    <td className="py-3 px-4 font-bold text-brown-900">{p.name}</td>
                    <td className="py-3 px-4 text-brown-700">{p.qty} bungkus</td>
                    <td className="py-3 px-4 text-right font-black text-caramel-600">
                      {formatRupiah(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-brown-400">
            Belum ada rincian produk terjual pada rentang tanggal ini.
          </div>
        )}
      </div>
    </div>
  )
}
