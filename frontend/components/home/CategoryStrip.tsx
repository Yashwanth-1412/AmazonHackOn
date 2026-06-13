"use client"

import Link from "next/link"
import { CATEGORIES } from "@/data/user"

export default function CategoryStrip() {
  return (
    <div className="bg-white px-3 py-3">
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.id}`}
            className="flex flex-col items-center gap-1.5 min-w-[60px] active:opacity-70"
          >
            <div className="w-14 h-14 rounded-xl bg-[#f0f2f2] flex items-center justify-center text-2xl shadow-sm">
              {cat.icon}
            </div>
            <span className="text-[11px] text-[#232f3e] font-medium text-center leading-tight whitespace-nowrap">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
