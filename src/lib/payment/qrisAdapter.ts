import { CreatePaymentParams, PaymentTransactionResult, PaymentStatusCheckResult } from './types'
import { supabase, isSupabaseConfigured } from '../supabase'
import { PaymentStatus } from '../../types'

/**
 * QRIS Payment Adapter (Static QRIS with Manual Verification)
 * 
 * Aturan Bisnis Calls Kitchen:
 * 1. Menggunakan QRIS Statis resmi milik pemilik toko (/images/qris.jpeg).
 * 2. Nominal tagihan dimasukkan manual oleh pembeli saat scan.
 * 3. Pembeli mengunggah bukti transfer (maks 1MB) melalui form pembayaran.
 * 4. Status pesanan berubah menjadi 'menunggu konfirmasi admin'.
 * 5. Admin memverifikasi dana masuk di rekening dan menyetujui/menolak di dashboard admin.
 */
export class QRISAdapter {
  public static readonly STATIC_QR_URL = '/images/qris.jpeg'

  /**
   * Request QRIS payment metadata for an order
   */
  public static async createQRISTransaction(
    params: CreatePaymentParams
  ): Promise<PaymentTransactionResult> {
    return {
      success: true,
      paymentMethod: 'qris',
      status: 'pending',
      gatewayReference: `QRIS-STATIC-${params.orderNumber}`,
      qrUrl: this.STATIC_QR_URL,
      message: 'Silakan pindai kode QRIS dan transfer sesuai total nominal tagihan.',
      isSandbox: false,
      providerName: 'QRIS Calls Kitchen',
    }
  }

