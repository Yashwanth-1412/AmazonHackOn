import { create } from "zustand"
import type { Product } from "@/types"

export interface NotificationItem {
  product: Product
  daysLeft: number
  typicalQuantity: number
  message: string
}

interface NotificationStore {
  items: NotificationItem[]
  isVisible: boolean
  dismissed: boolean

  setItems: (items: NotificationItem[]) => void
  dismiss: () => void
  show: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  items: [],
  isVisible: false,
  dismissed: false,

  setItems: (items) => set({ items, isVisible: items.length > 0 }),
  dismiss: () => set({ isVisible: false, dismissed: true }),
  show: () => set({ isVisible: true }),
  reset: () => set({ items: [], isVisible: false, dismissed: false }),
}))
