// ─── Product ────────────────────────────────────────────────────────────────
export interface Product {
  id: string
  name: string
  brand: string
  variant: string
  price: number
  mrp: number
  image: string
  category: Category
  inStock: boolean
  deliveryMins: number
  tags: string[]
}

// ─── Category ────────────────────────────────────────────────────────────────
export type Category =
  | "dairy"
  | "grocery"
  | "snacks"
  | "beverages"
  | "pharmacy"
  | "bakery"
  | "fruits-vegetables"
  | "household"
  | "personal-care"

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product
  quantity: number
}

// ─── Order ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string
  items: CartItem[]
  total: number
  status: "delivered" | "cancelled" | "processing"
  placedAt: string
  deliveredAt?: string
}

// ─── AI Reminder Card ────────────────────────────────────────────────────────
export type ReminderType = "low_stock" | "seasonal" | "routine" | "area_signal" | "weather"

export interface ReminderCard {
  id: string
  type: ReminderType
  title: string
  subtitle: string
  urgency: "high" | "medium" | "low"
  product?: Product
  ctaLabel: string
  ctaProducts?: Product[]
  icon: string
  daysLeft?: number
}

// ─── Running Low Item ────────────────────────────────────────────────────────
export interface RunningLowItem {
  product: Product
  daysLeft: number
  unitsRemaining: number
  confidence: "high" | "medium" | "low"
}

// ─── Routine ─────────────────────────────────────────────────────────────────
export interface Routine {
  id: string
  label: string          // "Monday morning"
  dayOfWeek: string
  timeOfDay: string
  products: Product[]
  totalPrice: number
  confidence: number     // 0-1
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  phone: string
  location: string
  address: string
  householdSize: number
  monthlySpend: number
  totalOrders: number
  memberSince: string
  insights: ShoppingInsight[]
}

// ─── Shopping DNA Insight ─────────────────────────────────────────────────────
export interface ShoppingInsight {
  id: string
  icon: string
  label: string
  value: string
}
