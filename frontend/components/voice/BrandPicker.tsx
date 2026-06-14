"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useVoiceStore } from "@/store/voice"

export default function BrandPicker() {
  const pendingBrandChoice = useVoiceStore((s) => s.pendingBrandChoice)
  const setPendingBrandChoice = useVoiceStore((s) => s.setPendingBrandChoice)
  const _sendJson = useVoiceStore((s) => s._sendJson)
  const confirmBrandChoice = useVoiceStore((s) => s.confirmBrandChoice)

  if (!pendingBrandChoice) return null

  const handleSelect = (brand: string) => {
    if (_sendJson) {
      _sendJson({
        type: "brand_choice",
        product_id: pendingBrandChoice.product_id,
        brand,
      })
    }
    confirmBrandChoice(pendingBrandChoice.product_id, brand)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="bg-white rounded-2xl border border-[#e3e6e6] shadow-xl p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] text-[#565959] font-medium">Which brand?</p>
            <p className="text-[11px] text-[#888c8c]">
              for &ldquo;{pendingBrandChoice.product_name}&rdquo;
            </p>
          </div>
          <button
            onClick={() => setPendingBrandChoice(null)}
            className="p-1 rounded-full hover:bg-[#f0f2f2]"
          >
            <X size={14} className="text-[#888c8c]" />
          </button>
        </div>

        {/* Brand options */}
        <div className="space-y-1.5">
          {pendingBrandChoice.brand_options.map((brand) => {
            const isRecommended = brand === pendingBrandChoice.recommended_brand
            return (
              <button
                key={brand}
                onClick={() => handleSelect(brand)}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left
                  transition-all active:scale-[0.98]
                  ${
                    isRecommended
                      ? "bg-[#ff9900]/10 border border-[#ff9900]/30 text-[#0f1111]"
                      : "bg-[#f8f8f8] border border-transparent hover:bg-[#f0f2f2]"
                  }
                `}
              >
                <span className="text-[13px] font-semibold">{brand}</span>
                {isRecommended && (
                  <span className="text-[10px] text-[#cc7a00] font-medium bg-[#ff9900]/15 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Note */}
        <p className="text-[10px] text-[#888c8c] text-center mt-3">
          Recommended based on your shopping history
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
