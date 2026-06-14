"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Trash2, Zap, ArrowLeft, ShoppingBag, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useCartStore } from "@/store/cart"
import { useCheckoutStore } from "@/store/checkout"

export default function CartPage() {
  const router = useRouter()
  const {
    items,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    clearCart,
    addItem,
  } = useCartStore()
  const { setItems, setSource, setSuggestedProducts } = useCheckoutStore()

  const deliveryFee = totalPrice() >= 149 ? 0 : 29
  const total = totalPrice() + deliveryFee

  const handleCheckout = () => {
    setItems(items.map((i) => ({ product: i.product, quantity: i.quantity })))
    setSource("cart")
    setSuggestedProducts([])
    router.push("/checkout?from=cart")
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-3 px-8">
        <span className="text-6xl">🛒</span>
        <p className="text-[#565959] font-medium text-center">Your cart is empty</p>
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
      <div className="bg-white sticky top-0 z-30 px-4 py-3 border-b border-[#e3e6e6] flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]"
        >
          <ArrowLeft size={18} className="text-[#232f3e]" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShoppingCart size={20} className="text-[#232f3e]" />
          <h1 className="font-bold text-[#0f1111] text-lg">Your Cart</h1>
          <span className="text-[#888c8c] text-sm">({totalItems()} items)</span>
        </div>
        <button
          onClick={clearCart}
          className="text-[#cc0c39] text-[12px] font-semibold active:opacity-70"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-36">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <motion.div
              key={item.product.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.05 }}
              className="bg-white mx-3 mt-3 rounded-xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-14 h-14 bg-[#f8f8f8] rounded-lg flex items-center justify-center text-3xl border border-[#e3e6e6] shrink-0">
                  {item.product.image}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0f1111] line-clamp-1">
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-[#888c8c]">{item.product.variant}</p>
                  <p className="text-[14px] font-black text-[#0f1111] mt-0.5">
                    ₹{item.product.price * item.quantity}
                    <span className="text-[10px] text-[#888c8c] line-through ml-1">
                      ₹{item.product.mrp * item.quantity}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg border-2 border-[#ff9900] text-[#ff9900] font-bold text-base flex items-center justify-center active:bg-[#fff3e0]"
                  >
                    {item.quantity === 1 ? <Trash2 size={13} /> : "−"}
                  </button>
                  <motion.span
                    key={item.quantity}
                    initial={{ scale: 1.3 }}
                    animate={{ scale: 1 }}
                    className="text-[14px] font-bold w-7 text-center"
                  >
                    {item.quantity}
                  </motion.span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border-2 border-[#ff9900] text-[#ff9900] font-bold text-base flex items-center justify-center active:bg-[#fff3e0]"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="bg-white mx-3 rounded-xl px-4 py-4 space-y-3">
          <p className="text-[13px] font-bold text-[#0f1111]">Order Summary</p>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between text-[#565959]">
              <span>Subtotal ({totalItems()} items)</span>
              <span>₹{totalPrice()}</span>
            </div>
            <div className="flex justify-between text-[#565959]">
              <span>Delivery fee</span>
              <span className={deliveryFee === 0 ? "text-[#067d62] font-bold" : ""}>
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
              </span>
            </div>
            {deliveryFee === 0 && (
              <p className="text-[#067d62] text-[11px] bg-[#e8f5e9] rounded-lg px-3 py-2">
                🎉 You saved ₹29 on delivery!
              </p>
            )}
            <div className="border-t border-[#f0f2f2] pt-2 flex justify-between font-black text-[#0f1111] text-[15px]">
              <span>Total</span>
              <motion.span
                key={total}
                initial={{ scale: 1.2, color: "#ff9900" }}
                animate={{ scale: 1, color: "#0f1111" }}
              >
                ₹{total}
              </motion.span>
            </div>
          </div>
        </div>

        <div className="bg-white mx-3 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🎟️</span>
          <input
            type="text"
            placeholder="Apply coupon code"
            className="flex-1 text-[13px] outline-none text-[#0f1111] placeholder:text-[#888c8c] bg-transparent"
          />
          <button className="text-[#0066c0] text-[13px] font-bold active:opacity-70">Apply</button>
        </div>
      </div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e3e6e6] px-4 py-3 shadow-lg"
      >
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[#565959] text-sm">Total</span>
          <motion.span key={total} className="font-black text-[#0f1111] text-lg">
            ₹{total}
          </motion.span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full bg-[#ff9900] text-white font-black text-base py-4 rounded-xl active:bg-[#e68900] transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <ShoppingBag size={18} />
          Proceed to Checkout →
        </button>
      </motion.div>
    </div>
  )
}
