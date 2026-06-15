"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CATEGORIES } from "@/data/user"

export default function CategoryStrip() {
  return (
    <div className="bg-white px-3 py-3">
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link
              href={`/products?category=${cat.id}`}
              className="flex flex-col items-center gap-1.5 min-w-[60px] active:opacity-70"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-xl bg-[#f0f2f2] flex items-center justify-center text-2xl shadow-sm"
              >
                {cat.icon}
              </motion.div>
              <span className="text-[11px] text-[#232f3e] font-medium text-center leading-tight whitespace-nowrap">
                {cat.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
