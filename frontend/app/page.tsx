import Header from "@/components/shared/Header"
import CategoryStrip from "@/components/home/CategoryStrip"
import RunningLowSection from "@/components/home/RunningLowSection"
import ReminderCards from "@/components/home/ReminderCards"
import FrequentlyBought from "@/components/home/FrequentlyBought"
import PromoBanner from "@/components/home/PromoBanner"
import { getHomeData, toProduct } from "@/lib/api"

export default async function HomePage() {
  // Fetch everything in one shot — server side
  let homeData
  try {
    homeData = await getHomeData("u001")
  } catch {
    homeData = null
  }

  const reminders       = homeData?.reminders        ?? []
  const runningLow      = homeData?.running_low       ?? []
  const frequentlyBought = (homeData?.frequently_bought ?? []).map(toProduct)
  const user            = homeData?.user

  return (
    <>
      <Header userName={user?.name} location={user?.location} />

      {/* Search bar */}
      <div className="bg-white px-3 py-2 border-b border-[#e3e6e6]">
        <div className="flex items-center gap-2.5 bg-[#f0f2f2] rounded-full px-4 py-2.5 border border-[#e3e6e6]">
          <span className="text-[#888c8c] text-base">🔍</span>
          <span className="text-[#888c8c] text-sm">Search "milk", "pooja thali"…</span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Category icons strip */}
        <CategoryStrip />

        {/* AI Reminder Cards — context aggregator output */}
        {reminders.length > 0 && (
          <ReminderCards reminders={reminders} />
        )}

        {/* Running Low — consumption engine output */}
        {runningLow.length > 0 && (
          <RunningLowSection items={runningLow} />
        )}

        {/* Promotional banner */}
        <div className="bg-white pt-2 pb-3">
          <PromoBanner />
        </div>

        {/* Frequently Bought */}
        {frequentlyBought.length > 0 && (
          <FrequentlyBought products={frequentlyBought} />
        )}
      </div>
    </>
  )
}
