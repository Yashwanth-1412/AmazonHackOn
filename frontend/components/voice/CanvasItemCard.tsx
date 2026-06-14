"use client"

import { motion } from "framer-motion"
import { Trash2, CheckCircle2 } from "lucide-react"
import type { CanvasItem } from "@/store/ramble"

interface Props {
  item: CanvasItem
  index: number
  onRemove?: (index: number) => void
}

export default function CanvasItemCard({ item, index, onRemove }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{
        delay: index * 0.05,
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-[#f0f2f2]"
    >
      {/* Product icon — emoji based on category */}
      <div className="w-10 h-10 rounded-lg bg-[#f8f8f8] flex items-center justify-center text-lg shrink-0 border border-[#e3e6e6]">
        {item.category === "snacks" ? "🍟" :
         item.category === "dairy" ? "🥛" :
         item.category === "beverages" ? "🥤" :
         item.category === "bakery" ? "🍞" :
         item.category === "fruits-vegetables" ? "🥦" :
         item.category === "household" ? "🧹" :
         item.category === "personal-care" ? "🧴" :
         "📦"}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-[#0f1111] truncate">
            {item.brand && (
              <span className="text-[#0066c0]">{item.brand} </span>
            )}
            {item.name}
          </p>
          <CheckCircle2 size={12} className="text-green-500 shrink-0" />
        </div>
        <p className="text-[11px] text-[#565959]">
          x{item.quantity} — ₹{item.price * item.quantity}
        </p>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-[#888c8c] hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  )
}
