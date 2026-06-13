import { getProducts, toProduct } from "@/lib/api"
import ProductCard from "@/components/home/ProductCard"
import Link from "next/link"

const CATEGORIES = [
  { id: "all",               label: "All",          icon: "⊞" },
  { id: "dairy",             label: "Dairy",        icon: "🥛" },
  { id: "grocery",           label: "Staples",      icon: "🛒" },
  { id: "snacks",            label: "Snacks",       icon: "🍿" },
  { id: "beverages",         label: "Drinks",       icon: "☕" },
  { id: "bakery",            label: "Bakery",       icon: "🍞" },
  { id: "fruits-vegetables", label: "Fresh",        icon: "🥦" },
  { id: "household",         label: "Household",    icon: "🧹" },
  { id: "personal-care",     label: "Care",         icon: "🧴" },
  { id: "pharmacy",          label: "Pharmacy",     icon: "💊" },
]

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const activeCategory = category && category !== "all" ? category : undefined

  const { products: raw } = await getProducts({
    category: activeCategory,
    limit: 60,
  }).catch(() => ({ products: [] }))

  const products = raw.map(toProduct)

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#e3e6e6] px-3 pt-4 pb-2">
        <h2 className="text-lg font-bold text-[#0f1111] mb-3">Categories</h2>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => {
            const active = (cat.id === "all" && !activeCategory) || cat.id === activeCategory
            return (
              <Link
                key={cat.id}
                href={cat.id === "all" ? "/products" : `/products?category=${cat.id}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                  active
                    ? "bg-[#232f3e] text-white border-[#232f3e]"
                    : "bg-white text-[#232f3e] border-[#e3e6e6] active:bg-[#f0f2f2]"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Product grid */}
      <div className="px-3 py-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#888c8c]">
            <span className="text-5xl mb-3">🔍</span>
            <p className="text-sm font-medium">No products found</p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-[#888c8c] mb-3">
              {products.length} products
              {activeCategory ? ` in ${activeCategory}` : ""}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} showDiscount />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom nav padding */}
      <div className="h-20" />
    </div>
  )
}
