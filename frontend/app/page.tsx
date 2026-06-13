import Header from "@/components/shared/Header"
import CategoryStrip from "@/components/home/CategoryStrip"
import PromoBanner from "@/components/home/PromoBanner"
import OffersGrid from "@/components/home/OffersGrid"
import DealsSection from "@/components/home/DealsSection"
import RunningLowNotification from "@/components/home/RunningLowNotification"
import { PRODUCTS } from "@/data/products"
import ProductCard from "@/components/home/ProductCard"

export default function HomePage() {
  // Frequently bought = products with "recurring" tag
  const frequentlyBought = PRODUCTS.filter((p) => p.tags.includes("recurring"))

  return (
    <>
      <Header />

      {/* Search bar */}
      <div className="bg-white px-3 py-2 border-b border-[#e3e6e6]">
        <div className="flex items-center gap-2.5 bg-[#f0f2f2] rounded-full px-4 py-2.5 border border-[#e3e6e6]">
          <span className="text-[#888c8c] text-base">🔍</span>
          <span className="text-[#888c8c] text-sm">Search for</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Category icons strip */}
        <CategoryStrip />

        {/* AI Running Low notification (appears when predictions exist) */}
        <div className="pt-1">
          <RunningLowNotification />
        </div>

        {/* Promotional banner (auto-rotates) */}
        <div className="bg-white pt-2 pb-3">
          <PromoBanner />
        </div>

        {/* Cashback + delivery offers grid */}
        <OffersGrid />

        {/* Frequently Bought section */}
        <div className="bg-white px-3 py-4">
          <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-3 font-semibold">
            Frequently Bought
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {frequentlyBought.map((product) => (
              <ProductCard key={product.id} product={product} showDiscount />
            ))}
          </div>
        </div>

        {/* Deals Under ₹8 */}
        <DealsSection />
      </div>
    </>
  )
}
