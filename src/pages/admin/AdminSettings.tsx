import React, { useState, useEffect } from 'react'
import {
  Settings,
  Store,
  Phone,
  MessageCircle,
  MapPin,
  Truck,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { StoreSettings } from '../../types'
import { DEFAULT_STORE_SETTINGS } from '../../data/seedData'
import { Button } from '../../components/common/Button'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)

      if (!isSupabaseConfigured()) {
        try {
          const local = localStorage.getItem('calls_kitchen_store_settings')

          setSettings(
            local ? JSON.parse(local) : DEFAULT_STORE_SETTINGS
          )
        } catch (err) {
          console.error('Error membaca pengaturan lokal:', err)
          setSettings(DEFAULT_STORE_SETTINGS)
        } finally {
          setLoading(false)
        }

        return
      }

      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('key', 'general')
          .maybeSingle()

        if (error) throw error

        setSettings(data?.value ?? DEFAULT_STORE_SETTINGS)
      } catch (err) {
        console.error('Error mengambil pengaturan toko:', err)
        setSaveError('Gagal mengambil pengaturan dari Supabase.')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])


  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('store_settings')
          .upsert({
            key: 'general',
            value: settings,
            updated_at: new Date().toISOString(),
          })

        if (error) throw error
      } else {
        localStorage.setItem(
          'calls_kitchen_store_settings',
          JSON.stringify(settings)
        )
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(
        (err as Error).message || 'Gagal menyimpan pengaturan toko.'
      )
    } finally {
      setIsSaving(false)
    }

  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="pb-4 border-b border-cream-300">
        <h1 className="text-3xl font-black text-brown-900 tracking-tight">Pengaturan Toko</h1>
        <p className="text-sm text-brown-600 mt-1">
          Atur informasi kontak, tarif ongkos kirim standar, dan status operasional dapur.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pengaturan toko berhasil disimpan!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Security notice */}
      <div className="p-4 bg-cream-50 rounded-2xl border border-cream-300 text-xs text-brown-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-caramel-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px] text-brown-500">
          Kunci rahasia (Secret Key) pembayaran disimpan secara aman di backend/Supabase Edge Function Secrets dan tidak pernah disimpan pada tabel publik ini.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-xs space-y-6">
        <div className="space-y-4">
          <h2 className="text-base font-black text-brown-900 pb-2 border-b border-cream-200 flex items-center gap-2">
            <Store className="w-5 h-5 text-caramel-600" />
            <span>Identitas Toko &amp; Status Operasional</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
                Nama Toko
              </label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-cream-50 border border-cream-300 text-sm text-brown-900 outline-none focus:bg-white focus:border-caramel-500"
                required
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="store-open"
                type="checkbox"
                checked={settings.is_store_open}
                onChange={(e) => setSettings({ ...settings, is_store_open: e.target.checked })}
                className="w-5 h-5 rounded accent-caramel-500 cursor-pointer"
              />
              <label htmlFor="store-open" className="text-sm font-bold text-brown-900 cursor-pointer">
                Toko Sedang Buka &amp; Menerima Pesanan
              </label>
            </div>
          </div>
        </div>

        {/* Shipping Configuration */}
        <div className="space-y-4 pt-4 border-t border-cream-200">
          <h2 className="text-base font-black text-brown-900 pb-2 border-b border-cream-200 flex items-center gap-2">
            <Truck className="w-5 h-5 text-caramel-600" />
            <span>Tarif Pengiriman Toko</span>
          </h2>

          <div className="max-w-xs">
            <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
              Biaya Pengiriman Standar (Rp)
            </label>
            <input
              type="number"
              value={settings.default_shipping_cost}
              onChange={(e) => setSettings({ ...settings, default_shipping_cost: Number(e.target.value) })}
              min={0}
              step={1000}
              className="w-full px-3 py-2.5 rounded-xl bg-cream-50 border border-cream-300 text-sm text-brown-900 outline-none focus:bg-white focus:border-caramel-500"
              required
            />
            <span className="text-[11px] text-brown-400 mt-1 block">
              Tarif flat yang diterapkan saat checkout pesanan.
            </span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4 pt-4 border-t border-cream-200">
          <h2 className="text-base font-black text-brown-900 pb-2 border-b border-cream-200 flex items-center gap-2">
            <Phone className="w-5 h-5 text-caramel-600" />
            <span>Kontak &amp; Alamat Toko</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
                Nomor Telepon Operasional
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-cream-50 border border-cream-300 text-sm text-brown-900 outline-none focus:bg-white focus:border-caramel-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
                Nomor WhatsApp (dengan kode negara 62)
              </label>
              <input
                type="text"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-cream-50 border border-cream-300 text-sm text-brown-900 outline-none focus:bg-white focus:border-caramel-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1">
              Alamat Dapur / Toko Fisik
            </label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-cream-50 border border-cream-300 text-sm text-brown-900 outline-none focus:bg-white focus:border-caramel-500 resize-none"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-cream-200 flex justify-end">
          <Button
            type="submit"
            isLoading={isSaving}
            variant="primary"
            size="md"
            className="font-bold"
          >
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  )
}
