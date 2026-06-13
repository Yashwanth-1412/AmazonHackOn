"use client"

import { useCartStore } from "@/store/cart"
import ProductImage from "@/components/shared/ProductImage"
import { toProduct, type APIRunningLowItem } from "@/lib/api"

interface Props {
  items: APIRunningLowItem[]
}

export default function RunningLowSection({ items }: Props) {
  const { addItem, items: cartItems } = useCartStore()

  return (
    <div className="bg-white px-3 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] text-[#888c8c] uppercase tracking-widest font-semibold">
          Running Low
        </p>
        <span className="text-[10px] text-[#ff9900] font-semibold">
          Based on your usage
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((item) => {
          const product  = toProduct(item.product)
          const inCart   = cartItems.find((c) => c.product.id === product.id)
          const daysLeft = item.days_left

          const urgencyColor =
            daysLeft <= 0 ? "border-[#cc0c39]"
            : daysLeft <= 2 ? "border-[#ff9900]"
            : "border-[#e3e6e6]"

          const dayLabel =
            daysLeft <= 0 ? "Out now"
            : daysLeft === 1 ? "1 day left"
            : `${daysLeft} days left`

          const dayBadge =
            daysLeft <= 0 ? "bg-[#cc0c39] text-white"
            : daysLeft <= 2 ? "bg-[#ff9900] text-white"
            : "bg-[#f0f2f2] text-[#565959]"

          return (
            <div
              key={product.id}
              className={`flex-shrink-0 w-36 rounded-2xl border-2 overflow-hidden ${urgencyColor}`}
            >
              {/* Product image */}
              <div className="h-20 bg-[#f8f8f8] flex items-center justify-center relative">
                <ProductImage
                  name={product.name}
                  brand={product.brand}
                  category={product.category}
                  logoUrl={product.image?.startsWith("http") ? product.image : undefined}
                  size={56}
                />
                <span
                  className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${dayBadge}`}
                >
                  {daysLeft <= 0 ? "DUE" : `${daysLeft}d`}
                </span>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-[10px] text-[#565959] truncate">{product.brand}</p>
                <p className="text-[11px] font-semibold text-[#0f1111] line-clamp-2 leading-tight">
                  {product.name}
                </p>
                <p className="text-[10px] text-[#888c8c] mt-0.5">{dayLabel}</p>

                {/* Add button */}
                <button
                  onClick={() => addItem(product)}
                  className={`w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                    inCart
                      ? "bg-[#067d62] text-white"
                      : "border-2 border-[#ff9900] text-[#ff9900] active:bg-[#fff3e0]"
                  }`}
                >
                  {inCart ? `In cart (${inCart.quantity})` : `ADD  ₹${product.price}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
