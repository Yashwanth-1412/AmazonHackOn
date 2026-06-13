"use client"

import { X, ShoppingCart, Trash2 } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { useRouter } from "next/navigation"
import { useCheckoutStore } from "@/store/checkout"

export default function CartSheet() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalPrice, totalItems, clearCart } =
    useCartStore()
  const { setItems, setSource, setSuggestedProducts } = useCheckoutStore()
  const router = useRouter()

  const handleCheckout = () => {
    setItems(items.map((i) => ({ product: i.product, quantity: i.quantity })))
    setSource("cart")
    setSuggestedProducts([])
    closeCart()
    router.push("/checkout?from=cart")
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white z-[70] rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#e3e6e6] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#f0f2f2]">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#232f3e]" />
            <h2 className="font-bold text-[#0f1111] text-lg">
              Your Cart ({totalItems()})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[#cc0c39] text-[12px] font-semibold active:opacity-70"
              >
                Clear
              </button>
            )}
            <button
              onClick={closeCart}
              className="p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]"
            >
              <X size={16} className="text-[#232f3e]" />
            </button>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">🛒</span>
              <p className="text-[#565959] font-medium">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="text-[#0066c0] text-sm font-semibold mt-2"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 bg-[#f8f8f8] rounded-xl p-3"
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-[#e3e6e6] shrink-0">
                  {item.product.image}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#0f1111] line-clamp-1">
                    {item.product.name}
                  </p>
                  <p className="text-[10px] text-[#888c8c]">{item.product.variant}</p>
                  <p className="text-[13px] font-black text-[#0f1111] mt-0.5">
                    ₹{item.product.price * item.quantity}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg border-2 border-[#ff9900] text-[#ff9900] font-bold text-base flex items-center justify-center active:bg-[#fff3e0]"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 size={12} />
                    ) : (
                      "−"
                    )}
                  </button>
                  <span className="text-[13px] font-bold text-[#0f1111] w-6 text-center">
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
            ))
          )}
        </div>

        {/* Footer / checkout button */}
        {items.length > 0 && (
          <div className="px-4 py-4 border-t border-[#f0f2f2] bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#565959] text-sm">Subtotal</span>
              <span className="font-black text-[#0f1111]">₹{totalPrice()}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-[#ff9900] text-white font-black text-base py-3.5 rounded-xl active:bg-[#e68900] transition-colors shadow-md"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
