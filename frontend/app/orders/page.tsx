export default function OrdersPage() {
  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-white mb-2">Order Again</h2>
      <p className="text-sm text-[#666] mb-6">Your routines & past orders</p>

      {/* Routines — coming from API */}
      <section className="mb-6">
        <p className="text-xs text-[#555] uppercase tracking-widest mb-3 font-semibold">
          Your Routines
        </p>
        <div className="h-32 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <span className="text-[#444] text-sm">Routine Mapper loads here</span>
        </div>
      </section>

      {/* Order history — coming from API */}
      <section>
        <p className="text-xs text-[#555] uppercase tracking-widest mb-3 font-semibold">
          Previously Bought
        </p>
        <div className="h-48 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <span className="text-[#444] text-sm">Order history loads here</span>
        </div>
      </section>
    </div>
  )
}
