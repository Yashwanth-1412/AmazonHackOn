"use client"

import ProductCard from "@/components/home/ProductCard"
import type { Product } from "@/types"

interface Props {
  products: Product[]
}

export default function FrequentlyBought({ products }: Props) {
  return (
    <div className="bg-white px-3 py-4">
      <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-3 font-semibold">
        Frequently Bought
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} showDiscount />
        ))}
      </div>
    </div>
  )
}
