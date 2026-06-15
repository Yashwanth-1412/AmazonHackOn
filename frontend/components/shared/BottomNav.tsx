"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { useCartStore } from "@/store/cart"

const NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
          stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"} fill={active ? "#f5f0e8" : "none"} strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"} strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Order Again",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c-1.66 0-3-4.03-3-9s1.34-9 3-9m0 18c1.66 0 3-4.03 3-9s-1.34-9-3-9m-9 9a9 9 0 019-9"
          stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "1.8" : "1.5"} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/cart",
    label: "Cart",
    badge: true,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"} strokeLinejoin="round"
          fill={active ? "#f5f0e8" : "none"}/>
        <line x1="3" y1="6" x2="21" y2="6" stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"}/>
        <path d="M16 10a4 4 0 01-8 0" stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"}
          fill={active ? "#f5f0e8" : "none"}/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
          stroke={active ? "#1a1a1a" : "#9e9e9e"} strokeWidth={active ? "2" : "1.6"} strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { totalItems } = useCartStore()

  if (pathname === "/checkout" || pathname.startsWith("/payment")) return null

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: "rgba(255,253,249,0.92)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(232,226,217,0.8)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-1.5 pb-safe">
        {NAV_ITEMS.map(({ href, label, icon, badge }) => {
          const active = pathname === href
          const count = totalItems()
          return (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 min-w-[60px] relative">
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="relative"
              >
                {icon(active)}
                {badge && count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-[#ff9900] text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center border-[1.5px] border-white"
                  >
                    {count > 9 ? "9+" : count}
                  </motion.span>
                )}
              </motion.div>

              <span className={`text-[10px] tracking-tight ${active ? "text-[#1a1a1a] font-semibold" : "text-[#9e9e9e] font-medium"}`}>
                {label}
              </span>

              {active && (
                <motion.div
                  layoutId="nav-dot"
                  className="w-1 h-1 rounded-full bg-[#ff9900] mt-0.5"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
