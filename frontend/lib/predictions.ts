import type { Order, Product } from "@/types"

export interface PredictedItem {
  product: Product
  /** Estimated days until running out (can be negative = already overdue) */
  daysLeft: number
  /** Average reorder cycle in days */
  cycledays: number
  /** Confidence based on how many times it was ordered */
  confidence: "high" | "medium" | "low"
  /** How many the user typically orders */
  typicalQuantity: number
  /** Last ordered date */
  lastOrderedAt: string
}

/**
 * Analyzes order history to predict which products are running low.
 * Returns items where the user is within 2 days of their next predicted order.
 */
export function predictRunningLow(orders: Order[]): PredictedItem[] {
  if (orders.length === 0) return []

  // Sort orders by date ascending
  const sorted = [...orders].sort(
    (a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime()
  )

  // Aggregate per-product order records
  const productMap: Record<
    string,
    { product: Product; dates: Date[]; quantities: number[] }
  > = {}

  for (const order of sorted) {
    for (const item of order.items) {
      const id = item.product.id
      if (!productMap[id]) {
        productMap[id] = {
          product: item.product,
          dates: [],
          quantities: [],
        }
      }
      productMap[id].dates.push(new Date(order.placedAt))
      productMap[id].quantities.push(item.quantity)
    }
  }

  const now = Date.now()
  const predictions: PredictedItem[] = []

  for (const [, record] of Object.entries(productMap)) {
    const { product, dates, quantities } = record

    // Need at least 2 orders to detect a cycle
    if (dates.length < 2) continue

    // Calculate gaps between consecutive orders (ms)
    const gaps: number[] = []
    for (let i = 1; i < dates.length; i++) {
      gaps.push(dates[i].getTime() - dates[i - 1].getTime())
    }

    const avgGapMs =
      gaps.reduce((sum, g) => sum + g, 0) / gaps.length
    const cycledays = avgGapMs / (1000 * 60 * 60 * 24)

    const lastOrderedAt = dates[dates.length - 1]
    const daysSinceLast =
      (now - lastOrderedAt.getTime()) / (1000 * 60 * 60 * 24)

    const daysLeft = Math.round(cycledays - daysSinceLast)

    // Confidence: more orders = more confidence
    const confidence: "high" | "medium" | "low" =
      dates.length >= 4 ? "high" : dates.length === 3 ? "medium" : "low"

    const typicalQuantity = Math.round(
      quantities.reduce((s, q) => s + q, 0) / quantities.length
    )

    // Only surface items due within 2 days (or overdue)
    if (daysLeft <= 2) {
      predictions.push({
        product,
        daysLeft,
        cycledays: Math.round(cycledays),
        confidence,
        typicalQuantity,
        lastOrderedAt: lastOrderedAt.toISOString(),
      })
    }
  }

  // Sort: most urgent first
  return predictions.sort((a, b) => a.daysLeft - b.daysLeft)
}

/**
 * Returns products frequently bought together with the given product,
 * based on co-occurrence in past orders.
 */
export function getFrequentlyBoughtWith(
  productId: string,
  orders: Order[],
  limit = 4
): Product[] {
  const coMap: Record<string, number> = {}

  for (const order of orders) {
    const ids = order.items.map((i) => i.product.id)
    if (!ids.includes(productId)) continue
    for (const id of ids) {
      if (id !== productId) {
        coMap[id] = (coMap[id] ?? 0) + 1
      }
    }
  }

  // Find the product objects, sorted by co-occurrence count
  const sorted = Object.entries(coMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  // Retrieve product objects from any order
  const allProducts = orders.flatMap((o) => o.items.map((i) => i.product))
  const unique: Record<string, Product> = {}
  for (const p of allProducts) unique[p.id] = p

  return sorted.map(([id]) => unique[id]).filter(Boolean)
}

/**
 * Returns the most recently ordered products (for the "Order Again" list).
 */
export function getRecentlyOrdered(orders: Order[], limit = 6): Product[] {
  const sorted = [...orders].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
  )
  const seen = new Set<string>()
  const result: Product[] = []
  for (const order of sorted) {
    for (const item of order.items) {
      if (!seen.has(item.product.id)) {
        seen.add(item.product.id)
        result.push(item.product)
      }
      if (result.length >= limit) return result
    }
  }
  return result
}