  /**
   * Upload and record proof of payment by customer
   */
  public static async uploadPaymentProof(
    orderId: string,
    proofUrl: string
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString()

    try {
      if (isSupabaseConfigured()) {
        // Fetch current payment details
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('payment_details')
          .eq('order_id', orderId)
          .single()

        const currentDetails = (existingPayment?.payment_details as Record<string, any>) || {}

        // 1. Update payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'pending' as PaymentStatus,
            payment_details: {
              ...currentDetails,
              proof_url: proofUrl,
              proof_uploaded_at: now,
            },
            updated_at: now,
          })
          .eq('order_id', orderId)

        if (paymentError) throw paymentError

        // 2. Insert audit log
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          previous_status: null,
          new_status: 'confirmed',
          notes: 'Pelanggan telah mengunggah bukti transfer pembayaran QRIS.',
        })
      }

      // Local fallback sync
      try {
        const localOrders = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        )
        const updatedOrders = localOrders.map((o: any) => {
          if (o.id === orderId) {
            return {
              ...o,
              payment: {
                ...(o.payment || {}),
                payment_details: {
                  ...(o.payment?.payment_details || {}),
                  proof_url: proofUrl,
                  proof_uploaded_at: now,
                },
              },
            }
          }
          return o
        })
        localStorage.setItem('calls_kitchen_local_orders', JSON.stringify(updatedOrders))
      } catch {
        // Ignore local storage error
      }

      return {
        success: true,
        message: 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.',
      }
    } catch (err) {
      console.error('Error uploading payment proof:', err)
      return {
        success: false,
        message: 'Gagal mengunggah bukti transfer: ' + (err as Error).message,
      }
    }
  }

  /**
   * Verify QRIS Payment by authorized admin
   */
  public static async verifyPaymentByAdmin(
    orderId: string,
    adminId: string,
    adminName: string
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString()

    try {
      if (isSupabaseConfigured()) {
        // 1. Update payment record to paid
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'paid' as PaymentStatus,
            verified_at: now,
            verified_by: adminId,
            updated_at: now,
          })
          .eq('order_id', orderId)

        if (paymentError) throw paymentError

        // 2. Update order status to processing
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid' as PaymentStatus,
            status: 'processing',
            updated_at: now,
          })
          .eq('id', orderId)

        if (orderError) throw orderError

        // 3. Insert audit log
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          previous_status: 'confirmed',
          new_status: 'processing',
          changed_by: adminId,
          notes: `Pembayaran QRIS telah diverifikasi lunas oleh admin ${adminName}.`,
        })
      }

      // Local storage sync
      try {
        const localOrders = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        )
        const updatedOrders = localOrders.map((o: any) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'processing',
              payment_status: 'paid',
              updated_at: now,
              payment: {
                ...(o.payment || {}),
                status: 'paid',
                verified_at: now,
                verified_by: adminId,
              },
            }
          }
          return o
        })
        localStorage.setItem('calls_kitchen_local_orders', JSON.stringify(updatedOrders))
      } catch {
        // Ignore local error
      }

      return {
        success: true,
        message: `Pembayaran QRIS berhasil diverifikasi oleh ${adminName}. Pesanan kini diproses.`,
      }
    } catch (err) {
      console.error('Error verifying QRIS payment:', err)
      return {
        success: false,
        message: 'Gagal memverifikasi pembayaran: ' + (err as Error).message,
      }
    }
  }

  /**
   * Reject QRIS Payment by authorized admin
   */
  public static async rejectPaymentByAdmin(
    orderId: string,
    adminId: string,
    adminName: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const now = new Date().toISOString()

    try {
      if (isSupabaseConfigured()) {
        // Fetch current details
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('payment_details')
          .eq('order_id', orderId)
          .single()

        const currentDetails = (existingPayment?.payment_details as Record<string, any>) || {}

        // 1. Update payment to failed
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'failed' as PaymentStatus,
            payment_details: {
              ...currentDetails,
              rejection_reason: reason,
              rejected_by: adminName,
              rejected_at: now,
            },
            updated_at: now,
          })
          .eq('order_id', orderId)

        if (paymentError) throw paymentError

        // 2. Update order to cancelled
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            payment_status: 'failed' as PaymentStatus,
            status: 'cancelled',
            cancellation_reason: reason,
            updated_at: now,
          })
          .eq('id', orderId)

        if (orderError) throw orderError

        // 3. Insert audit log
        await supabase.from('order_status_history').insert({
          order_id: orderId,
          previous_status: 'confirmed',
          new_status: 'cancelled',
          changed_by: adminId,
          notes: `Pembayaran QRIS ditolak oleh admin ${adminName}. Alasan: ${reason}`,
        })
      }

      // Local storage sync
      try {
        const localOrders = JSON.parse(
          localStorage.getItem('calls_kitchen_local_orders') || '[]'
        )
        const updatedOrders = localOrders.map((o: any) => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'cancelled',
              payment_status: 'failed',
              cancellation_reason: reason,
              updated_at: now,
              payment: {
                ...(o.payment || {}),
                status: 'failed',
                payment_details: {
                  ...(o.payment?.payment_details || {}),
                  rejection_reason: reason,
                },
              },
            }
          }
          return o
        })
        localStorage.setItem('calls_kitchen_local_orders', JSON.stringify(updatedOrders))
      } catch {
        // Ignore local error
      }

      return {
        success: true,
        message: 'Pembayaran QRIS telah ditolak.',
      }
    } catch (err) {
      console.error('Error rejecting QRIS payment:', err)
      return {
        success: false,
        message: 'Gagal menolak pembayaran: ' + (err as Error).message,
      }
    }
  }

  /**
   * Verify QRIS Payment status via server/database
   */
  public static async checkPaymentStatus(
    orderId: string,
    _gatewayReference?: string
  ): Promise<PaymentStatusCheckResult> {
    if (isSupabaseConfigured()) {
      try {
        const { data: paymentRecord } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', orderId)
          .single()

        if (paymentRecord) {
          const isPaid = paymentRecord.status === 'paid'
          const hasProof = Boolean(paymentRecord.payment_details?.proof_url)
          return {
            orderId,
            status: paymentRecord.status,
            isPaid,
            transactionTime: paymentRecord.created_at,
            settlementTime: paymentRecord.verified_at,
            message: isPaid
              ? 'Pembayaran telah terverifikasi lunas oleh admin.'
              : hasProof
              ? 'Bukti transfer diterima. Menunggu verifikasi admin.'
              : 'Menunggu transfer dan unggah bukti pembayaran.',
          }
        }
      } catch (err) {
        console.warn('Error reading payment record:', err)
      }
    }

    // Local storage check
    try {
      const localOrders = JSON.parse(
        localStorage.getItem('calls_kitchen_local_orders') || '[]'
      )
      const found = localOrders.find((o: any) => o.id === orderId)
      if (found) {
        const isPaid = found.payment_status === 'paid' || found.payment?.status === 'paid'
        const hasProof = Boolean(found.payment?.payment_details?.proof_url)
        return {
          orderId,
          status: found.payment_status || 'pending',
          isPaid,
          message: isPaid
            ? 'Pembayaran telah terverifikasi lunas oleh admin.'
            : hasProof
            ? 'Bukti transfer diterima. Menunggu verifikasi admin.'
            : 'Menunggu transfer dan unggah bukti pembayaran.',
        }
      }
    } catch {
      // Ignore
    }

    return {
      orderId,
      status: 'pending',
      isPaid: false,
      message: 'Menunggu transfer dan unggah bukti pembayaran.',
    }
  }
}
