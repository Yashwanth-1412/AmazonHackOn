/**
 * API client — typed fetchers for the FastAPI backend.
 * All functions are safe to call from Server Components.
 * Set NEXT_PUBLIC_API_URL in .env for cloud deployments.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const DEFAULT_USER = process.env.NEXT_PUBLIC_USER_ID ?? "u001"

// ── API shapes (what the backend returns) ────────────────────────────────────

export interface APIProduct {
  id: string
  name: string
  brand: string
  variant: string
  price: number
  mrp: number
  category: string
  logo_url: string
  delivery_mins: number
  cycle_days: number
  tags: string[]
  in_stock: boolean
  rating?: number
}

export interface APIReminder {
  id: string
  type: string
  title: string
  subtitle: string
  urgency: "high" | "medium" | "low"
  product_id?: string
  product_name?: string
  days_left?: number
  cta_label: string
  priority: number
  status: string
  confidence: string
}

export interface APIRunningLowItem {
  product: APIProduct
  days_left: number
  confidence: string
  avg_gap_days: number
}

export interface APIHomeData {
  user: {
    id: string
    name: string
    location: string
    household_type: string
    household_size: number
  }
  reminders: APIReminder[]
  running_low: APIRunningLowItem[]
  frequently_bought: APIProduct[]
}

export interface APIOrder {
  order_id: string
  placed_at: string
  delivered_at: string
  total: number
  status: string
  items: { product_id: string; name: string; quantity: number; price: number }[]
}

export interface APIRoutine {
  id: string
  label: string
  day_of_week: string
  time_of_day: string
  confidence: number
  order_count: number
  products: APIProduct[]
  total_price: number
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    next: { revalidate: 30 }, // cache 30s in Next.js
  })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function getHomeData(userId = DEFAULT_USER): Promise<APIHomeData> {
  return apiFetch(`/api/home/${userId}`)
}

export async function getProducts(opts?: {
  category?: string
  search?: string
  limit?: number
}): Promise<{ products: APIProduct[]; total: number }> {
  const params = new URLSearchParams()
  if (opts?.category) params.set("category", opts.category)
  if (opts?.search)   params.set("search", opts.search)
  if (opts?.limit)    params.set("limit", String(opts.limit))
  return apiFetch(`/api/products?${params}`)
}

export async function getOrders(
  userId = DEFAULT_USER,
  limit = 20,
): Promise<{ orders: APIOrder[]; total: number }> {
  return apiFetch(`/api/orders/${userId}?limit=${limit}`)
}

export async function getRoutines(
  userId = DEFAULT_USER,
): Promise<{ routines: APIRoutine[] }> {
  return apiFetch(`/api/orders/${userId}/routines`)
}

// ── Converter — API product → frontend Product shape ─────────────────────────

import type { Product, Category } from "@/types"

export function toProduct(p: APIProduct): Product {
  return {
    id:           p.id,
    name:         p.name,
    brand:        p.brand,
    variant:      p.variant,
    price:        p.price,
    mrp:          p.mrp ?? p.price,
    image:        p.logo_url || categoryEmoji(p.category),
    category:     p.category as Category,
    inStock:      p.in_stock,
    deliveryMins: p.delivery_mins,
    tags:         p.tags ?? [],
  }
}

function categoryEmoji(cat: string): string {
  const map: Record<string, string> = {
    dairy:               "🥛",
    bakery:              "🍞",
    grocery:             "🛒",
    snacks:              "🍿",
    beverages:           "☕",
    "fruits-vegetables": "🥦",
    household:           "🧹",
    "personal-care":     "🧴",
    pharmacy:            "💊",
  }
  return map[cat] ?? "📦"
}
