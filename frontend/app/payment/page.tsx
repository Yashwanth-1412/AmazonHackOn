"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Zap } from "lucide-react"

type PayMethod = "upi" | "card" | "cod" | "amazon-pay"

export default function PaymentPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<PayMethod>("upi")
  const [upiId, setUpiId] = useState("")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePay = () => {
    setProcessing(true)
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false)
      setSuccess(true)
      // Navigate to confirmation after a moment
      setTimeout(() => {
        router.push("/orders")
      }, 2200)
    }, 1800)
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0f2f2] px-8 gap-5">
        <div className="w-20 h-20 bg-[#067d62] rounded-full flex items-center justify-center shadow-xl">
          <Check size={40} className="text-white" strokeWidth={3} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-[#0f1111]">Order Placed!</h2>
          <p className="text-[#565959] mt-1">Your items are on their way</p>
        </div>
        <div className="bg-white rounded-2xl px-6 py-4 flex items-center gap-3 w-full shadow-sm">
          <Zap size={20} className="text-[#f0c040]" />
          <div>
            <p className="font-bold text-[#0f1111]">Arriving in 12 minutes</p>
            <p className="text-[12px] text-[#565959]">
              A-1101, A Block, Sri Aditya Athena
            </p>
          </div>
        </div>
        <p className="text-[#888c8c] text-sm">Redirecting to your orders...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f0f2f2]">
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

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-36 px-3 pt-3">
        {/* Order total */}
        <div className="bg-[#232f3e] rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[11px] uppercase tracking-widest">Amount Due</p>
            <p className="text-white text-2xl font-black">₹204</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[11px]">Savings</p>
            <p className="text-[#febd69] font-bold text-sm">₹29 delivery waived</p>
          </div>
        </div>

        {/* Amazon Pay */}
        <div className="bg-white rounded-xl overflow-hidden">
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#f0f2f2] active:bg-[#f8f8f8] ${
              selected === "amazon-pay" ? "bg-[#fffbf0]" : ""
            }`}
            onClick={() => setSelected("amazon-pay")}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === "amazon-pay"
                  ? "border-[#ff9900] bg-[#ff9900]"
                  : "border-[#c8cece]"
              }`}
            >
              {selected === "amazon-pay" && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </div>
            <span className="text-lg">💳</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">Amazon Pay</p>
              <p className="text-[11px] text-[#888c8c]">Balance: ₹0 · Get ₹50 cashback</p>
            </div>
          </button>

          {/* UPI */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#f0f2f2] active:bg-[#f8f8f8] ${
              selected === "upi" ? "bg-[#fffbf0]" : ""
            }`}
            onClick={() => setSelected("upi")}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === "upi"
                  ? "border-[#ff9900] bg-[#ff9900]"
                  : "border-[#c8cece]"
              }`}
            >
              {selected === "upi" && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </div>
            <span className="text-lg">📱</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">UPI</p>
              <p className="text-[11px] text-[#888c8c]">Google Pay, PhonePe, BHIM, Paytm</p>
            </div>
          </button>

          {selected === "upi" && (
            <div className="px-4 pb-3 pt-1">
              <input
                type="text"
                placeholder="Enter UPI ID (e.g. priya@gpay)"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full border border-[#e3e6e6] rounded-lg px-3 py-2.5 text-[13px] text-[#0f1111] outline-none focus:border-[#ff9900]"
              />
            </div>
          )}

          {/* Credit / Debit Card */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 border-b border-[#f0f2f2] active:bg-[#f8f8f8] ${
              selected === "card" ? "bg-[#fffbf0]" : ""
            }`}
            onClick={() => setSelected("card")}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === "card"
                  ? "border-[#ff9900] bg-[#ff9900]"
                  : "border-[#c8cece]"
              }`}
            >
              {selected === "card" && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </div>
            <span className="text-lg">🏦</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">Credit / Debit Card</p>
              <p className="text-[11px] text-[#888c8c]">Visa, Mastercard, RuPay</p>
            </div>
          </button>

          {/* Cash on Delivery */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-4 active:bg-[#f8f8f8] ${
              selected === "cod" ? "bg-[#fffbf0]" : ""
            }`}
            onClick={() => setSelected("cod")}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selected === "cod"
                  ? "border-[#ff9900] bg-[#ff9900]"
                  : "border-[#c8cece]"
              }`}
            >
              {selected === "cod" && (
                <Check size={10} className="text-white" strokeWidth={3} />
              )}
            </div>
            <span className="text-lg">💵</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-[#0f1111]">Cash on Delivery</p>
              <p className="text-[11px] text-[#888c8c]">Pay when delivered</p>
            </div>
          </button>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm">🔒</span>
          <p className="text-[11px] text-[#888c8c]">
            256-bit SSL encrypted · Safe & secure payments
          </p>
        </div>
      </div>

      {/* Pay button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-[#e3e6e6] px-4 py-3">
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
