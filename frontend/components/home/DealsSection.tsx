import { getStealDeals } from "@/data/products"
import ProductCard from "./ProductCard"

export default function DealsSection() {
  const deals = getStealDeals()

  return (
    <div className="bg-[#5c7a1e] rounded-t-3xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col items-center pt-5 pb-2 px-4">
        <div className="flex items-center gap-1">
          <span className="text-white/70 text-xs">DEALS UNDER</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-5xl font-black text-white">₹8</span>
          <span className="text-4xl mt-1">🏷️</span>
        </div>
      </div>

      {/* Product scroll */}
      <div className="pb-4 px-3">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {deals.map((product) => (
            <ProductCard key={product.id} product={product} showDiscount size="sm" />
          ))}
        </div>
      </div>
    </div>
  )
}
