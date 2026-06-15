"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Trash2, CheckCircle2 } from "lucide-react"
import type { CanvasItem } from "@/store/ramble"
import { getApiUrl } from "@/lib/api-url"

interface Props {
  item: CanvasItem
  index: number
  onRemove?: (index: number) => void
}

export default function CanvasItemCard({ item, index, onRemove }: Props) {
  const [imgError, setImgError] = useState(false)
  const API = getApiUrl()                                   // called inside component — window always available
  const imgUrl = `${API}/api/products/${item.product_id}/image`
  const svgUrl = `${API}/api/products/${item.product_id}/image?svg=1`

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-[#f0f2f2]"
    >
      {/* Product image — real photo or category SVG */}
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-[#e3e6e6] bg-[#f8f8f8]">
        <img
          src={imgError ? svgUrl : imgUrl}
          alt={item.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
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
          className="p-1.5 rounded-lg hover:bg-red-50 text-[#888c8c] hover:text-red-500 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  )
}
