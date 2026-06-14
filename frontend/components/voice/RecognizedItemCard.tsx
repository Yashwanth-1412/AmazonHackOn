"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { RecognizedProduct } from "@/store/voice"

interface Props {
  product: RecognizedProduct
  index: number
}

export default function RecognizedItemCard({ product, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 300, damping: 25 }}
      className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-[#f0f2f2]"
    >
      {/* Product icon */}
      <div className="w-9 h-9 rounded-lg bg-[#f8f8f8] flex items-center justify-center text-lg shrink-0 border border-[#e3e6e6]">
        {product.image || "📦"}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] font-semibold text-[#0f1111] truncate">
            {product.brand && (
              <span className="text-[#0066c0]">{product.brand} </span>
            )}
            {product.name}
          </p>
          {product.confidence > 0.8 && (
            <CheckCircle2 size={12} className="text-green-500 shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-[#888c8c]">
          x{product.quantity} — ₹{product.price * product.quantity}
        </p>
      </div>

      {/* Confidence indicator */}
      <div className="flex items-center gap-1">
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            product.confidence > 0.8
              ? "bg-green-400"
              : product.confidence > 0.5
                ? "bg-yellow-400"
                : "bg-orange-400"
          }`}
        />
        <span className="text-[9px] text-[#888c8c] font-medium">
          {Math.round(product.confidence * 100)}%
        </span>
      </div>
    </motion.div>
  )
}
