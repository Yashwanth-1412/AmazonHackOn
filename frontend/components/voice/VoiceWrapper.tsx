"use client"

import { usePathname } from "next/navigation"
import VoiceButton from "./VoiceButton"
import VoicePopup from "./VoicePopup"

/**
 * Wraps the voice button and popup so they only render on the home page.
 * Voice button is centered above the "Profile" nav item (last of 4 items).
 */
export default function VoiceWrapper() {
  const pathname = usePathname()

  // Only show voice features on the home page
  if (pathname !== "/") return null

  return (
    <>
      {/* Voice popup — positioned above the button */}
      <div className="fixed bottom-[128px] z-[60] left-1/2 -translate-x-1/2 w-full max-w-[430px] pointer-events-none">
        <div className="flex justify-end pr-[22px] pointer-events-auto">
          <VoicePopup />
        </div>
      </div>
      {/* Voice button — aligned above the Profile tab */}
      <div className="fixed bottom-[58px] z-[60] left-1/2 -translate-x-1/2 w-full max-w-[430px] pointer-events-none">
        <div className="flex justify-end pr-[22px] pointer-events-auto">
          <VoiceButton />
        </div>
      </div>
    </>
  )
}
