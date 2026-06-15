"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { User } from "lucide-react"
import { useAuthStore } from "@/store/auth"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const handleLogin = () => {
    login()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* Amazon-style dark header bar */}
      <div className="w-full bg-[#232f3e] py-4 flex justify-center items-center gap-1">
        <span className="text-2xl font-black text-white tracking-tight">amazon</span>
        <span className="bg-[#00a0dc] text-white text-xs font-black px-1.5 py-0.5 rounded-sm">
          now
        </span>
      </div>

      {/* Sign-in card */}
      <div className="mt-10 w-full max-w-[350px] px-4">
        <div className="border border-[#ddd] rounded-lg p-6 shadow-sm">
          <h1 className="text-[28px] font-normal text-[#111] mb-2">Sign in</h1>
          <p className="text-sm text-[#565959] mb-6">Welcome back</p>

          {/* Admin profile - display only */}
          <div className="w-full flex items-center gap-4 p-4 border border-[#ddd] rounded-lg">
            <div className="w-14 h-14 rounded-full bg-[#ff9900] flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-base font-bold text-[#0f1111]">admin</span>
            </div>
          </div>

          {/* Amazon-style sign-in button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            className="w-full mt-6 py-2.5 rounded-lg bg-gradient-to-b from-[#f7ca00] to-[#f0b800] text-sm font-medium text-[#0f1111] border border-[#a88734] shadow-sm hover:from-[#f0b800] hover:to-[#e8a900] cursor-pointer"
          >
            Sign in as admin
          </motion.button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-px bg-[#ddd]" />
          <span className="text-xs text-[#767676]">Amazon Now Demo</span>
          <div className="flex-1 h-px bg-[#ddd]" />
        </div>
      </div>
    </div>
  )
}
