"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useNotificationStore } from "@/store/notifications"

type PayMethod = "upi" | "card" | "cod" | "amazon-pay"

export default function PaymentPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<PayMethod>("upi")
  const [upiId, setUpiId] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePay = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
    }, 1800)
  }

  // Navigate home after success animation completes
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        // Reset notification so it shows again on fresh home visit
        useNotificationStore.getState().reset()
        router.replace("/")
      }, 3200)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  if (success) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[80vh] px-8 gap-5 overflow-hidden">
        {/* Confetti dots */}
        {Array.from({ length: 14 }, (_, i) => (
          <motion.div
            key={`confetti-${i}`}
            className="absolute w-2.5 h-2.5 rounded-full"
            style={{
              background: ["#ff9900", "#067d62", "#cc0c39", "#0066c0", "#f0c040"][i % 5],
              left: `${10 + (i * 6) % 80}%`,
              top: "30%",
            }}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0.5],
              y: [0, -30 - i * 5, 50 + i * 8, 120 + i * 6],
              x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 3)],
            }}
            transition={{ duration: 1.6, delay: 0.2 + i * 0.06, ease: "easeOut" }}
          />
        ))}

        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
          className="relative"
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-[#067d62]/20"
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-[#067d62]/10"
            animate={{ scale: [1, 2], opacity: [0.4, 0] }}
            transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
          />
          <div className="w-24 h-24 bg-[#067d62] rounded-full flex items-center justify-center shadow-xl relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            >
              <Check size={48} className="text-white" strokeWidth={3} />
            </motion.div>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <h2 className="text-2xl font-black text-[#0f1111]">Order Placed! 🎉</h2>
          <p className="text-[#565959] mt-1 text-sm">Your items are on their way</p>
        </motion.div>

        {/* Delivery info card */}
        <motion.div
          className="bg-white rounded-2xl px-5 py-4 flex items-center gap-3 w-full shadow-sm border border-[#e3e6e6]"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.9, type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="w-10 h-10 bg-[#f0c040] rounded-full flex items-center justify-center">
            <Zap size={20} className="text-[#232f3e]" />
          </div>
          <div>
            <p className="font-bold text-[#0f1111] text-sm">Arriving in 12 minutes</p>
            <p className="text-[11px] text-[#565959]">
              A-1101, A Block, Sri Aditya Athena
            </p>
          </div>
        </motion.div>

        {/* Redirect text */}
        <motion.p
          className="text-[#888c8c] text-xs mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Taking you back home...
        </motion.p>
      </div>
    )
  }

  return (
    <div className="bg-[#f0f2f2]">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 px-4 py-3 border-b border-[#e3e6e6] flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full bg-[#f0f2f2] active:bg-[#e3e6e6]"
        >
          <ArrowLeft size={18} className="text-[#232f3e]" />
        </button>
        <h1 className="font-bold text-[#0f1111] text-lg flex-1">Payment</h1>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-[#067d62] rounded-full" />
          <span className="text-[11px] text-[#067d62] font-semibold">Secure</span>
        </div>
      </div>

      <div className="space-y-3 px-3 pt-3 pb-4">
        {/* Order total */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#232f3e] rounded-xl px-5 py-4 flex items-center justify-between"
        >
          <div>
            <p className="text-white/60 text-[11px] uppercase tracking-widest">Amount Due</p>
            <p className="text-white text-2xl font-black">₹204</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[11px]">Savings</p>
            <p className="text-[#febd69] font-bold text-sm">₹29 delivery waived</p>
          </div>
        </motion.div>

        {/* Payment methods */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl overflow-hidden"
        >
          {/* Amazon Pay */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#f0f2f2] active:bg-[#f8f8f8] ${selected === "amazon-pay" ? "bg-[#fffbf0]" : ""}`}
            onClick={() => setSelected("amazon-pay")}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === "amazon-pay" ? "border-[#ff9900] bg-[#ff9900]" : "border-[#c8cece]"}`}>
              {selected === "amazon-pay" && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-lg">💳</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">Amazon Pay</p>
              <p className="text-[11px] text-[#888c8c]">Balance: ₹0 · Get ₹50 cashback</p>
            </div>
          </button>

          {/* UPI */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#f0f2f2] active:bg-[#f8f8f8] ${selected === "upi" ? "bg-[#fffbf0]" : ""}`}
            onClick={() => setSelected("upi")}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === "upi" ? "border-[#ff9900] bg-[#ff9900]" : "border-[#c8cece]"}`}>
              {selected === "upi" && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-lg">📱</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">UPI</p>
              <p className="text-[11px] text-[#888c8c]">Google Pay, PhonePe, BHIM, Paytm</p>
            </div>
          </button>

          {selected === "upi" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="px-4 pb-3 pt-1 overflow-hidden"
            >
              <input
                type="text"
                placeholder="Enter UPI ID (e.g. priya@gpay)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full border border-[#e3e6e6] rounded-lg px-3 py-2.5 text-[13px] text-[#0f1111] outline-none focus:border-[#ff9900]"
              />
            </motion.div>
          )}

          {/* Credit / Debit Card */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#f0f2f2] active:bg-[#f8f8f8] ${selected === "card" ? "bg-[#fffbf0]" : ""}`}
            onClick={() => setSelected("card")}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === "card" ? "border-[#ff9900] bg-[#ff9900]" : "border-[#c8cece]"}`}>
              {selected === "card" && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-lg">🏦</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">Credit / Debit Card</p>
              <p className="text-[11px] text-[#888c8c]">Visa, Mastercard, RuPay</p>
            </div>
          </button>

          {/* Cash on Delivery */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 active:bg-[#f8f8f8] ${selected === "cod" ? "bg-[#fffbf0]" : ""}`}
            onClick={() => setSelected("cod")}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected === "cod" ? "border-[#ff9900] bg-[#ff9900]" : "border-[#c8cece]"}`}>
              {selected === "cod" && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className="text-lg">💵</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">Cash on Delivery</p>
              <p className="text-[11px] text-[#888c8c]">Pay when delivered</p>
            </div>
          </button>
        </motion.div>

        {/* Security note */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm">🔒</span>
          <p className="text-[11px] text-[#888c8c]">
            256-bit SSL encrypted · Safe & secure payments
          </p>
        </div>
      </div>

      {/* Pay button — sticky at bottom of scroll */}
      <div className="sticky bottom-0 bg-white border-t border-[#e3e6e6] px-4 py-3 z-40">
        <button
          onClick={handlePay}
          disabled={processing}
          className="w-full bg-[#ff9900] text-white font-black text-base py-4 rounded-xl active:bg-[#e68900] transition-colors shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ₹204 →`
          )}
        </button>
      </div>
    </div>
  )
}
