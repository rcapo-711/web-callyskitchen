export type UserRole = 'customer' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  address: string | null
  created_at?: string
  updated_at?: string
}

export interface Category {
  id: string
  slug: string
  name: string
  description?: string
  created_at?: string
}

export interface Product {
  id: string
  category_id: string
  category?: Category
  name: string
  slug: string
  description: string
  price: number
  stock: number
  image_url: string
  is_active: boolean
  is_archived: boolean
  rating?: number
  sold_count?: number
  created_at?: string
  updated_at?: string
}

export interface CartItem {
  id: string
  product_id: string
  product: Product
  quantity: number
  selected: boolean
}

export type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'
export type PaymentMethod = 'qris' | 'cod'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  variant_name?: string
  price: number
  quantity: number
  subtotal: number
  created_at?: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod
  subtotal: number
  shipping_cost: number
  total_amount: number
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  cancellation_reason?: string | null
  created_at: string
  updated_at?: string
  order_items?: OrderItem[]
  payment?: PaymentRecord
}

export interface PaymentRecord {
  id: string
  order_id: string
  payment_method: PaymentMethod
  amount: number
  status: PaymentStatus
  gateway_reference: string | null
  payment_details: {
    qr_string?: string
    qr_url?: string
    expiry_time?: string
    provider?: string
    notes?: string
    received_by_admin?: string
    received_at?: string
    proof_url?: string
    proof_uploaded_at?: string
    rejection_reason?: string
  } | null
  created_at: string
  updated_at?: string
  verified_at?: string | null
  verified_by?: string | null
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  previous_status: OrderStatus | null
  new_status: OrderStatus
  changed_by: string | null
  notes: string | null
  created_at: string
}

export interface StoreSettings {
  store_name: string
  phone: string
  whatsapp: string
  address: string
  default_shipping_cost: number
  is_store_open: boolean
}

export interface CheckoutFormData {
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  payment_method: PaymentMethod
}
