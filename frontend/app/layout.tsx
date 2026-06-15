import type { Metadata } from "next"
import Script from "next/script"
import { Toaster } from "sonner"
import BottomNav from "@/components/shared/BottomNav"
import AuthShell from "@/components/shared/AuthShell"
import CartSheet from "@/components/cart/CartSheet"
import { RambleButton, RambleCanvas, VisionButton } from "@/components/voice"
import "./globals.css"

export const metadata: Metadata = {
  title: "Amazon Now",
  description: "Delivered in minutes",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="font-sans bg-[#f7f4ef]">
        {/* Phone frame */}
        <div className="flex justify-center min-h-screen">
          <div className="w-full max-w-[430px] min-h-screen bg-[#f7f4ef] relative flex flex-col shadow-2xl">
            <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
              {children}
            </main>

            <AuthShell>
              <BottomNav />

              {/* Ramble Voice + Vision — positioned above Profile tab */}
              <div className="fixed bottom-[128px] z-[60] left-1/2 -translate-x-1/2 w-full max-w-[430px] pointer-events-none">
                <div className="flex justify-end pr-[22px] pointer-events-auto">
                  <RambleCanvas />
                </div>
              </div>
              <div className="fixed bottom-[58px] z-[60] left-1/2 -translate-x-1/2 w-full max-w-[430px] pointer-events-none">
                <div className="flex justify-end items-center gap-3 pr-[22px] pointer-events-auto">
                  <VisionButton />
                  <RambleButton />
                </div>
              </div>

              <CartSheet />
            </AuthShell>
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
