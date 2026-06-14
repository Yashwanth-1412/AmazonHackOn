"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft, Zap, Plus, Trash2, ShoppingBag, RefreshCw } from "lucide-react"
import { useCheckoutStore } from "@/store/checkout"
import { useCartStore } from "@/store/cart"
import { ORDERS } from "@/data/orders"
import { getFrequentlyBoughtWith } from "@/lib/predictions"
import { getHomeData, toProduct, type APIRunningLowItem } from "@/lib/api"

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromSource = searchParams.get("from")

  const {
    items,
    source,
    suggestedProducts,
    addItem,
    removeItem,
    updateQuantity,
    subtotal,
    deliveryFee,
    total,
    setSuggestedProducts,
    clearCheckout,
  } = useCheckoutStore()
  const { clearCart } = useCartStore()

  // State for running low predictions from backend
  const [runningLowItems, setRunningLowItems] = useState<APIRunningLowItem[]>([])
  const [loadingRunningLow, setLoadingRunningLow] = useState(true)

  // On mount: if coming from cart and no items in checkout, redirect back
  useEffect(() => {
    if (items.length === 0 && fromSource === "cart") {
      router.replace("/")
    }
  }, [items.length, fromSource, router])

  // Build suggestions from frequently bought with first item
  useEffect(() => {
    if (items.length > 0 && suggestedProducts.length === 0) {
      const firstId = items[0].product.id
      const suggestions = getFrequentlyBoughtWith(firstId, ORDERS, 5)
      const checkoutIds = new Set(items.map((i) => i.product.id))
      setSuggestedProducts(suggestions.filter((p) => !checkoutIds.has(p.id)))
    }
  }, [items, suggestedProducts.length, setSuggestedProducts])

  // Fetch running low items from backend (for smart suggestions)
  useEffect(() => {
    if (source === "notification") {
      fetchRunningLow()
    } else {
      setLoadingRunningLow(false)
    }
  }, [source])

  const fetchRunningLow = async () => {
    try {
      const data = await getHomeData("u001")
      setRunningLowItems(data.running_low ?? [])
    } catch (error) {
      console.error("Failed to fetch running low items:", error)
    } finally {
      setLoadingRunningLow(false)
    }
  }

  // Filter running low items that are NOT already in checkout
  const availableRunningLow = runningLowItems.filter(
    (item) => !items.find((i) => i.product.id === item.product.id)
  )

  const handlePlaceOrder = () => {
    clearCheckout()
    clearCart()
    router.push("/payment")
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-8">
        <span className="text-6xl">🛒</span>
        <p className="text-[#565959] font-medium text-center">
          Nothing to checkout. Add some items first.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-[#ff9900] text-white font-bold px-6 py-3 rounded-xl mt-2"
        >
          Shop Now
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f2]">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 px-4 py-3 border-b border-[#e3e6e6] flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]"
        >
          <ArrowLeft size={18} className="text-[#232f3e]" />
        </button>
        <h1 className="font-bold text-[#0f1111] text-lg flex-1">Checkout</h1>
        <div className="flex items-center gap-1 bg-[#f0c040] rounded-full px-2.5 py-1">
          <Zap size={12} className="text-black" />
          <span className="text-[11px] font-black text-black">12 mins</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-36">
        {/* Notification context banner */}
        {source === "notification" && (
          <div className="mx-3 mt-3 bg-[#232f3e] rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <p className="text-white font-bold text-[13px]">
                Smart Reorder
              </p>
              <p className="text-white/60 text-[11px]">
                Based on your purchase patterns — we&apos;ve pre-filled your usual items
              </p>
            </div>
          </div>
        )}

        {/* Delivery address */}
        <div className="bg-white mx-3 mt-3 rounded-xl p-4">
          <p className="text-[11px] text-[#888c8c] uppercase tracking-widest font-semibold mb-2">
            Delivering to
          </p>
          <div className="flex items-start gap-2">
            <span className="text-lg mt-0.5">📍</span>
            <div>
              <p className="text-[13px] font-bold text-[#0f1111]">Home</p>
              <p className="text-[12px] text-[#565959] leading-snug">
                A-1101, A Block, Sri Aditya Athena, Marathahalli, Bangalore - 560037
              </p>
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="bg-white mx-3 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#f0f2f2]">
            <p className="text-[11px] text-[#888c8c] uppercase tracking-widest font-semibold">
              {items.length} Item{items.length > 1 ? "s" : ""}
            </p>
          </div>

          {items.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[#f0f2f2] last:border-0"
            >
              <div className="w-12 h-12 bg-[#f8f8f8] rounded-lg flex items-center justify-center text-2xl border border-[#e3e6e6] shrink-0">
                {item.product.image}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#0f1111] line-clamp-1">
                  {item.product.name}
                </p>
                <p className="text-[10px] text-[#888c8c]">{item.product.variant}</p>
                <p className="text-[13px] font-black text-[#0f1111] mt-0.5">
                  ₹{item.product.price}
                  <span className="text-[10px] text-[#888c8c] line-through ml-1">
                    ₹{item.product.mrp}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg border-2 border-[#ff9900] text-[#ff9900] font-bold text-base flex items-center justify-center active:bg-[#fff3e0]"
                >
                  {item.quantity === 1 ? <Trash2 size={12} /> : "−"}
                </button>
                <span className="text-[13px] font-bold w-6 text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg border-2 border-[#ff9900] text-[#ff9900] font-bold text-base flex items-center justify-center active:bg-[#fff3e0]"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Smart Suggestions — Also running low (from algorithm) */}
        {loadingRunningLow ? (
          <div className="bg-white mx-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0f2f2] flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-[#0f1111]">
                  Also running low
                </p>
                <p className="text-[11px] text-[#888c8c]">
                  Based on your purchase patterns
                </p>
              </div>
              <div className="flex items-center gap-1 text-[#0066c0] text-[11px] font-bold">
                <RefreshCw size={12} className="animate-spin" />
                Loading...
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-24">
                    <div className="w-16 h-16 bg-[#f0f2f2] rounded-xl animate-pulse" />
                    <div className="h-3 bg-[#f0f2f2] rounded w-20 animate-pulse" />
                    <div className="h-4 bg-[#f0f2f2] rounded w-16 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : availableRunningLow.length > 0 ? (
          <div className="bg-white mx-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0f2f2] flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-[#0f1111]">
                  Also running low
                </p>
                <p className="text-[11px] text-[#888c8c]">
                  Based on your purchase patterns
                </p>
              </div>
              <button
                onClick={fetchRunningLow}
                className="flex items-center gap-1 text-[#0066c0] text-[11px] font-bold active:opacity-70"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3">
              {availableRunningLow.map((item) => {
                const product = toProduct(item.product)
                return (
                  <div
                    key={item.product.id}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-24 relative"
                  >
                    <div className="w-16 h-16 bg-[#f8f8f8] rounded-xl flex items-center justify-center text-3xl border border-[#e3e6e6]">
                      {product.image}
                    </div>
                    <p className="text-[10px] text-[#0f1111] font-medium text-center leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-[11px] font-black text-[#0f1111]">
                      ₹{product.price}
                    </p>
                    <div className="flex items-center gap-1 w-full justify-center">
                      {item.days_left <= 0 ? (
                        <span className="bg-[#cc0c39] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                          DUE
                        </span>
                      ) : (
                        <span className="bg-[#febd69] text-[#232f3e] text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.days_left}d
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => addItem(product)}
                      className="flex items-center gap-1 bg-white border-2 border-[#ff9900] text-[#ff9900] text-[10px] font-bold px-2.5 py-1 rounded-lg active:bg-[#fff3e0] w-full justify-center"
                    >
                      <Plus size={10} />
                      ADD
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Smart Suggestions — "You ordered these last week" */}
        {suggestedProducts.length > 0 && (
          <div className="bg-white mx-3 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0f2f2]">
              <p className="text-[13px] font-bold text-[#0f1111]">
                You ordered these last time
              </p>
              <p className="text-[11px] text-[#888c8c]">
                Add them to your order?
              </p>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3">
              {suggestedProducts.map((product) => {
                const inCart = items.find((i) => i.product.id === product.id)
                return (
                  <div
                    key={product.id}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-24"
                  >
                    <div className="w-16 h-16 bg-[#f8f8f8] rounded-xl flex items-center justify-center text-3xl border border-[#e3e6e6]">
                      {product.image}
                    </div>
                    <p className="text-[10px] text-[#0f1111] font-medium text-center leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-[11px] font-black text-[#0f1111]">
                      ₹{product.price}
                    </p>
                    {inCart ? (
                      <span className="text-[10px] text-[#067d62] font-bold">
                        ✓ Added
                      </span>
                    ) : (
                      <button
                        onClick={() => addItem(product)}
                        className="flex items-center gap-1 bg-white border-2 border-[#ff9900] text-[#ff9900] text-[10px] font-bold px-2.5 py-1 rounded-lg active:bg-[#fff3e0]"
                      >
                        <Plus size={10} />
                        ADD
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Coupon */}
        <div className="bg-white mx-3 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🎟️</span>
          <input
            type="text"
            placeholder="Apply coupon code"
            className="flex-1 text-[13px] outline-none text-[#0f1111] placeholder:text-[#888c8c] bg-transparent"
          />
          <button className="text-[#0066c0] text-[13px] font-bold active:opacity-70">
            Apply
          </button>
        </div>

        {/* Order summary */}
        <div className="bg-white mx-3 rounded-xl px-4 py-4 space-y-3">
          <p className="text-[13px] font-bold text-[#0f1111]">Order Summary</p>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between text-[#565959]">
              <span>Subtotal ({items.length} items)</span>
              <span>₹{subtotal()}</span>
            </div>
            <div className="flex justify-between text-[#565959]">
              <span>Delivery fee</span>
              <span className={deliveryFee() === 0 ? "text-[#067d62] font-bold" : ""}>
                {deliveryFee() === 0 ? "FREE" : `₹${deliveryFee()}`}
              </span>
            </div>
            {deliveryFee() === 0 && (
              <p className="text-[#067d62] text-[11px] bg-[#e8f5e9] rounded-lg px-3 py-2">
                🎉 You saved ₹29 on delivery!
              </p>
            )}
            <div className="border-t border-[#f0f2f2] pt-2 flex justify-between font-black text-[#0f1111] text-[15px]">
              <span>Total</span>
              <span>₹{total()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky checkout footer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e3e6e6] px-4 py-3">
        <button
          onClick={handlePlaceOrder}
          className="w-full bg-[#ff9900] text-white font-black text-base py-4 rounded-xl active:bg-[#e68900] transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <ShoppingBag size={18} />
          Proceed to Pay · ₹{total()}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  )
}
