"use client"

import { useRouter } from "next/navigation"
import { X, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useNotificationStore } from "@/store/notifications"
import { useCartStore } from "@/store/cart"
import { PRODUCTS } from "@/data/products"
import { toast } from "sonner"

const DEMO_NOTIFICATIONS = [
  {
    product: PRODUCTS.find((p) => p.id === "p1")!,
    daysLeft: 0,
    typicalQuantity: 2,
    label: "Amul 1L",
    emoji: "🥛",
  },
  {
    product: PRODUCTS.find((p) => p.id === "p2")!,
    daysLeft: 1,
    typicalQuantity: 1,
    label: "Mother Dairy 500g",
    emoji: "🧴",
  },
  {
    product: PRODUCTS.find((p) => p.id === "p13")!,
    daysLeft: 1,
    typicalQuantity: 1,
    label: "Britannia 400g",
    emoji: "🍞",
  },
]

export default function RunningLowNotification() {
  const router = useRouter()
  const { dismissed, dismiss } = useNotificationStore()
  const { addItem } = useCartStore()

  if (dismissed) return null

  const items = DEMO_NOTIFICATIONS
  const primary = items[0]

  const handleTap = () => {
    for (const n of items) {
      for (let i = 0; i < n.typicalQuantity; i++) addItem(n.product)
    }
    toast.success(`Added ${items.length} items to cart`)
    dismiss()
    router.push("/cart")
  }

  const handleSingleAdd = (item: typeof items[0], e: React.MouseEvent) => {
    e.stopPropagation()
    for (let i = 0; i < item.typicalQuantity; i++) addItem(item.product)
    toast.success(`Added ${item.label}`)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="mx-3 mt-2 mb-1"
        initial={{ opacity: 0, y: -16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        <div
          className="relative rounded-3xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(255,250,240,0.92) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,200,100,0.35)",
            boxShadow: "0 8px 32px rgba(200,140,40,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
          }}
          onClick={handleTap}
        >
          {/* Subtle warm glow top-left */}
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
               style={{ background: "radial-gradient(circle, rgba(255,180,50,0.15) 0%, transparent 70%)" }} />

          {/* Dismiss */}
          <button
            className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center active:bg-black/10 transition-colors"
            style={{ background: "rgba(0,0,0,0.06)" }}
            onClick={(e) => { e.stopPropagation(); dismiss() }}
          >
            <X size={11} className="text-[#5a5147]" />
          </button>

          <div className="flex items-start gap-3 px-4 pt-4 pb-3 pr-10">
            {/* Premium bell icon */}
            <motion.div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #ffb830 0%, #ff8c00 100%)",
                boxShadow: "0 4px 12px rgba(255,140,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill="white" opacity="0.95"/>
                <path d="M13.73 21a2 2 0 01-3.46 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M18 8A6 6 0 006 8" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </motion.div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-[#1a1a1a] tracking-wide">Amazon Now</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#4caf6e]" />
                  <span className="text-[10px] text-[#888] font-medium">just now</span>
                </div>
              </div>

              {/* Message */}
              <p className="text-[#1a1a1a] font-semibold text-[13.5px] leading-[1.35]">
                Jaideep, you're running out of milk —{" "}
                <span className="text-[#b36a00]">tap to reorder your usual Amul Taaza.</span>
              </p>
              <p className="text-[#888] text-[11px] mt-0.5 font-medium">
                +{items.length - 1} more items running low
              </p>

              {/* CTA Button */}
              <div className="flex items-center gap-2 mt-2.5">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-white text-[12px] font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #c8860a 0%, #a06400 100%)",
                    boxShadow: "0 3px 10px rgba(160,100,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" fill="white" opacity="0.9"/>
                    <line x1="3" y1="6" x2="21" y2="6" stroke="white" strokeWidth="2"/>
                    <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.8"/>
                  </svg>
                  Add All to Cart
                </motion.button>
                <span className="text-[10.5px] text-[#aaa] font-medium">Tap anywhere</span>
                <ChevronRight size={13} className="text-[#bbb] ml-auto" strokeWidth={2}/>
              </div>
            </div>
          </div>

          {/* Product chips */}
          <div className="flex gap-2 px-4 pb-4 overflow-x-auto no-scrollbar">
            {items.map((n) => (
              <motion.button
                key={n.product.id}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 shrink-0 border active:scale-95 transition-all"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  borderColor: "rgba(0,0,0,0.08)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
                whileTap={{ scale: 0.93 }}
                onClick={(e) => handleSingleAdd(n, e)}
              >
                <span className="text-[14px]">{n.emoji}</span>
                <span className="text-[11px] font-semibold text-[#3a3530]">{n.label}</span>
                {n.daysLeft <= 0 ? (
                  <span className="bg-[#cc0c39] text-white text-[8.5px] font-black px-1.5 py-[2px] rounded-full tracking-wide">
                    DUE
                  </span>
                ) : (
                  <span className="bg-[#fff0cc] text-[#8a6200] text-[8.5px] font-black px-1.5 py-[2px] rounded-full border border-[#ffd97a]/50">
                    {n.daysLeft}d
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
