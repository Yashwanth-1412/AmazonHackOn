import Header from "@/components/shared/Header"
import SearchBar from "@/components/shared/SearchBar"
import CategoryStrip from "@/components/home/CategoryStrip"
import RunningLowSection from "@/components/home/RunningLowSection"
import RunningLowNotification from "@/components/home/RunningLowNotification"
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

  const reminders = homeData?.reminders ?? []
  const runningLow = homeData?.running_low ?? []
  const frequentlyBought = (homeData?.frequently_bought ?? []).map(toProduct)
  const user = homeData?.user

  return (
    <>
      <Header userName={user?.name} location={user?.location} />

      {/* Running Low Notification Banner — "Order Now" adds to cart */}
      <RunningLowNotification />

      {/* Search bar */}
      <SearchBar />

      <div className="space-y-2">
        {/* Category icons strip */}
        <CategoryStrip />

        {/* AI Reminder Cards — context aggregator output */}
        {reminders.length > 0 && (
          <ReminderCards reminders={reminders} runningLowItems={runningLow} />
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
