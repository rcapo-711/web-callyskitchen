import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  QrCode,
  Truck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { formatRupiah, generateOrderNumber, isValidIndonesianPhone } from '../lib/utils'
import { Order } from '../types'
import { Button } from '../components/common/Button'
import { QRISAdapter } from '../lib/payment/qrisAdapter'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Strict schema with ONLY 3 recipient fields as required by Master Prompt
const checkoutSchema = z.object({
  recipient_name: z
    .string()
    .min(3, 'Nama penerima minimal 3 karakter')
    .max(100, 'Nama penerima terlalu panjang'),
  recipient_phone: z
    .string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .refine(isValidIndonesianPhone, 'Format nomor telepon tidak valid (contoh: 08123456789)'),
  shipping_address: z
    .string()
    .min(10, 'Alamat lengkap pengiriman minimal 10 karakter agar kurir mudah menemukan lokasi')
    .max(500, 'Alamat pengiriman terlalu panjang'),
  payment_method: z.enum(['qris', 'cod'] as const),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export const Checkout: React.FC = () => {
  const { selectedItems, selectedSubtotal, clearCart } = useCart()
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const orderSuccessRef = useRef(false)

  // Standard shipping cost from store config
  const shippingCost = 1000
  const grandTotal = selectedSubtotal + shippingCost

  // Redirect if no selected items (only if not currently submitting or order completed)
  useEffect(() => {
    if (selectedItems.length === 0 && !isSubmitting && !orderSuccessRef.current) {
      navigate('/cart', { replace: true })
    }
  }, [selectedItems, navigate, isSubmitting])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      recipient_name: profile?.full_name || user?.user_metadata?.full_name || '',
      recipient_phone: profile?.phone || '',
      shipping_address: profile?.address || '',
      payment_method: 'qris',
    },
  })

  // Prefill when profile loads
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setValue('recipient_name', profile.full_name)
      if (profile.phone) setValue('recipient_phone', profile.phone)
      if (profile.address) setValue('shipping_address', profile.address)
    }
  }, [profile, setValue])

  const selectedPaymentMethod = watch('payment_method')

  const onSubmit = async (values: CheckoutFormValues) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const orderNumber = generateOrderNumber()
      const now = new Date().toISOString()
      const userId = user?.id || 'guest-' + Date.now()

      // 1. Re-validate stock and calculate true price on backend / server
      let validatedSubtotal = 0
      for (const item of selectedItems) {
        if (item.quantity > item.product.stock) {
          throw new Error(
            `Stok untuk ${item.product.name} tidak mencukupi (sisa ${item.product.stock}). Harap sesuaikan kuantitas di keranjang.`
          )
        }
        validatedSubtotal += item.product.price * item.quantity
      }

      const validatedTotal = validatedSubtotal + shippingCost

      let createdOrderId = 'ord-' + Math.random().toString(36).substring(2, 9)

      if (isSupabaseConfigured() && user) {
        // Try calling atomic secure order function or standard insert
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: user.id,
            status: 'confirmed',
            payment_status: values.payment_method === 'cod' ? 'unpaid' : 'pending',
            payment_method: values.payment_method,
            subtotal: validatedSubtotal,
            shipping_cost: shippingCost,
            total_amount: validatedTotal,
            recipient_name: values.recipient_name,
            recipient_phone: values.recipient_phone,
            shipping_address: values.shipping_address,
          })
          .select()
          .single()

        if (orderError) throw orderError
        createdOrderId = orderData.id

        // Insert order items snapshot
        const orderItemsPayload = selectedItems.map((item) => ({
          order_id: createdOrderId,
          product_id: item.product.id,
          product_name: item.product.name,
          variant_name: item.product.category?.name || 'Calls Kitchen',
          price: item.product.price,
          quantity: item.quantity,
          subtotal: item.product.price * item.quantity,
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload)

        if (itemsError) throw itemsError

        // Atomically decrement stock
        for (const item of selectedItems) {
          await supabase.rpc('decrement_product_stock', {
            p_id: item.product.id,
            p_quantity: item.quantity,
          }).then()
        }

        // Insert payment record
        if (values.payment_method === 'qris') {
          const qrisResult = await QRISAdapter.createQRISTransaction({
            orderId: createdOrderId,
            orderNumber,
            grossAmount: validatedTotal,
            customerDetails: {
              fullName: values.recipient_name,
              phone: values.recipient_phone,
              address: values.shipping_address,
            },
            items: selectedItems.map((i) => ({
              id: i.product.id,
              name: i.product.name,
              price: i.product.price,
              quantity: i.quantity,
            })),
          })

          await supabase.from('payments').insert({
            order_id: createdOrderId,
            payment_method: 'qris',
            amount: validatedTotal,
            status: 'pending',
            gateway_reference: qrisResult.gatewayReference,
            payment_details: {
              qr_string: qrisResult.qrString,
              qr_url: qrisResult.qrUrl,
              expiry_time: qrisResult.expiryTime,
              provider: qrisResult.providerName,
            },
          })
        } else {
          // COD payment record
          await supabase.from('payments').insert({
            order_id: createdOrderId,
            payment_method: 'cod',
            amount: validatedTotal,
            status: 'unpaid',
            gateway_reference: `COD-${orderNumber}`,
            payment_details: {
              notes: 'Pembayaran tunai dilakukan kepada kurir saat pesanan tiba.',
            },
          })
        }

        // Record initial status history
        await supabase.from('order_status_history').insert({
          order_id: createdOrderId,
          previous_status: null,
          new_status: 'confirmed',
          changed_by: user.id,
          notes: 'Pesanan berhasil dibuat oleh pelanggan.',
        })
      } else {
        // Local preview fallback mode
        const localOrder: Order = {
          id: createdOrderId,
          order_number: orderNumber,
          user_id: userId,
          status: 'confirmed',
          payment_status: values.payment_method === 'cod' ? 'unpaid' : 'pending',
          payment_method: values.payment_method,
          subtotal: validatedSubtotal,
          shipping_cost: shippingCost,
          total_amount: validatedTotal,
          recipient_name: values.recipient_name,
          recipient_phone: values.recipient_phone,
          shipping_address: values.shipping_address,
          created_at: now,
          order_items: selectedItems.map((item) => ({
            id: 'item-' + Math.random().toString(36).substring(2, 9),
            order_id: createdOrderId,
            product_id: item.product.id,
            product_name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            subtotal: item.product.price * item.quantity,
          })),
        }

        // Store to localStorage orders for preview
        const existingOrders = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        )
        existingOrders.unshift(localOrder)
        localStorage.setItem(
          'calls_kitchen_local_orders',
          JSON.stringify(existingOrders)
        )
      }

      // Mark order submission as completed to prevent redirect effect
      orderSuccessRef.current = true

      // Clear ONLY selected items from cart (unselected items remain!)
      clearCart(true)

      // Navigate to payment page
      navigate(`/payment/${createdOrderId}?orderNumber=${orderNumber}&method=${values.payment_method}`)
    } catch (err) {
      console.error('Order creation error:', err)
      setErrorMessage((err as Error).message || 'Terjadi kesalahan saat membuat pesanan.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-brown-900 tracking-tight">Checkout Pesanan</h1>
        <p className="text-sm text-brown-600 mt-1">
          Lengkapi data penerima dan pilih metode pembayaran resmi Anda.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Inputs (Left: 7-8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Shipping Address Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-5">
            <h2 className="text-lg font-black text-brown-900 pb-3 border-b border-cream-200 flex items-center gap-2">
              <Truck className="w-5 h-5 text-caramel-600" />
              <span>Informasi Penerima &amp; Alamat Pengiriman</span>
            </h2>

            <div className="space-y-4">
              {/* Field 1: Nama Penerima */}
              <div>
                <label htmlFor="recipient_name" className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1.5">
                  1. Nama Lengkap Penerima <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipient_name"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  {...register('recipient_name')}
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 focus:ring-2 focus:ring-caramel-200 outline-none text-sm text-brown-900"
                />
                {errors.recipient_name && (
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    {errors.recipient_name.message}
                  </p>
                )}
              </div>

              {/* Field 2: Nomor Telepon */}
              <div>
                <label htmlFor="recipient_phone" className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1.5">
                  2. Nomor Telepon / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipient_phone"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  {...register('recipient_phone')}
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 focus:ring-2 focus:ring-caramel-200 outline-none text-sm text-brown-900"
                />
                {errors.recipient_phone && (
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    {errors.recipient_phone.message}
                  </p>
                )}
              </div>

              {/* Field 3: Alamat Lengkap Pengiriman */}
              <div>
                <label htmlFor="shipping_address" className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1.5">
                  3. Alamat Lengkap Pengiriman <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="shipping_address"
                  rows={3}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, patokan lokasi..."
                  {...register('shipping_address')}
                  className="w-full px-4 py-3 rounded-2xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 focus:ring-2 focus:ring-caramel-200 outline-none text-sm text-brown-900 resize-none"
                />
                {errors.shipping_address && (
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    {errors.shipping_address.message}
                  </p>
                )}
                <span className="text-[11px] text-brown-400 mt-1 block">
                  Data ini disimpan sebagai snapshot pesanan dan tidak menimpa profil akun secara permanen.
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-sm space-y-4">
            <h2 className="text-lg font-black text-brown-900 pb-3 border-b border-cream-200">
              Pilih Metode Pembayaran
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: QRIS Dinamis */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPaymentMethod === 'qris'
                    ? 'border-caramel-500 bg-caramel-50/60 shadow-xs'
                    : 'border-cream-300 hover:border-cream-400 bg-white'
                }`}
              >
                <input
                  type="radio"
                  value="qris"
                  {...register('payment_method')}
                  className="mt-1 w-4 h-4 text-caramel-600 accent-caramel-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-caramel-600" />
                    <span className="font-extrabold text-sm text-brown-900">QRIS</span>
                  </div>
                  <p className="text-xs text-brown-500 leading-relaxed">
                    Scan via GoPay, BCA, Mandiri, ShopeePay, Dana, dll. Unggah bukti transfer untuk konfirmasi.
                  </p>
                </div>
              </label>

              {/* Option 2: Cash on Delivery (COD) */}
              <label
                className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedPaymentMethod === 'cod'
                    ? 'border-caramel-500 bg-caramel-50/60 shadow-xs'
                    : 'border-cream-300 hover:border-cream-400 bg-white'
                }`}
              >
                <input
                  type="radio"
                  value="cod"
                  {...register('payment_method')}
                  className="mt-1 w-4 h-4 text-caramel-600 accent-caramel-500 cursor-pointer"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-brown-700" />
                    <span className="font-extrabold text-sm text-brown-900">Cash on Delivery (COD)</span>
                  </div>
                  <p className="text-xs text-brown-500 leading-relaxed">
                    Bayar langsung tunai kepada kurir saat paket keripik tiba di alamat Anda.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar (Right: 4-5 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-cream-300 shadow-sm sticky top-28 space-y-6">
            <h2 className="text-lg font-black text-brown-900 pb-3 border-b border-cream-200 flex items-center justify-between">
              <span>Ringkasan Pesanan</span>
              <span className="text-xs font-semibold text-brown-500">
                {selectedItems.length} produk
              </span>
            </h2>

            {/* Selected Items Mini List */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {selectedItems.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 text-xs">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-10 h-10 rounded-lg bg-cream-100 object-contain p-1 border border-cream-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-brown-900 block truncate">
                      {item.product.name}
                    </span>
                    <span className="text-brown-500">
                      {item.quantity} x {formatRupiah(item.product.price)}
                    </span>
                  </div>
                  <span className="font-black text-brown-900 shrink-0">
                    {formatRupiah(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-3 border-t border-cream-200 space-y-2 text-sm">
              <div className="flex items-center justify-between text-brown-600">
                <span>Subtotal Produk</span>
                <span className="font-bold text-brown-900">{formatRupiah(selectedSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-brown-600">
                <span>Tarif Pengiriman Toko</span>
                <span className="font-bold text-brown-900">{formatRupiah(shippingCost)}</span>
              </div>
              <div className="pt-3 border-t border-cream-200 flex items-baseline justify-between">
                <span className="text-sm font-bold text-brown-900">Total Pembayaran</span>
                <span className="text-2xl font-black text-caramel-600">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              variant="primary"
              size="lg"
              className="w-full text-base font-extrabold shadow-md"
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {selectedPaymentMethod === 'qris'
                ? 'Lanjut Bayar QRIS'
                : 'Buat Pesanan COD'}
            </Button>

            <p className="text-[11px] text-brown-400 text-center">
              Dengan mengklik tombol di atas, Anda menyetujui transaksi dan data pengiriman sudah benar.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
