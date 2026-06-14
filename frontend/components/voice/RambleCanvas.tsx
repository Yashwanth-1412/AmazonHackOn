"use client"

import { useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  MicOff,
  Pause,
  Play,
  ShoppingCart,
  Trash2,
  Loader2,
  X,
} from "lucide-react"
import { useRambleStore } from "@/store/ramble"
import { useRambleWebSocket } from "@/hooks/useRambleWebSocket"
import { useCartStore } from "@/store/cart"
import CanvasItemCard from "./CanvasItemCard"
import type { Product } from "@/types"

export default function RambleCanvas() {
  const isConnected = useRambleStore((s) => s.isConnected)
  const isConnecting = useRambleStore((s) => s.isConnecting)
  const isListening = useRambleStore((s) => s.isListening)
  const isPaused = useRambleStore((s) => s.isPaused)
  const canvasItems = useRambleStore((s) => s.canvasItems)
  const total = useRambleStore((s) => s.total)
  const removeItem = useRambleStore((s) => s.removeItem)
  const clearCanvas = useRambleStore((s) => s.clearCanvas)

  const addToCart = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const {
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    sendAction,
    sendRaw,
  } = useRambleWebSocket()

  // Delete item — works even if WS closed
  const handleRemove = useCallback((index: number) => {
    removeItem(index)
    sendRaw({ type: "action", action: "remove_item", canvas_index: index })
  }, [removeItem, sendRaw])

  // Add to Cart — works even if WS closed by doing it locally
  const handleAddToCart = useCallback(() => {
    if (canvasItems.length === 0) return
    sendAction("add_to_cart")
    for (const item of canvasItems) {
      const product: Product = {
        id: item.product_id,
        name: item.name,
        brand: item.brand,
        variant: item.variant || "",
        price: item.price,
        mrp: item.price,
        image: "",
        category: (item.category || "grocery") as Product["category"],
        inStock: true,
        deliveryMins: 15,
        tags: [],
      }
      for (let i = 0; i < item.quantity; i++) {
        addToCart(product)
      }
    }
    clearCanvas()
    stopListening()   // close the voice UI
    openCart()
  }, [canvasItems, sendAction, addToCart, clearCanvas, stopListening, openCart])

  // Close the UI — stop session + clear canvas
  const handleClose = useCallback(() => {
    stopListening()
    clearCanvas()
  }, [stopListening, clearCanvas])

  const scrollRef = useRef<HTMLDivElement>(null)
  const hasItems = canvasItems.length > 0
  const show = isListening || isConnecting || hasItems

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [canvasItems])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="absolute bottom-[80px] right-4 w-[320px] max-h-[70vh] overflow-hidden"
        >
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#e3e6e6] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f2f2]">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={
                    isListening && !isPaused
                      ? { scale: [1, 1.3, 1] }
                      : {}
                  }
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isListening && !isPaused
                        ? "bg-red-500"
                        : isConnecting
                          ? "bg-[#ff9900]"
                          : "bg-gray-300"
                    }`}
                  />
                </motion.div>
                <span className="text-[12px] font-semibold text-[#565959]">
                  {isConnecting
                    ? "Connecting..."
                    : isPaused
                      ? "Paused"
                      : isListening
                        ? "Listening..."
                        : "Ramble"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#888c8c]">
                  {canvasItems.length} item{canvasItems.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={handleClose}
                  className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f0f2f2] text-[#888c8c] hover:text-[#0f1111] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Canvas items */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-2 max-h-[300px] no-scrollbar"
            >
              {hasItems ? (
                <AnimatePresence mode="popLayout">
                  {canvasItems.map((item) => (
                    <CanvasItemCard
                      key={`${item.product_id}-${item.index}`}
                      item={item}
                      index={item.index}
                      onRemove={handleRemove}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="text-center py-8">
                  <Mic
                    size={32}
                    className="mx-auto text-[#d5d9d9] mb-2"
                  />
                  <p className="text-[12px] text-[#888c8c]">
                    {isListening
                      ? "Speak to add items..."
                      : "Tap mic to start"}
                  </p>
                </div>
              )}
            </div>

            {/* Total */}
            {hasItems && (
              <div className="px-4 py-2 border-t border-[#f0f2f2] bg-[#f8f8f8]">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[#565959] font-medium">
                    Total
                  </span>
                  <span className="text-[14px] font-bold text-[#0f1111]">
                    ₹{total.toFixed(0)}
                  </span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="px-3 py-3 border-t border-[#f0f2f2]">
              {/* Primary actions */}
              <div className="flex gap-2 mb-2">
                {hasItems && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddToCart()}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#ff9900] hover:bg-[#e68900] text-white text-[12px] font-semibold py-2.5 rounded-xl transition-colors"
                  >
                    <ShoppingCart size={14} />
                    Add to Cart
                  </motion.button>
                )}
                {hasItems && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendAction("discard")}
                    className="flex items-center justify-center gap-1.5 bg-[#f0f2f2] hover:bg-[#e3e6e6] text-[#565959] text-[12px] font-semibold px-3 py-2.5 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                )}
              </div>

              {/* Mic controls */}
              <div className="flex items-center justify-center gap-3">
                {/* Pause/Resume */}
                {isListening && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={isPaused ? resumeListening : pauseListening}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f0f2f2] hover:bg-[#e3e6e6] text-[#565959] transition-colors"
                  >
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                  </motion.button>
                )}

                {/* Main mic button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={isListening ? stopListening : startListening}
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-full shadow-lg border-2 transition-colors
                    ${
                      isListening
                        ? "bg-red-500 border-red-400 shadow-red-500/30"
                        : isConnecting
                          ? "bg-[#ff9900] border-[#e68900]"
                          : "bg-white border-[#e3e6e6] hover:bg-[#f8f8f8]"
                    }
                  `}
                >
                  {isConnecting ? (
                    <Loader2 size={20} className="text-white animate-spin" />
                  ) : isListening ? (
                    <MicOff size={20} className="text-white" />
                  ) : (
                    <Mic size={20} className="text-[#232f3e]" />
                  )}
                </motion.button>

                {/* Pause/Resume placeholder for alignment */}
                {isListening && <div className="w-10" />}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
