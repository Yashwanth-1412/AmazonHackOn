export default function ProfilePage() {
  return (
    <div className="px-4 py-6">
      {/* User info — coming from API */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-[#1a2e2e] border border-[#2a2a2a] flex items-center justify-center mb-3">
          <span className="text-3xl">👤</span>
        </div>
        <p className="text-lg font-bold text-white">Your Account</p>
        <p className="text-sm text-[#666]">Loading...</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {["Your Orders", "Amazon Pay", "Need Help?"].map((label) => (
          <div
            key={label}
            className="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col items-center gap-2 border border-[#2a2a2a]"
          >
            <div className="w-8 h-8 bg-[#2a2a2a] rounded-full" />
            <span className="text-[11px] text-[#888] text-center font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* Shopping DNA — coming from API */}
      <section>
        <p className="text-xs text-[#555] uppercase tracking-widest mb-3 font-semibold">
          Your Shopping DNA
        </p>
        <div className="h-48 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
          <span className="text-[#444] text-sm">AI insights load here</span>
        </div>
      </section>
    </div>
  )
}
