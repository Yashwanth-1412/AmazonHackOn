"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, RefreshCw, Grid3x3, User } from "lucide-react"

const NAV_ITEMS = [
  { href: "/",         label: "Home",       icon: Home      },
  { href: "/orders",   label: "Order Again", icon: RefreshCw  },
  { href: "/products", label: "Categories", icon: Grid3x3    },
  { href: "/profile",  label: "Profile",    icon: User       },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e3e6e6] z-50 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-4 py-1 min-w-[60px]"
            >
              <Icon
                size={22}
                className={active ? "text-[#232f3e]" : "text-[#888c8c]"}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-[#232f3e] font-semibold" : "text-[#888c8c]"
                }`}
              >
                {label}
              </span>
              {active && (
                <div className="w-4 h-0.5 bg-[#ff9900] rounded-full mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
