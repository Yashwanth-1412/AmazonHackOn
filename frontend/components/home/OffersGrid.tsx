export default function OffersGrid() {
  return (
    <div className="bg-white px-3 py-4">
      {/* Cashback tiers */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Assured cashback */}
        <div className="col-span-1 border border-[#e3e6e6] rounded-xl p-3 flex flex-col justify-between gap-1">
          <span className="text-[10px] font-bold text-[#232f3e] leading-tight">
            Assured cashback
          </span>
          <span className="text-[10px] text-[#067d62] font-black italic">
            every time
          </span>
        </div>

        {/* ₹50 above ₹399 */}
        <div className="border border-[#e3e6e6] rounded-xl p-3 flex flex-col items-center justify-center">
          <span className="text-[18px] font-black text-[#232f3e]">₹50</span>
          <span className="text-[9px] text-[#565959]">above ₹399</span>
        </div>

        {/* ₹100 above ₹749 */}
        <div className="border-2 border-[#febd69] rounded-xl p-3 flex flex-col items-center justify-center bg-[#fffbf0]">
          <span className="text-[18px] font-black text-[#ff9900]">₹100</span>
          <span className="text-[9px] text-[#565959]">above ₹749</span>
        </div>
      </div>

      {/* Zero fees + free delivery */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-[#e3e6e6] rounded-xl p-3 flex items-center gap-2">
          <span className="text-xl">🪙</span>
          <div>
            <p className="text-[11px] font-black text-[#232f3e]">Zero fees</p>
            <p className="text-[10px] text-[#565959]">on all orders</p>
          </div>
        </div>
        <div className="border border-[#e3e6e6] rounded-xl p-3 flex items-center gap-2">
          <span className="text-xl">🛵</span>
          <div>
            <p className="text-[11px] font-black text-[#232f3e]">Free Delivery</p>
            <p className="text-[10px] text-[#565959]">above ₹149 · Prime</p>
          </div>
        </div>
      </div>
    </div>
  )
}
