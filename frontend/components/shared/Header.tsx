"use client"

import { ShoppingCart, MapPin, ChevronDown, User, Bell } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { useNotificationStore } from "@/store/notifications"

export default function Header({
  userName,
  location,
}: {
  userName?: string
  location?: string
}) {
  const { totalItems, toggleCart } = useCartStore()
  const { items: notifItems } = useNotificationStore()
  const count = totalItems()

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top bar: account | logo | cart */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        {/* Left: account + pay balance */}
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]">
            <User size={18} className="text-[#232f3e]" />
          </button>
          <div className="flex items-center gap-1 bg-[#f0f2f2] rounded-full px-2 py-1">
            <span className="text-[10px] font-bold text-[#232f3e]">PAY</span>
            <span className="text-[11px] font-semibold text-[#232f3e]">₹0</span>
          </div>
        </div>

        {/* Center: Amazon Now wordmark */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <span className="text-[18px] font-black text-[#232f3e] tracking-tight">amazon</span>
            <span className="bg-[#00a0dc] text-white text-[11px] font-black px-1.5 py-0.5 rounded-sm tracking-wide">
              now
            </span>
          </div>
          <div className="w-20 h-[2px] rounded-full overflow-hidden bg-[#f0f2f2] mt-0.5">
            {/* Amazon smile underline */}
            <div className="h-full w-full bg-gradient-to-r from-transparent via-[#ff9900] to-transparent" />
          </div>
        </div>

        {/* Right: notifications + cart */}
        <div className="flex items-center gap-2">
          <button className="relative p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]">
            <Bell size={18} className="text-[#232f3e]" />
            {notifItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#cc0c39] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {notifItems.length}
              </span>
            )}
          </button>

          <button
            onClick={toggleCart}
            className="relative p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]"
          >
            <ShoppingCart size={18} className="text-[#232f3e]" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#ff9900] text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Delivery badge + address */}
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <div className="flex items-center gap-1 bg-[#f0c040] rounded-full px-2.5 py-1 shrink-0">
          <span className="text-[11px]">⚡</span>
          <span className="text-[12px] font-black text-black">12 mins</span>
        </div>
        <button className="flex items-center gap-1 min-w-0">
          <MapPin size={12} className="text-[#565959] shrink-0" />
          <span className="text-[12px] text-[#565959] truncate">
            {location ?? "Deliver to your location"}
          </span>
          <ChevronDown size={13} className="text-[#565959] shrink-0" />
        </button>
      </div>
    </header>
  )
}
