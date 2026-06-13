import type { Order } from "@/types"
import { PRODUCTS } from "./products"

const p = (id: string) => PRODUCTS.find((x) => x.id === id)!

// Helper: date N days ago (ISO string)
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

/**
 * Mock order history – milk, curd, bread are ordered roughly every 7 days.
 * Last order was 6 days ago → triggers "running low" predictions.
 */
export const ORDERS: Order[] = [
  {
    id: "ord_001",
    items: [
      { product: p("p1"), quantity: 2 }, // Milk ×2
      { product: p("p2"), quantity: 1 }, // Curd ×1
      { product: p("p13"), quantity: 1 }, // Bread ×1
    ],
    total: 204,
    status: "delivered",
    placedAt: daysAgo(6),
    deliveredAt: daysAgo(6),
  },
  {
    id: "ord_002",
    items: [
      { product: p("p1"), quantity: 2 }, // Milk
      { product: p("p2"), quantity: 1 }, // Curd
      { product: p("p14"), quantity: 1 }, // Eggs
      { product: p("p9"), quantity: 2 }, // Lays
    ],
    total: 312,
    status: "delivered",
    placedAt: daysAgo(13),
    deliveredAt: daysAgo(13),
  },
  {
    id: "ord_003",
    items: [
      { product: p("p1"), quantity: 2 }, // Milk
      { product: p("p2"), quantity: 2 }, // Curd
      { product: p("p13"), quantity: 1 }, // Bread
      { product: p("p7"), quantity: 1 }, // Water
    ],
    total: 338,
    status: "delivered",
    placedAt: daysAgo(20),
    deliveredAt: daysAgo(20),
  },
  {
    id: "ord_004",
    items: [
      { product: p("p1"), quantity: 2 }, // Milk
      { product: p("p2"), quantity: 1 }, // Curd
      { product: p("p11"), quantity: 1 }, // Oil
      { product: p("p10"), quantity: 1 }, // Kurkure
    ],
    total: 327,
    status: "delivered",
    placedAt: daysAgo(27),
    deliveredAt: daysAgo(27),
  },
  {
    id: "ord_005",
    items: [
      { product: p("p1"), quantity: 2 }, // Milk
      { product: p("p2"), quantity: 1 }, // Curd
      { product: p("p12"), quantity: 1 }, // Atta
      { product: p("p8"), quantity: 1 }, // Coffee
      { product: p("p13"), quantity: 1 }, // Bread
    ],
    total: 671,
    status: "delivered",
    placedAt: daysAgo(34),
    deliveredAt: daysAgo(34),
  },
]
