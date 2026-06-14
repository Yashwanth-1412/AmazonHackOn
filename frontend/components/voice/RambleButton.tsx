"use client"

import { motion } from "framer-motion"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { useRambleStore } from "@/store/ramble"
import { useRambleWebSocket } from "@/hooks/useRambleWebSocket"

export default function RambleButton() {
  const isConnected = useRambleStore((s) => s.isConnected)
  const isConnecting = useRambleStore((s) => s.isConnecting)
  const isListening = useRambleStore((s) => s.isListening)
  const canvasItems = useRambleStore((s) => s.canvasItems)
  const { startListening, stopListening } = useRambleWebSocket()

  const hasItems = canvasItems.length > 0

  return (
    <div className="relative">
      {/* Pulse ring when listening */}
      {isListening && (
        <motion.div
          className="absolute -inset-2 rounded-full bg-[#ff9900]/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Item count badge */}
      {hasItems && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -left-1 w-5 h-5 bg-[#ff9900] text-white text-[10px] font-bold rounded-full flex items-center justify-center z-20"
        >
          {canvasItems.length}
        </motion.div>
      )}

      <motion.button
        className={`
          relative z-10 flex items-center justify-center w-14 h-14 rounded-full
          shadow-lg border-2
          ${
            isListening
              ? "bg-red-500 border-red-400 shadow-red-500/30"
              : isConnecting
                ? "bg-[#ff9900] border-[#e68900]"
                : "bg-white border-[#e3e6e6] hover:bg-[#f8f8f8]"
          }
          active:scale-95 transition-colors
        `}
        whileTap={{ scale: 0.9 }}
        animate={
          isListening
            ? { scale: [1, 1.05, 1] }
            : isConnecting
              ? { rotate: [0, 360] }
              : {}
        }
        transition={
          isListening
            ? { duration: 1, repeat: Infinity }
            : isConnecting
              ? { duration: 2, repeat: Infinity, ease: "linear" }
              : {}
        }
        onClick={isListening ? stopListening : startListening}
        aria-label={isListening ? "Stop Ramble" : "Start Ramble"}
      >
        {isConnecting ? (
          <Loader2 size={24} className="text-white animate-spin" />
        ) : isListening ? (
          <MicOff size={22} className="text-white" />
        ) : (
          <Mic size={24} className="text-[#232f3e]" />
        )}
      </motion.button>

      {/* Label */}
      {!isListening && !isConnecting && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-center text-[#888c8c] mt-1.5 font-medium"
        >
          {isConnected ? "Tap & Ramble" : "Ramble"}
        </motion.p>
      )}
    </div>
  )
}
