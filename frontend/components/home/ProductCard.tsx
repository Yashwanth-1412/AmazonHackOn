"use client"

import { useCartStore } from "@/store/cart"
import type { Product } from "@/types"

interface ProductCardProps {
  product: Product
  showDiscount?: boolean
  size?: "sm" | "md"
}

export default function ProductCard({
  product,
  showDiscount = false,
  size = "md",
}: ProductCardProps) {
  const { addItem, items, updateQuantity } = useCartStore()

  const cartItem = items.find((i) => i.product.id === product.id)
  const qty = cartItem?.quantity ?? 0
  const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100)

  const isSmall = size === "sm"

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden border border-[#e3e6e6] flex-shrink-0 ${
        isSmall ? "w-36" : "w-40"
      }`}
    >
      {/* Image area */}
      <div className="relative bg-[#f8f8f8] flex items-center justify-center" style={{ height: isSmall ? 80 : 96 }}>
        <span className={isSmall ? "text-4xl" : "text-5xl"}>{product.image}</span>

        {/* Discount badge */}
        {showDiscount && discount > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-[#cc0c39] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-tight">
            {discount}%<br />OFF
          </div>
        )}

        {/* Deal label */}
        {product.tags.includes("steal-deal") && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#067d62] text-white text-[9px] font-bold py-0.5 text-center">
            Steal Deal
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-[11px] text-[#565959]">{product.brand}</p>
        <p className="text-[12px] font-semibold text-[#0f1111] leading-tight line-clamp-2">
          {product.name}
        </p>
        <p className="text-[10px] text-[#888c8c] mt-0.5">{product.variant}</p>

        {/* Price + Add button */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-[13px] font-black text-[#0f1111]">₹{product.price}</span>
            {discount > 0 && (
              <span className="text-[10px] text-[#888c8c] line-through ml-1">₹{product.mrp}</span>
            )}
          </div>

          {qty === 0 ? (
            <button
              onClick={() => addItem(product)}
              className="bg-white border-2 border-[#ff9900] text-[#ff9900] text-[12px] font-bold px-2.5 py-1 rounded-lg active:bg-[#fff3e0] transition-colors"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center gap-1 border-2 border-[#ff9900] rounded-lg overflow-hidden">
              <button
                onClick={() => updateQuantity(product.id, qty - 1)}
                className="px-2 py-0.5 text-[#ff9900] font-bold text-[14px] active:bg-[#fff3e0]"
              >
                −
              </button>
              <span className="text-[12px] font-bold text-[#0f1111] min-w-[14px] text-center">
                {qty}
              </span>
              <button
                onClick={() => addItem(product)}
                className="px-2 py-0.5 text-[#ff9900] font-bold text-[14px] active:bg-[#fff3e0]"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
