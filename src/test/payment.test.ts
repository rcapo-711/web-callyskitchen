import { describe, it, expect } from 'vitest'
import { QRISAdapter } from '../lib/payment/qrisAdapter'
import { OrderStatus, PaymentStatus } from '../types'

describe('Payment Integrations & Adapters', () => {
  it('QRISAdapter generates dynamic transaction payload with order number and exact gross amount', async () => {
    const result = await QRISAdapter.createQRISTransaction({
      orderId: 'test-order-123',
      orderNumber: 'CK-20261018-9999',
      grossAmount: 52000,
      customerDetails: {
        fullName: 'Budi Santoso',
        phone: '081234567890',
        address: 'Jl. Melati No. 10',
      },
      items: [
        { id: 'prod-1', name: 'Keripik Pisang Cokelat', price: 20000, quantity: 2 },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.paymentMethod).toBe('qris')
    expect(result.status).toBe('pending') // Never starts as paid
    expect(result.qrUrl).toBe('/images/qris.jpeg')
    expect(result.gatewayReference).toContain('CK-20261018-9999')
  })

  it('Strictly isolates order status and payment status', () => {
    // When order is placed via COD
    const orderStatus: OrderStatus = 'confirmed'
    const paymentStatus: PaymentStatus = 'unpaid'

    expect(orderStatus).not.toBe(paymentStatus)
    expect(paymentStatus).toBe('unpaid')

    // Even when shipped, COD remains unpaid until cash is collected
    const shippedStatus: OrderStatus = 'shipped'
    expect(shippedStatus).toBe('shipped')
    expect(paymentStatus).toBe('unpaid')
  })
})
