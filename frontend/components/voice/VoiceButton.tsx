"use client"

import { useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Mic, Square, Loader2 } from "lucide-react"
import { useVoiceStore } from "@/store/voice"
import { useVoiceWebSocket } from "@/hooks/useVoiceWebSocket"

export default function VoiceButton() {
  const { isRecording, isProcessing, isConnected } = useVoiceStore((s) => s)
  const { startRecording, stopRecording } = useVoiceWebSocket()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const isHolding = useRef(false)

  const onStart = useCallback(() => {
    isHolding.current = true
    longPressTimer.current = setTimeout(() => {
      if (isHolding.current) {
        startRecording()
      }
    }, 200)
  }, [startRecording])

  const onStop = useCallback(() => {
    isHolding.current = false
    clearTimeout(longPressTimer.current)
    if (isRecording) {
      stopRecording()
    }
  }, [isRecording, stopRecording])

  return (
    <div className="relative">
      {/* Pulse ring when recording */}
      {isRecording && (
        <motion.div
          className="absolute -inset-2 rounded-full bg-[#ff9900]/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.button
        className={`
          relative z-10 flex items-center justify-center w-14 h-14 rounded-full
          shadow-lg border-2
          ${
            isRecording
              ? "bg-red-500 border-red-400 shadow-red-500/30"
              : isProcessing
                ? "bg-[#ff9900] border-[#e68900]"
                : "bg-white border-[#e3e6e6] hover:bg-[#f8f8f8]"
          }
          active:scale-95 transition-colors
        `}
        whileTap={{ scale: 0.9 }}
        animate={
          isRecording
            ? { scale: [1, 1.05, 1] }
            : isProcessing
              ? { rotate: [0, 360] }
              : {}
        }
        transition={
          isRecording
            ? { duration: 1, repeat: Infinity }
            : isProcessing
              ? { duration: 2, repeat: Infinity, ease: "linear" }
              : {}
        }
        onMouseDown={onStart}
        onMouseUp={onStop}
        onMouseLeave={onStop}
        onTouchStart={(e) => {
          e.preventDefault()
          onStart()
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          onStop()
        }}
        aria-label={isRecording ? "Release to stop recording" : "Hold to talk"}
      >
        {isProcessing && !isRecording ? (
          <Loader2 size={24} className="text-white animate-spin" />
        ) : isRecording ? (
          <Square size={20} className="text-white fill-white" />
        ) : (
          <Mic size={24} className="text-[#232f3e]" />
        )}
      </motion.button>

      {/* Label */}
      {!isRecording && !isProcessing && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-center text-[#888c8c] mt-1.5 font-medium"
        >
          {isConnected ? "Tap & Talk" : "Hold to Talk"}
        </motion.p>
      )}
    </div>
  )
}
