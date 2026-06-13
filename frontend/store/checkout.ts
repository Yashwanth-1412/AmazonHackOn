import { create } from "zustand"
import type { Product, CartItem } from "@/types"

export type CheckoutSource = "notification" | "cart" | "direct"

interface CheckoutStore {
  items: CartItem[]
  source: CheckoutSource
  suggestedProducts: Product[]

  // actions
  setItems: (items: CartItem[]) => void
  setSource: (source: CheckoutSource) => void
  setSuggestedProducts: (products: Product[]) => void
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCheckout: () => void

  // computed
  totalItems: () => number
  subtotal: () => number
  deliveryFee: () => number
  total: () => number
}

export const useCheckoutStore = create<CheckoutStore>((set, get) => ({
  items: [],
  source: "direct",
  suggestedProducts: [],

  setItems: (items) => set({ items }),
  setSource: (source) => set({ source }),
  setSuggestedProducts: (products) => set({ suggestedProducts: products }),

  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return { items: [...state.items, { product, quantity: 1 }] }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }))
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }))
  },

  clearCheckout: () => set({ items: [], suggestedProducts: [], source: "direct" }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  deliveryFee: () => (get().subtotal() >= 149 ? 0 : 29),
  total: () => get().subtotal() + get().deliveryFee(),
}))
