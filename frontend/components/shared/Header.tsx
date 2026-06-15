"use client"

import { ShoppingCart, ChevronDown, Bell } from "lucide-react"
import { motion } from "framer-motion"
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
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="sticky top-0 z-40"
      style={{ background: "linear-gradient(180deg, #fffdf9 0%, #faf8f4 100%)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">

        {/* Left: avatar + PAY */}
        <div className="flex items-center gap-2">
          {/* Avatar circle */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e8e0d5] to-[#d4c9bc] flex items-center justify-center shadow-sm border border-white/60">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="#8a7968" opacity="0.9"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="#8a7968" opacity="0.7"/>
            </svg>
          </div>
          {/* PAY chip */}
          <div className="flex items-center gap-1 border border-[#e8e2d9] rounded-full px-2.5 py-1 bg-white/70 backdrop-blur-sm shadow-sm">
            <span className="text-[9px] font-bold text-[#5a5147] tracking-wider">PAY</span>
            <span className="text-[12px] font-bold text-[#232f3e]">₹0</span>
          </div>
        </div>

        {/* Center: Amazon Now logo */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[19px] font-black text-[#1a1a1a] tracking-[-0.5px]">amazon</span>
            <div className="bg-[#0099cc] text-white text-[11px] font-black px-2 py-[3px] rounded-[5px] tracking-widest shadow-sm"
                 style={{ letterSpacing: "0.08em" }}>
              now
            </div>
          </div>
          {/* Smile underline */}
          <svg width="72" height="6" viewBox="0 0 72 6" fill="none">
            <path d="M2 2 Q36 8 70 2" stroke="#ff9900" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        {/* Right: bell + cart */}
        <div className="flex items-center gap-2">
          <button className="relative w-8 h-8 rounded-full bg-white/70 border border-[#e8e2d9] backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-95 transition-transform">
            <Bell size={16} strokeWidth={1.8} className="text-[#3a3530]" />
            {notifItems.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#cc0c39] text-white text-[7px] font-black rounded-full flex items-center justify-center border border-white"
              >
                {notifItems.length}
              </motion.span>
            )}
          </button>

          <button
            onClick={toggleCart}
            className="relative w-8 h-8 rounded-full bg-white/70 border border-[#e8e2d9] backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ShoppingCart size={16} strokeWidth={1.8} className="text-[#3a3530]" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 bg-[#ff9900] text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center border border-white"
              >
                {count > 9 ? "9+" : count}
              </motion.span>
            )}
          </button>
        </div>
      </div>

      {/* Frosted glass location bar */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2 border border-white/80"
          style={{
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          {/* 12 min chip */}
          <div className="flex items-center gap-1.5 bg-[#fff3d0] rounded-full px-2.5 py-1 shrink-0 border border-[#ffd97a]/50">
            <span className="text-[13px]">⚡</span>
            <span className="text-[12px] font-black text-[#7a5c00] tracking-tight">12 mins</span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-[#ddd5c8]" />

          {/* Location */}
          <button className="flex items-center gap-1.5 flex-1 min-w-0">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" className="shrink-0">
              <path d="M6 0C3.24 0 1 2.24 1 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" fill="#8a7968"/>
              <circle cx="6" cy="5" r="1.8" fill="white"/>
            </svg>
            <span className="text-[12.5px] text-[#3a3530] font-medium truncate">
              {location ?? "Dwarka, Delhi"}
            </span>
            <ChevronDown size={13} className="text-[#8a7968] shrink-0" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Bottom hairline */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#e8e2d9]/60 to-transparent" />
    </motion.header>
  )
}
