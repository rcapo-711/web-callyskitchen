import React, { useState, useEffect } from 'react'
import { Users, Search, ShoppingBag, Phone, MapPin } from 'lucide-react'
import { Order } from '../../types'
import { formatRupiah } from '../../lib/utils'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

interface CustomerAggregated {
  name: string
  phone: string
  address: string
  orderCount: number
  totalSpent: number
  lastOrderDate: string
}

export const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerAggregated[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  
useEffect(() => {
  const fetchCustomers = async () => {
    setLoading(true);

    try {
      let orders: Order[] = [];

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('orders')
          .select('*');

        if (error) throw error;

        orders = (data ?? []) as Order[];
      } else {
        // Gunakan data lokal hanya jika Supabase belum dikonfigurasi.
        orders = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        );
      }

      const map = new Map<string, CustomerAggregated>();

      orders.forEach((o) => {
        const key = o.recipient_phone || o.recipient_name;
        const existing = map.get(key);

        if (existing) {
          existing.orderCount += 1;

          if (o.payment_status === 'paid') {
            existing.totalSpent += o.total_amount;
          }

          if (o.created_at > existing.lastOrderDate) {
            existing.lastOrderDate = o.created_at;
          }
        } else {
          map.set(key, {
            name: o.recipient_name,
            phone: o.recipient_phone,
            address: o.shipping_address,
            orderCount: 1,
            totalSpent:
              o.payment_status === 'paid' ? o.total_amount : 0,
            lastOrderDate: o.created_at,
          });
        }
      });

      setCustomers(Array.from(map.values()));
    } catch (err) {
      console.error('Gagal mengambil data pelanggan:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  fetchCustomers();
}, []);


  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-cream-300">
        <h1 className="text-3xl font-black text-brown-900 tracking-tight">Data Pelanggan</h1>
        <p className="text-sm text-brown-600 mt-1">
          Daftar pelanggan aktif yang telah melakukan transaksi di Calls Kitchen.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-cream-300 shadow-xs flex items-center gap-3">
        <Search className="w-5 h-5 text-brown-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama pelanggan, nomor telepon, atau alamat..."
          className="w-full text-sm bg-transparent outline-none text-brown-900"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-3xl border border-cream-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-200 text-brown-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Pelanggan</th>
                <th className="py-3.5 px-4">Kontak Telepon</th>
                <th className="py-3.5 px-4">Alamat Pengiriman</th>
                <th className="py-3.5 px-4">Total Pesanan</th>
                <th className="py-3.5 px-4">Total Belanja Lunas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100 font-medium">
              {filtered.length > 0 ? (
                filtered.map((c, idx) => (
                  <tr key={idx} className="hover:bg-cream-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-brown-900">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-brown-700 font-mono">
                      {c.phone}
                    </td>
                    <td className="py-3.5 px-4 text-brown-600 max-w-sm truncate">
                      {c.address}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brown-900">
                      {c.orderCount} pesanan
                    </td>
                    <td className="py-3.5 px-4 font-black text-caramel-600">
                      {formatRupiah(c.totalSpent)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-brown-400">
                    Belum ada data pelanggan yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
