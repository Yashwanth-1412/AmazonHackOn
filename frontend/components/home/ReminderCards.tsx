"use client"

import { ChevronRight } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { toProduct, type APIReminder, type APIRunningLowItem } from "@/lib/api"

const URGENCY_STYLES = {
  high: "border-[#cc0c39] bg-[#fff5f5]",
  medium: "border-[#ff9900] bg-[#fffbf0]",
  low: "border-[#067d62] bg-[#f0fff8]",
}

const URGENCY_BADGE = {
  high: "bg-[#cc0c39] text-white",
  medium: "bg-[#ff9900] text-white",
  low: "bg-[#067d62] text-white",
}

const TYPE_ICON: Record<string, string> = {
  low_stock: "⏳",
  seasonal: "🌧️",
  routine: "📅",
  area_signal: "📍",
  weather: "🌤️",
}

interface Props {
  reminders: APIReminder[]
  runningLowItems?: APIRunningLowItem[]
}

export default function ReminderCards({ reminders, runningLowItems = [] }: Props) {
  const { addItem } = useCartStore()

  // Show top 4 only — prioritised by backend already
  const visible = reminders.slice(0, 4)

  const handleCta = (reminder: APIReminder) => {
    // Find the matching product in running low items
    if (reminder.product_id) {
      const match = runningLowItems.find(
        (item) => item.product.id === reminder.product_id
      )
      if (match) {
        const product = toProduct(match.product)
        addItem(product)
      }
    }
  }

  return (
    <div className="bg-white px-3 py-3">
      <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-2.5 font-semibold">
        For You
      </p>

      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {visible.map((r) => (
          <div
            key={r.id}
            className={`flex-shrink-0 w-52 rounded-2xl border-2 p-3 cursor-pointer active:scale-[0.98] transition-transform ${URGENCY_STYLES[r.urgency] ?? URGENCY_STYLES.low
              }`}
            onClick={() => handleCta(r)}
          >
            {/* Icon + badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{TYPE_ICON[r.type] ?? "💡"}</span>
              {r.days_left !== undefined && r.days_left <= 2 && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${URGENCY_BADGE[r.urgency]
                    }`}
                >
                  {r.days_left === 0 ? "NOW" : `${r.days_left}d`}
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-[12px] font-bold text-[#0f1111] leading-snug line-clamp-2">
              {r.title}
            </p>
            <p className="text-[10px] text-[#565959] mt-0.5 line-clamp-1">
              {r.subtitle}
            </p>

            {/* CTA */}
            <div className="flex items-center gap-0.5 mt-2.5">
              <span className="text-[11px] font-bold text-[#ff9900]">
                {r.cta_label}
              </span>
              <ChevronRight size={12} className="text-[#ff9900]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
