"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, ChevronRight, Clock } from "lucide-react"
import { useNotificationStore } from "@/store/notifications"
import { useCartStore } from "@/store/cart"
import { ORDERS } from "@/data/orders"
import { predictRunningLow } from "@/lib/predictions"
import type { PredictedItem } from "@/lib/predictions"

/**
 * Analyzes order history on mount, populates the notification store,
 * and renders a dismissible "Running Low" banner on the home page.
 * Tapping the banner adds items to cart and routes to /cart with animation.
 */
export default function RunningLowNotification() {
  const router = useRouter()
  const { items, isVisible, dismissed, setItems, dismiss } = useNotificationStore()
  const { addItem } = useCartStore()

  // Run prediction once on mount
  useEffect(() => {
    if (dismissed) return
    const predictions = predictRunningLow(ORDERS)
    if (predictions.length > 0) {
      const notifItems = predictions.map((p) => ({
        product: p.product,
        daysLeft: p.daysLeft,
        typicalQuantity: p.typicalQuantity,
        message: buildMessage(p),
      }))
      setItems(notifItems)
    }
  }, [dismissed, setItems])

  if (!isVisible || items.length === 0) return null

  // Tap → add items to cart and navigate with animation
  const handleTap = () => {
    for (const n of items) {
      addItem(n.product)
    }
    dismiss()
    router.push("/cart")
  }

  const primaryItem = items[0]

  return (
    <div className="mx-3 mb-3">
      {/* Push notification card */}
      <div
        className="relative bg-[#232f3e] rounded-2xl overflow-hidden shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
        onClick={handleTap}
      >
        {/* Dismiss button */}
        <button
          className="absolute top-2.5 right-2.5 z-10 p-1 rounded-full bg-white/10 active:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            dismiss()
          }}
        >
          <X size={12} className="text-white/70" />
        </button>

        <div className="flex items-start gap-3 p-4 pr-10">
          {/* App icon area */}
          <div className="w-10 h-10 rounded-xl bg-[#ff9900] flex items-center justify-center shrink-0 shadow-md">
            <span className="text-xl">🛒</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-[11px] font-bold tracking-wide">
                Amazon Now
              </span>
              <div className="flex items-center gap-0.5">
                <Clock size={10} className="text-white/50" />
                <span className="text-white/50 text-[10px]">now</span>
              </div>
            </div>

            <p className="text-white font-semibold text-[13px] leading-snug">
              {primaryItem.message}
            </p>

            {items.length > 1 && (
              <p className="text-white/60 text-[11px] mt-0.5">
                +{items.length - 1} more item{items.length > 2 ? "s" : ""} running low
              </p>
            )}

            {/* CTA */}
            <div className="flex items-center gap-1 mt-2.5">
              <span className="bg-[#ff9900] text-white text-[11px] font-black px-3 py-1.5 rounded-lg">
                Order Now
              </span>
              <span className="text-white/50 text-[10px] ml-1">Tap to reorder</span>
              <ChevronRight size={14} className="text-white/40 ml-auto" />
            </div>
          </div>
        </div>

        {/* Product chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {items.map((n) => (
            <div
              key={n.product.id}
              className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 shrink-0"
            >
              <span className="text-sm">{n.product.image}</span>
              <span className="text-white/80 text-[11px] font-medium">
                {n.product.name.split(" ").slice(0, 3).join(" ")}
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
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildMessage(item: PredictedItem): string {
  const name = item.product.name.split(" ").slice(0, 3).join(" ")
  if (item.daysLeft <= 0) {
    return `Your ${name} is overdue — order now!`
  }
  if (item.daysLeft === 1) {
    return `Your ${name} runs out tomorrow — reorder?`
  }
  return `${name} running low — based on your order history`
}
