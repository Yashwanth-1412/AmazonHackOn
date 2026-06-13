"use client"

import { useState, useEffect } from "react"
import { PROMO_BANNERS } from "@/data/user"

export default function PromoBanner() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent((c) => (c + 1) % PROMO_BANNERS.length)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  const banner = PROMO_BANNERS[current]

  return (
    <div className="px-3">
      <div
        className={`relative bg-gradient-to-br ${banner.bg} rounded-2xl overflow-hidden h-36`}
      >
        {/* Text content */}
        <div className="absolute inset-0 flex flex-col justify-center px-5 py-4">
          <span className="text-white/80 text-[11px] font-medium uppercase tracking-widest mb-1">
            {banner.subtitle}
          </span>
          <h3 className="text-white text-2xl font-black leading-tight tracking-tight">
            {banner.title}
          </h3>
          <div className="mt-2 inline-flex">
            <span className="bg-white/90 text-[#232f3e] text-[11px] font-black px-3 py-1 rounded-full">
              {banner.badge}
            </span>
          </div>
        </div>

        {/* Emoji decoration */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-6xl opacity-80">
          {banner.emoji}
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {PROMO_BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${
                i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
