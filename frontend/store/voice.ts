"use client"

import { create } from "zustand"
import type { Product } from "@/types"

export interface RecognizedProduct {
  product_id: string
  name: string
  brand: string
  variant: string
  category?: string
  price: number
  quantity: number
  image: string
  confidence: number
  brand_options: { brand: string; confidence: number; reason: string }[]
  needs_brand_confirmation: boolean
}

export interface BrandChoice {
  product_id: string
  product_name: string
  recommended_brand: string
  brand_options: string[]
  transcript: string
}

interface VoiceState {
  // Connection
  isConnected: boolean
  isRecording: boolean
  isProcessing: boolean

  // Transcript
  interimTranscript: string
  finalTranscript: string

  // Recognized items
  recognizedProducts: RecognizedProduct[]

  // Brand disambiguation
  pendingBrandChoice: BrandChoice | null

  // WebSocket reference (shared across components)
  _sendJson: ((data: object) => void) | null
  setSendJson: (fn: ((data: object) => void) | null) => void

  // Actions
  setConnected: (connected: boolean) => void
  setRecording: (recording: boolean) => void
  setProcessing: (processing: boolean) => void
  setInterimTranscript: (transcript: string) => void
  setFinalTranscript: (transcript: string) => void
  addRecognizedProduct: (product: RecognizedProduct) => void
  updateRecognizedProduct: (productId: string, updates: Partial<RecognizedProduct>) => void
  removeRecognizedProduct: (productId: string) => void
  clearRecognizedProducts: () => void
  setPendingBrandChoice: (choice: BrandChoice | null) => void
  confirmBrandChoice: (productId: string, brand: string) => void
  reset: () => void
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isConnected: false,
  isRecording: false,
  isProcessing: false,
  interimTranscript: "",
  finalTranscript: "",
  recognizedProducts: [],
  pendingBrandChoice: null,
  _sendJson: null,

  setSendJson: (fn) => set({ _sendJson: fn }),
  setConnected: (connected) => set({ isConnected: connected }),
  setRecording: (recording) => set({ isRecording: recording }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setInterimTranscript: (transcript) => set({ interimTranscript: transcript }),
  setFinalTranscript: (transcript) => set({ finalTranscript: transcript }),

  addRecognizedProduct: (product) =>
    set((state) => ({
      recognizedProducts: [...state.recognizedProducts, product],
    })),

  updateRecognizedProduct: (productId, updates) =>
    set((state) => ({
      recognizedProducts: state.recognizedProducts.map((p) =>
        p.product_id === productId ? { ...p, ...updates } : p
      ),
    })),

  removeRecognizedProduct: (productId) =>
    set((state) => ({
      recognizedProducts: state.recognizedProducts.filter((p) => p.product_id !== productId),
    })),

  clearRecognizedProducts: () => set({ recognizedProducts: [] }),

  setPendingBrandChoice: (choice) => set({ pendingBrandChoice: choice }),

  confirmBrandChoice: (productId, brand) =>
    set((state) => ({
      recognizedProducts: state.recognizedProducts.map((p) =>
        p.product_id === productId ? { ...p, brand, needs_brand_confirmation: false } : p
      ),
      pendingBrandChoice: null,
    })),

  reset: () =>
    set({
      isConnected: false,
      isRecording: false,
      isProcessing: false,
      interimTranscript: "",
      finalTranscript: "",
      recognizedProducts: [],
      pendingBrandChoice: null,
    }),
}))