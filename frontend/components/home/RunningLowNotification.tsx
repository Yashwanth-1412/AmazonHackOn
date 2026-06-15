"use client"

import { useRouter } from "next/navigation"
import { X, ChevronRight, Clock, ShoppingCart } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useNotificationStore } from "@/store/notifications"
import { useCartStore } from "@/store/cart"
import { PRODUCTS } from "@/data/products"
import { toast } from "sonner"

/**
 * Smart notification banner on the home page.
 * Shows "Running low on Milk" with the exact brand (Amul Taaza) the user previously ordered.
 * Tapping adds the item directly to the cart — no extra steps.
 */

// Hardcoded notification items for demo — based on user's order history
const DEMO_NOTIFICATIONS = [
  {
    product: PRODUCTS.find((p) => p.id === "p1")!, // Amul Taaza Toned Milk
    daysLeft: 0,
    typicalQuantity: 2,
    message: "Jaideep, you're running out of milk — tap to reorder your usual Amul Taaza",
  },
  {
    product: PRODUCTS.find((p) => p.id === "p2")!, // Mother Dairy Fresh Curd
    daysLeft: 1,
    typicalQuantity: 1,
    message: "Your curd runs out tomorrow — reorder Mother Dairy?",
  },
  {
    product: PRODUCTS.find((p) => p.id === "p13")!, // Britannia Bread
    daysLeft: 1,
    typicalQuantity: 1,
    message: "Bread running low — your usual Britannia Whole Wheat",
  },
]

export default function RunningLowNotification() {
  const router = useRouter()
  const { dismissed, dismiss } = useNotificationStore()
  const { addItem } = useCartStore()

  // Show for demo unless user explicitly dismissed it in this session
  if (dismissed) return null

  const items = DEMO_NOTIFICATIONS
  const primaryItem = items[0]

  // Tap the whole card → add ALL items to cart and go to cart
  const handleTap = () => {
    for (const n of items) {
      for (let i = 0; i < n.typicalQuantity; i++) {
        addItem(n.product)
      }
    }
    toast.success(`Added ${items.length} items to your cart`, {
      description: "Amul Taaza Milk ×2, Curd ×1, Bread ×1",
      action: { label: "View Cart", onClick: () => router.push("/cart") },
    })
    dismiss()
    router.push("/cart")
  }

  // Tap a single product chip → add just that one item
  const handleSingleAdd = (item: typeof DEMO_NOTIFICATIONS[0], e: React.MouseEvent) => {
    e.stopPropagation()
    for (let i = 0; i < item.typicalQuantity; i++) {
      addItem(item.product)
    }
    toast.success(
      `Added ${item.product.brand} ${item.product.name.split(" ").slice(-2).join(" ")} ×${item.typicalQuantity}`,
      {
        action: { label: "View Cart", onClick: () => router.push("/cart") },
      }
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        className="mx-3 mt-2 mb-1"
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 250, damping: 22 }}
      >
        {/* Push notification style card */}
        <div
          className="relative bg-[#232f3e] rounded-2xl overflow-hidden shadow-xl cursor-pointer active:scale-[0.98] transition-transform"
          onClick={handleTap}
        >
          {/* Dismiss button */}
          <button
            className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/10 active:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              dismiss()
            }}
          >
            <X size={12} className="text-white/70" />
          </button>

          <div className="flex items-start gap-3 p-4 pr-10">
            {/* App icon */}
            <motion.div
              className="w-10 h-10 rounded-xl bg-[#ff9900] flex items-center justify-center shrink-0 shadow-md"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-xl">🔔</span>
            </motion.div>

            <div className="flex-1 min-w-0">
              {/* Header line */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-[11px] font-bold tracking-wide">
                  Amazon Now
                </span>
                <div className="flex items-center gap-0.5">
                  <Clock size={10} className="text-white/50" />
                  <span className="text-white/50 text-[10px]">just now</span>
                </div>
              </div>

              {/* Message */}
              <p className="text-white font-semibold text-[13px] leading-snug">
                {primaryItem.message}
              </p>

              {items.length > 1 && (
                <p className="text-white/60 text-[11px] mt-0.5">
                  +{items.length - 1} more item{items.length > 2 ? "s" : ""} running low
                </p>
              )}

              {/* CTA */}
              <div className="flex items-center gap-2 mt-2.5">
                <span className="bg-[#ff9900] text-white text-[11px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <ShoppingCart size={12} />
                  Add All to Cart
                </span>
                <span className="text-white/50 text-[10px]">Tap anywhere</span>
                <ChevronRight size={14} className="text-white/40 ml-auto" />
              </div>
            </div>
          </div>

          {/* Product chips — tappable individually */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {items.map((n) => (
              <motion.button
                key={n.product.id}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-full px-2.5 py-1.5 shrink-0 active:scale-95 transition-all"
                whileTap={{ scale: 0.92 }}
                onClick={(e) => handleSingleAdd(n, e)}
              >
                <span className="text-sm">{n.product.image}</span>
                <span className="text-white/90 text-[11px] font-medium">
                  {n.product.brand} {n.product.variant}
                </span>
                {n.daysLeft <= 0 ? (
                  <span className="bg-[#cc0c39] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    DUE
                  </span>
                ) : (
                  <span className="bg-[#febd69] text-[#232f3e] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
