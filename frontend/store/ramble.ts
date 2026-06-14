"use client"

import { create } from "zustand"

export interface CanvasItem {
  index: number
  product_id: string
  name: string
  brand: string
  variant: string
  category: string
  price: number
  quantity: number
  image: string
}

interface RambleState {
  // Connection
  isConnected: boolean
  isConnecting: boolean
  isListening: boolean
  isPaused: boolean

  // Canvas
  canvasItems: CanvasItem[]
  total: number

  // WebSocket
  _sendJson: ((data: object) => void) | null
  setSendJson: (fn: ((data: object) => void) | null) => void

  // Actions
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setListening: (listening: boolean) => void
  setPaused: (paused: boolean) => void
  setCanvas: (items: CanvasItem[], total: number) => void
  addItem: (item: CanvasItem) => void
  updateItem: (index: number, updates: Partial<CanvasItem>) => void
  removeItem: (index: number) => void
  clearCanvas: () => void
  reset: () => void
}

export const useRambleStore = create<RambleState>((set) => ({
  isConnected: false,
  isConnecting: false,
  isListening: false,
  isPaused: false,
  canvasItems: [],
  total: 0,
  _sendJson: null,

  setSendJson: (fn) => set({ _sendJson: fn }),
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setListening: (listening) => set({ isListening: listening }),
  setPaused: (paused) => set({ isPaused: paused }),

  setCanvas: (items, total) => set({ canvasItems: items, total }),

  addItem: (item) =>
    set((state) => ({
      canvasItems: [...state.canvasItems, item],
    })),

  updateItem: (index, updates) =>
    set((state) => ({
      canvasItems: state.canvasItems.map((item) =>
        item.index === index ? { ...item, ...updates } : item
      ),
    })),

  removeItem: (index) =>
    set((state) => ({
      canvasItems: state.canvasItems.filter((item) => item.index !== index),
    })),

  clearCanvas: () => set({ canvasItems: [], total: 0 }),

  reset: () =>
    set({
      isConnected: false,
      isConnecting: false,
      isListening: false,
      isPaused: false,
      canvasItems: [],
      total: 0,
    }),
}))
