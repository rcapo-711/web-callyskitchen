import React from 'react'
import { OrderStatus, PaymentStatus, PaymentMethod } from '../../types'
import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | PaymentMethod
  type?: 'order' | 'payment' | 'method'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'order', className }) => {
  let label = status as string
  let colorStyles = 'bg-cream-200 text-brown-800 border-brown-300'

  if (type === 'order') {
    switch (status as OrderStatus) {
      case 'confirmed':
        label = 'Dikonfirmasi'
        colorStyles = 'bg-blue-50 text-blue-700 border-blue-200'
        break
      case 'processing':
        label = 'Diproses'
        colorStyles = 'bg-amber-50 text-amber-700 border-amber-200'
        break
      case 'shipped':
        label = 'Dikirim'
        colorStyles = 'bg-purple-50 text-purple-700 border-purple-200'
        break
      case 'completed':
        label = 'Selesai'
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200'
        break
      case 'cancelled':
        label = 'Dibatalkan'
        colorStyles = 'bg-red-50 text-red-700 border-red-200'
        break
    }
  } else if (type === 'payment') {
    switch (status as PaymentStatus) {
      case 'paid':
        label = 'Lunas'
        colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200'
        break
      case 'pending':
        label = 'Menunggu Pembayaran'
        colorStyles = 'bg-amber-50 text-amber-700 border-amber-200'
        break
      case 'unpaid':
        label = 'Belum Dibayar (COD)'
        colorStyles = 'bg-orange-50 text-orange-700 border-orange-200'
        break
      case 'failed':
        label = 'Gagal'
        colorStyles = 'bg-red-50 text-red-700 border-red-200'
        break
      case 'expired':
        label = 'Kedaluwarsa'
        colorStyles = 'bg-gray-100 text-gray-700 border-gray-300'
        break
      case 'refunded':
        label = 'Dikembalikan'
        colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200'
        break
    }
  } else if (type === 'method') {
    switch (status as PaymentMethod) {
      case 'qris':
        label = 'QRIS'
        colorStyles = 'bg-caramel-50 text-caramel-700 border-caramel-200'
        break
      case 'cod':
        label = 'Cash on Delivery (COD)'
        colorStyles = 'bg-brown-50 text-brown-800 border-brown-200'
        break
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        colorStyles,
        className
      )}
    >
      {label}
    </span>
  )
}
