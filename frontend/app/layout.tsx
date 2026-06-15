import type { Metadata } from "next"
import { Toaster } from "sonner"
import BottomNav from "@/components/shared/BottomNav"
import CartSheet from "@/components/cart/CartSheet"
import { RambleButton, RambleCanvas } from "@/components/voice"
import VoiceWrapper from "@/components/voice/VoiceWrapper"
import "./globals.css"

export const metadata: Metadata = {
  title: "Amazon Now",
  description: "Delivered in minutes",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="font-sans bg-[#f0f2f2]">
        {/* Phone frame */}
        <div className="flex justify-center min-h-screen">
          <div className="w-full max-w-[430px] min-h-screen bg-[#f0f2f2] relative flex flex-col shadow-2xl">
            <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
              {children}
            </main>
            <BottomNav />

            {/* Ramble Voice Shopping */}
            <div className="fixed bottom-[72px] right-4 z-[60] max-w-[430px]">
              <RambleCanvas />
            </div>
            <div className="fixed bottom-20 right-6 z-[60]">
              <RambleButton />
            </div>

            {/* Voice Shopping Feature — only on home page */}
            <VoiceWrapper />

            <CartSheet />
          </div>
        </div>

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#232f3e",
              border: "1px solid #37475a",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  )
}
