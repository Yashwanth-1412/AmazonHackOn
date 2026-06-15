"use client"

import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth"

export default function LogoutButton() {
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full py-3 text-sm font-medium text-[#c7511f] border border-[#c7511f] rounded-lg hover:bg-[#fef8f4] active:bg-[#fef2ec] cursor-pointer transition-colors"
    >
      Sign out
    </button>
  )
}
