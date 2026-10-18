import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Copy,
  Truck,
  ChevronRight,
  HelpCircle,
  UploadCloud,
  Download,
  Maximize2,
  FileCheck,
  RotateCcw,
  Eye,
} from 'lucide-react'
import { formatRupiah, formatDate } from '../lib/utils'
import { Button } from '../components/common/Button'
import { StatusBadge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { QRISAdapter } from '../lib/payment/qrisAdapter'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Order, PaymentRecord } from '../types'

export const Payment: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const [searchParams] = useSearchParams()
  const orderNumberParam = searchParams.get('orderNumber') || ''
  const methodParam = searchParams.get('method') || 'qris'

  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<PaymentRecord | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [copied, setCopied] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Upload proof states
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isReuploading, setIsReuploading] = useState(false)

  // Zoom modal state for QR & Proof
  const [isQrZoomOpen, setIsQrZoomOpen] = useState(false)
  const [isProofZoomOpen, setIsProofZoomOpen] = useState(false)

  // Fetch Order and Payment details
  const fetchOrderDetails = async () => {
    if (!orderId) return

    let foundOrder: Order | null = null
    let foundPayment: PaymentRecord | null = null

    if (isSupabaseConfigured()) {
      try {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .single()

        if (!orderErr && orderData) {
          foundOrder = orderData
        }

        const { data: paymentData } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', orderId)
          .single()

        if (paymentData) {
          foundPayment = paymentData
        }
      } catch (err) {
        console.warn('Error fetching order from live DB, checking local store:', err)
      }
    }

    // Local fallback check if live DB not used or order not found
    if (!foundOrder) {
      try {
        const localOrders: Order[] = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        )
        const found = localOrders.find(
          (o: any) => o.id === orderId || o.order_number === orderNumberParam
        )
        if (found) {
          foundOrder = found
          if (found.payment) {
            foundPayment = found.payment
          }
        }
      } catch {
        // Ignore
      }
    }

    if (foundOrder) setOrder(foundOrder)
    if (foundPayment) setPayment(foundPayment)
  }

  useEffect(() => {
    fetchOrderDetails()
  }, [orderId])

  // Server-side status check
  const handleCheckStatus = async () => {
    if (!orderId) return
    setCheckingStatus(true)
    setStatusMessage(null)

    const result = await QRISAdapter.checkPaymentStatus(orderId)

    if (result.isPaid) {
      setStatusMessage('Pembayaran telah berhasil diverifikasi oleh admin! Pesanan Anda sedang diproses.')
      if (order) {
        setOrder({ ...order, payment_status: 'paid', status: 'processing' })
      }
      if (payment) {
        setPayment({ ...payment, status: 'paid' })
      }
    } else {
      setStatusMessage(result.message)
      await fetchOrderDetails()
    }

    setCheckingStatus(false)
  }

  const handleCopyOrderNumber = () => {
    const num = order?.order_number || orderNumberParam
    if (num) {
      navigator.clipboard.writeText(num)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle file selection with max 1MB validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // 1 MB limit = 1,048,576 bytes
    const MAX_SIZE = 1024 * 1024
    if (file.size > MAX_SIZE) {
      setFileError('Ukuran file melebihi 1 MB. Harap kompres atau gunakan screenshot yang lebih kecil.')
      setSelectedFile(null)
      setFilePreview(null)
      e.target.value = ''
      return
    }

    // Validate image format
    if (!file.type.startsWith('image/')) {
      setFileError('Format file tidak didukung. Harap pilih gambar (JPG, PNG, atau WEBP).')
      setSelectedFile(null)
      setFilePreview(null)
      e.target.value = ''
      return
    }

    setSelectedFile(file)
    const preview = URL.createObjectURL(file)
    setFilePreview(preview)
  }

  // Handle proof submission
  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderId || !selectedFile) {
      setFileError('Pilih file bukti transfer terlebih dahulu.')
      return
    }

    setIsUploading(true)
    setFileError(null)

    try {
      // Convert file to Base64 data URL for cross-environment reliability
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string
        const result = await QRISAdapter.uploadPaymentProof(orderId, base64Data)

        if (result.success) {
          setStatusMessage(result.message)
          setIsReuploading(false)
          setSelectedFile(null)
          setFilePreview(null)

          // Update local payment state immediately
          setPayment((prev) => ({
            ...(prev || {
              id: 'pay-' + orderId,
              order_id: orderId,
              payment_method: 'qris',
              amount: order?.total_amount || 0,
              status: 'pending',
              gateway_reference: `QRIS-STATIC-${order?.order_number || orderNumberParam}`,
              created_at: new Date().toISOString(),
            }),
            status: 'pending',
            payment_details: {
              ...(prev?.payment_details || {}),
              proof_url: base64Data,
              proof_uploaded_at: new Date().toISOString(),
            },
          }))
        } else {
          setFileError(result.message)
        }
        setIsUploading(false)
      }
      reader.onerror = () => {
        setFileError('Gagal membaca file gambar. Silakan coba kembali.')
        setIsUploading(false)
      }
      reader.readAsDataURL(selectedFile)
    } catch (err) {
      console.error('Error handling upload proof:', err)
      setFileError('Terjadi kesalahan saat mengunggah bukti transfer.')
      setIsUploading(false)
    }
  }

  const isPaid = order?.payment_status === 'paid' || payment?.status === 'paid'
  const isCOD = (order?.payment_method || methodParam) === 'cod'
  const orderNumber = order?.order_number || orderNumberParam
  const totalAmount = order?.total_amount || 0
  const proofUrl = payment?.payment_details?.proof_url
  const proofUploadedAt = payment?.payment_details?.proof_uploaded_at
  const hasProof = Boolean(proofUrl)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-brown-500 mb-6">
        <Link to="/" className="hover:text-caramel-600">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/cart" className="hover:text-caramel-600">
          Keranjang
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-brown-900">Pembayaran</span>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-8 lg:p-10 border border-cream-300 shadow-lg space-y-6 sm:space-y-8">
        {/* Header Status Banner */}
        <div className="text-center space-y-2 pb-6 border-b border-cream-200">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-cream-100 mb-2">
            {isPaid ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-600 animate-bounce" />
            ) : isCOD ? (
              <Truck className="w-12 h-12 text-brown-700" />
            ) : hasProof ? (
              <FileCheck className="w-12 h-12 text-amber-600 animate-pulse" />
            ) : (
              <Clock className="w-12 h-12 text-caramel-600 animate-pulse" />
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-brown-900">
            {isPaid
              ? 'Pembayaran Berhasil Diverifikasi!'
              : isCOD
              ? 'Pesanan COD Berhasil Dibuat'
              : hasProof
              ? 'Menunggu Konfirmasi Admin'
              : 'Menunggu Pembayaran QRIS'}
          </h1>

          <p className="text-sm text-brown-600 max-w-md mx-auto">
            {isPaid
              ? 'Terima kasih! Pembayaran Anda telah terverifikasi lunas. Pesanan keripik sedang disiapkan dan akan segera dikirim.'
              : isCOD
              ? 'Silakan siapkan uang pas saat kurir mengantarkan pesanan keripik Anda.'
              : hasProof
              ? 'Bukti transfer Anda telah diterima dan sedang menunggu pemeriksaan oleh admin toko. Silakan periksa status secara berkala.'
              : 'Pindai barcode QRIS di bawah, bayar sesuai nominal tagihan, dan unggah bukti transfer untuk konfirmasi.'}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <StatusBadge
              status={
                isPaid
                  ? 'paid'
                  : isCOD
                  ? 'unpaid'
                  : hasProof
                  ? 'pending'
                  : 'pending'
              }
              type="payment"
            />
            <StatusBadge status={order?.status || 'confirmed'} type="order" />
          </div>
        </div>

        {/* Order Details Summary Box */}
        <div className="bg-cream-50 rounded-2xl p-5 border border-cream-200 space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-brown-500 font-semibold">Nomor Pesanan</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-brown-900">{orderNumber}</span>
              <button
                onClick={handleCopyOrderNumber}
                className="p-1 text-brown-400 hover:text-caramel-600 rounded transition-colors"
                title="Salin nomor pesanan"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {copied && <span className="text-[10px] text-emerald-600 font-bold">Disalin!</span>}
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-brown-500 font-semibold">Total Tagihan</span>
              <span className="text-xl font-black text-caramel-600">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          )}

          {order?.recipient_name && (
            <div className="flex items-start justify-between text-xs pt-2 border-t border-cream-200 text-brown-600">
              <span className="font-semibold text-brown-500">Penerima &amp; Alamat</span>
              <span className="text-right max-w-xs font-medium">
                {order.recipient_name} ({order.recipient_phone})<br />
                {order.shipping_address}
              </span>
            </div>
          )}
        </div>

        {/* QRIS Display Section */}
        {!isCOD && !isPaid && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-cream-100/60 rounded-3xl border border-cream-300">
              {/* Static QRIS Image */}
              <div className="relative group bg-white p-4 rounded-2xl shadow-md border border-cream-300">
                <img
                  src={QRISAdapter.STATIC_QR_URL}
                  alt="QRIS Resmi Calls Kitchen"
                  className="w-56 h-auto sm:w-64 object-contain rounded-lg cursor-pointer transition-transform hover:scale-102"
                  onClick={() => setIsQrZoomOpen(true)}
                  title="Klik untuk memperbesar QRIS"
                />
                <button
                  onClick={() => setIsQrZoomOpen(true)}
                  className="absolute bottom-6 right-6 p-2 bg-brown-900/80 hover:bg-brown-900 text-white rounded-xl shadow-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                  title="Perbesar gambar QRIS"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Perbesar</span>
                </button>
              </div>

              {/* Action Buttons: Download & Info */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <a
                  href={QRISAdapter.STATIC_QR_URL}
                  download="QRIS-Calls-Kitchen.jpeg"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-brown-800 hover:text-caramel-600 text-xs font-bold rounded-xl border border-cream-300 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-caramel-600" />
                  <span>Unduh Kode QRIS</span>
                </a>
                <span className="inline-block text-xs font-bold text-brown-700 bg-cream-200/60 px-3 py-1.5 rounded-xl border border-cream-300">
                  QRIS Calls Kitchen
                </span>
              </div>

              <p className="mt-2 text-[11px] text-brown-500 text-center max-w-sm">
                Buka e-wallet atau mobile banking Anda, scan QRIS di atas, dan masukkan nominal persis <strong>{formatRupiah(totalAmount)}</strong>.
              </p>
            </div>

            {/* Step-by-Step Payment Instructions */}
            <div className="space-y-3 bg-white p-5 rounded-2xl border border-cream-200">
              <h3 className="text-sm font-bold text-brown-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-caramel-600" />
                <span>Petunjuk Pembayaran QRIS</span>
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-brown-600 leading-relaxed">
                <li>Buka aplikasi mobile banking atau e-wallet Anda (BCA, Mandiri, BRI, GoPay, ShopeePay, Dana, dll).</li>
                <li>Pilih menu <strong>Pindai / Scan QRIS</strong> (atau upload gambar QR yang telah diunduh).</li>
                <li>Ketik nominal pembayaran manual sejumlah <strong>{totalAmount > 0 ? formatRupiah(totalAmount) : 'Sesuai Tagihan'}</strong>.</li>
                <li>Pastikan nama merchant tertera <strong>Calls Kitchen</strong>.</li>
                <li>Selesaikan transaksi dengan memasukkan PIN aplikasi Anda.</li>
                <li>Ambil <strong>screenshot / foto struk bukti pembayaran</strong>, lalu unggah pada form di bawah ini.</li>
              </ol>
            </div>

            {/* Upload Proof Section */}
            {hasProof && !isReuploading ? (
              <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <FileCheck className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Bukti Transfer Telah Diunggah</span>
                  </div>
                  <button
                    onClick={() => setIsReuploading(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-caramel-700 hover:text-caramel-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Ganti / Unggah Ulang</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs">
                  <div
                    onClick={() => setIsProofZoomOpen(true)}
                    className="relative group w-20 h-20 sm:w-16 sm:h-16 shrink-0 rounded-xl overflow-hidden border border-cream-300 cursor-pointer bg-black/5 mx-auto sm:mx-0"
                    title="Klik untuk memperbesar bukti transfer"
                  >
                    <img
                      src={proofUrl}
                      alt="Bukti Transfer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                    <p className="font-extrabold text-sm text-brown-900 truncate">Bukti Pembayaran Pelanggan</p>
                    <p className="text-[11px] text-brown-500">
                      Diunggah: {proofUploadedAt ? formatDate(proofUploadedAt) : 'Baru saja'}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsProofZoomOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-caramel-50 hover:bg-caramel-100 text-caramel-800 hover:text-caramel-900 rounded-xl text-xs font-bold transition-all border border-caramel-200 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-caramel-600" />
                        <span>Lihat Bukti Resolusi Penuh</span>
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Status Anda saat ini: <strong>Menunggu Konfirmasi Admin</strong>. Admin kami akan memeriksa mutasi rekening dan memproses pesanan Anda sesegera mungkin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUploadProof} className="space-y-4 bg-cream-50/80 p-5 rounded-2xl border border-cream-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-brown-900 flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-caramel-600" />
                    <span>Unggah Bukti Transfer Pembayaran</span>
                  </h3>
                  {isReuploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsReuploading(false)
                        setSelectedFile(null)
                        setFilePreview(null)
                      }}
                      className="text-xs text-brown-500 hover:text-brown-800 font-semibold"
                    >
                      Batal
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="proof-upload"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-cream-300 rounded-2xl bg-white hover:bg-cream-50 cursor-pointer transition-colors"
                  >
                    {filePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={filePreview}
                          alt="Pratinjau Bukti"
                          className="w-24 h-24 object-contain rounded-lg border border-cream-200"
                        />
                        <span className="text-xs font-bold text-brown-800 truncate max-w-xs">
                          {selectedFile?.name}
                        </span>
                        <span className="text-[10px] text-brown-500">
                          {((selectedFile?.size || 0) / 1024).toFixed(1)} KB (Klik untuk ganti)
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center gap-1.5">
                        <UploadCloud className="w-8 h-8 text-caramel-500" />
                        <span className="text-xs font-bold text-brown-900">
                          Klik di sini untuk memilih foto struk / screenshot bukti transfer
                        </span>
                        <span className="text-[11px] text-brown-500">
                          Format JPG, PNG, atau WEBP. Maksimal ukuran <strong>1 MB</strong>.
                        </span>
                      </div>
                    )}
                    <input
                      id="proof-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {fileError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  isLoading={isUploading}
                  variant="primary"
                  size="md"
                  className="w-full font-bold shadow-sm"
                  leftIcon={<UploadCloud className="w-4 h-4" />}
                >
                  {isUploading ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}
                </Button>
              </form>
            )}

            {/* Check Status Action */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleCheckStatus}
                isLoading={checkingStatus}
                variant="outline"
                size="md"
                className="w-full text-xs font-bold"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Segarkan &amp; Periksa Status Pembayaran
              </Button>

              {statusMessage && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs font-medium text-center border border-blue-200">
                  {statusMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COD Section */}
        {isCOD && !isPaid && (
          <div className="space-y-6">
            <div className="p-6 bg-brown-50 rounded-2xl border border-brown-200 space-y-3">
              <h3 className="font-black text-brown-900 text-sm flex items-center gap-2">
                <Truck className="w-5 h-5 text-brown-700" />
                <span>Ketentuan Cash on Delivery (COD)</span>
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-brown-700 leading-relaxed">
                <li>Pesanan telah dicatat dengan status pembayaran <strong>Belum Dibayar</strong>.</li>
                <li>Mohon siapkan uang tunai pas sebesar <strong>{formatRupiah(totalAmount)}</strong> saat kurir tiba.</li>
                <li>Kurir akan menyerahkan paket keripik dan menerima uang tunai Anda.</li>
                <li>Setelah uang diterima, admin Calls Kitchen akan mencatat pembayaran sebagai <strong>Lunas</strong>.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/profile"
                className="flex-1 text-center py-3 px-4 rounded-xl font-bold text-sm bg-caramel-500 text-white shadow-sm hover:bg-caramel-600 transition-colors"
              >
                Lihat Riwayat Pesanan Saya
              </Link>
              <Link
                to="/catalog"
                className="flex-1 text-center py-3 px-4 rounded-xl font-bold text-sm bg-cream-200 text-brown-800 hover:bg-cream-300 transition-colors"
              >
                Kembali ke Katalog
              </Link>
            </div>
          </div>
        )}

        {/* Paid Success Actions */}
        {isPaid && (
          <div className="space-y-4 text-center">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/profile"
                className="flex-1 text-center py-3.5 px-4 rounded-xl font-bold text-sm bg-caramel-500 text-white shadow-md hover:bg-caramel-600 transition-colors"
              >
                Lihat Status di Riwayat Pesanan
              </Link>
              <Link
                to="/catalog"
                className="flex-1 text-center py-3.5 px-4 rounded-xl font-bold text-sm bg-cream-200 text-brown-800 hover:bg-cream-300 transition-colors"
              >
                Belanja Camilan Lainnya
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* QR Zoom Modal */}
      <Modal
        isOpen={isQrZoomOpen}
        onClose={() => setIsQrZoomOpen(false)}
        title="QRIS Resmi Calls Kitchen"
        maxWidth="md"
      >
        <div className="flex flex-col items-center space-y-4 p-2">
          <div className="bg-white p-4 rounded-2xl border border-cream-300 shadow-sm">
            <img
              src={QRISAdapter.STATIC_QR_URL}
              alt="QRIS Calls Kitchen Zoom"
              className="w-full max-w-sm h-auto object-contain rounded-lg"
            />
          </div>
          <p className="text-xs text-center text-brown-600">
            Pastikan nama merchant tertera <strong>Calls Kitchen</strong> dan nominal pembayaran diisi sejumlah <strong>{formatRupiah(totalAmount)}</strong>.
          </p>
          <a
            href={QRISAdapter.STATIC_QR_URL}
            download="QRIS-Calls-Kitchen.jpeg"
            className="w-full py-2.5 px-4 bg-caramel-500 hover:bg-caramel-600 text-white font-bold rounded-xl text-xs text-center shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Gambar QRIS</span>
          </a>
        </div>
      </Modal>

      {/* Proof Zoom Modal */}
      <Modal
        isOpen={isProofZoomOpen}
        onClose={() => setIsProofZoomOpen(false)}
        title="Bukti Transfer Pembayaran"
        maxWidth="lg"
      >
        <div className="space-y-4 p-2">
          {proofUrl && (
            <div className="bg-black/5 p-2 rounded-2xl border border-cream-200 flex items-center justify-center">
              <img
                src={proofUrl}
                alt="Bukti Transfer Zoom"
                className="max-h-[65vh] w-auto object-contain rounded-lg"
              />
            </div>
          )}
          <div className="text-xs text-brown-600 flex items-center justify-between">
            <span>Nomor Pesanan: <strong>{orderNumber}</strong></span>
            <span>Total Tagihan: <strong>{formatRupiah(totalAmount)}</strong></span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
