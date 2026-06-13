import { getHomeData } from "@/lib/api"

export default async function ProfilePage() {
  const data = await getHomeData("u001").catch(() => null)
  const user = data?.user

  const insights = [
    { icon: "📦", label: "Household size", value: `${user?.household_size ?? "–"} members` },
    { icon: "🏠", label: "Household type", value: user?.household_type ?? "–" },
    { icon: "📍", label: "Location", value: user?.location ?? "–" },
    { icon: "🤖", label: "AI reminders active", value: `${data?.reminders?.length ?? 0} items` },
    { icon: "⚡", label: "Running low alerts", value: `${data?.running_low?.length ?? 0} items` },
    { icon: "🛒", label: "Frequently bought", value: `${data?.frequently_bought?.length ?? 0} products` },
  ]

  return (
    <div className="bg-[#f0f2f2] min-h-screen">
      {/* Avatar + name */}
      <div className="bg-white pt-8 pb-5 flex flex-col items-center border-b border-[#e3e6e6]">
        <div className="w-20 h-20 rounded-full bg-[#232f3e] flex items-center justify-center mb-3 shadow-md">
          <span className="text-3xl">👤</span>
        </div>
        <p className="text-lg font-bold text-[#0f1111]">{user?.name ?? "Your Account"}</p>
        <p className="text-sm text-[#565959]">{user?.location ?? ""}</p>
      </div>

      {/* Quick actions */}
      <div className="bg-white mt-2 px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "📦", label: "Your Orders" },
            { icon: "💰", label: "Amazon Pay" },
            { icon: "💬", label: "Need Help?" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="bg-[#f0f2f2] rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer active:bg-[#e3e6e6]"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-[11px] text-[#232f3e] font-semibold text-center">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shopping DNA */}
      <div className="bg-white mt-2 px-4 py-4">
        <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-3 font-semibold">
          Your Shopping DNA
        </p>
        <div className="space-y-3">
          {insights.map(({ icon, label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[#f0f2f2] last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{icon}</span>
                <span className="text-[13px] text-[#565959]">{label}</span>
              </div>
              <span className="text-[13px] font-semibold text-[#0f1111]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white mt-2 px-4 py-4">
        <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-3 font-semibold">
          Settings
        </p>
        {["Address Book", "Notification Preferences", "Privacy Settings", "App Appearance"].map((item) => (
          <div key={item} className="flex items-center justify-between py-3 border-b border-[#f0f2f2] last:border-0">
            <span className="text-[13px] text-[#0f1111]">{item}</span>
            <span className="text-[#888c8c]">›</span>
          </div>
        ))}
      </div>

      <div className="h-20" />
    </div>
  )
}
