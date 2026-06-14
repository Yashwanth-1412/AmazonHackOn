"use client"

import { useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, CheckCircle2 } from "lucide-react"
import { useVoiceStore } from "@/store/voice"
import RecognizedItemCard from "./RecognizedItemCard"
import BrandPicker from "./BrandPicker"

export default function VoicePopup() {
  const {
    isRecording,
    isProcessing,
    isConnected,
    interimTranscript,
    recognizedProducts,
    finalTranscript,
  } = useVoiceStore((s) => s)

  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const hasProducts = recognizedProducts.length > 0
  const show = isRecording || isProcessing || hasProducts

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [interimTranscript, finalTranscript])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="absolute bottom-[80px] right-4 w-[300px] max-h-[60vh] overflow-hidden"
        >
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-[#e3e6e6] overflow-hidden">
            {/* Recording indicator */}
            {(isRecording || isProcessing) && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f0f2f2]">
                <motion.div
                  animate={isRecording ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isRecording ? "bg-red-500" : "bg-[#ff9900]"
                    }`}
                  />
                </motion.div>
                <span className="text-[11px] font-semibold text-[#565959]">
                  {isRecording ? "Listening..." : "Processing..."}
                </span>
                {isConnected && (
                  <span className="text-[9px] text-green-600 ml-auto flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    Connected
                  </span>
                )}
              </div>
            )}

            {/* Transcript area */}
            {(interimTranscript || finalTranscript) && (
              <div className="px-4 py-3 border-b border-[#f0f2f2] max-h-[100px] overflow-y-auto no-scrollbar">
                {finalTranscript && (
                  <p className="text-[12px] text-[#0f1111] font-medium leading-relaxed">
                    {finalTranscript}
                  </p>
                )}
                {interimTranscript && (
                  <p className="text-[12px] text-[#888c8c] italic leading-relaxed">
                    {interimTranscript}
                  </p>
                )}
                <div ref={transcriptEndRef} />
              </div>
            )}

            {/* Recognized products */}
            {hasProducts && (
              <div className="px-3 py-3 space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
                <p className="text-[10px] font-semibold text-[#888c8c] uppercase tracking-wider mb-2">
                  Recognized Items
                </p>
                {recognizedProducts.map((product, idx) => (
                  <RecognizedItemCard
                    key={`${product.product_id}-${idx}`}
                    product={product}
                    index={idx}
                  />
                ))}
              </div>
            )}

            {/* Brand picker */}
            <div className="px-3 pb-3">
              <BrandPicker />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
