"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated && pathname !== "/login") {
      router.replace("/login")
    }
  }, [isAuthenticated, pathname, router])

  // On login page or not authenticated — hide nav chrome
  if (!isAuthenticated || pathname === "/login") {
    return null
  }

  return <>{children}</>
}
