"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const CATEGORIES = [
  {
    id: "beverages",
    label: "Beverages",
    color: "#4a90d9",
    bg: "#eef5fc",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="8" y="4" width="12" height="20" rx="3" fill="#4a90d9" opacity="0.15"/>
        <rect x="8" y="4" width="12" height="20" rx="3" stroke="#4a90d9" strokeWidth="1.6"/>
        <path d="M11 4v-1.5a1 1 0 012 0V4" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M15 4v-1.5a1 1 0 012 0V4" stroke="#4a90d9" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M8 10h12" stroke="#4a90d9" strokeWidth="1.3" strokeDasharray="2 2"/>
        <ellipse cx="20" cy="12" rx="2" ry="1.5" fill="#4a90d9" opacity="0.3"/>
      </svg>
    ),
  },
  {
    id: "snacks",
    label: "Snacks",
    color: "#e07b3a",
    bg: "#fdf2ea",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <ellipse cx="14" cy="18" rx="8" ry="5" fill="#e07b3a" opacity="0.15"/>
        <ellipse cx="14" cy="18" rx="8" ry="5" stroke="#e07b3a" strokeWidth="1.6"/>
        <path d="M6 18V14c0-2.8 3.6-5 8-5s8 2.2 8 5v4" stroke="#e07b3a" strokeWidth="1.6"/>
        <ellipse cx="14" cy="14" rx="8" ry="3.5" fill="#e07b3a" opacity="0.2" stroke="#e07b3a" strokeWidth="1.4"/>
        <circle cx="11" cy="13.5" r="1" fill="#e07b3a" opacity="0.6"/>
        <circle cx="15" cy="15" r="0.8" fill="#e07b3a" opacity="0.6"/>
        <circle cx="13" cy="12" r="0.7" fill="#e07b3a" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: "dairy",
    label: "Dairy",
    color: "#5bc4c0",
    bg: "#eefaf9",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="9" y="8" width="10" height="14" rx="2" fill="#5bc4c0" opacity="0.15" stroke="#5bc4c0" strokeWidth="1.6"/>
        <path d="M9 12h10" stroke="#5bc4c0" strokeWidth="1.3"/>
        <path d="M11 6l-2 2h10l-2-2H11z" fill="#5bc4c0" opacity="0.4" stroke="#5bc4c0" strokeWidth="1.4" strokeLinejoin="round"/>
        <text x="11.5" y="18" fontSize="5" fill="#5bc4c0" fontWeight="700" fontFamily="sans-serif">MILK</text>
      </svg>
    ),
  },
  {
    id: "fruits-vegetables",
    label: "Veggies",
    color: "#4caf6e",
    bg: "#edf7f1",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 22C10 22 7 18.5 7 14.5S10 8 14 8s7 3 7 6.5S18 22 14 22z" fill="#4caf6e" opacity="0.2" stroke="#4caf6e" strokeWidth="1.6"/>
        <path d="M14 8c0 0-1-4 2-5" stroke="#4caf6e" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M11 10c-2-1.5-4-1-4.5 1" stroke="#4caf6e" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M17 10c2-1.5 4-1 4.5 1" stroke="#4caf6e" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M10 16c0 0 2-1 4 0s4 0 4 0" stroke="#4caf6e" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "bakery",
    label: "Bakery",
    color: "#c9843a",
    bg: "#faf0e6",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="5" y="13" width="18" height="9" rx="2" fill="#c9843a" opacity="0.15" stroke="#c9843a" strokeWidth="1.6"/>
        <path d="M5 16h18" stroke="#c9843a" strokeWidth="1.2" strokeDasharray="3 2"/>
        <path d="M5 19h18" stroke="#c9843a" strokeWidth="1.2" strokeDasharray="3 2"/>
        <path d="M8 13C8 10 10.5 8 14 8s6 2 6 5" fill="#c9843a" opacity="0.2" stroke="#c9843a" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    id: "grocery",
    label: "Staples",
    color: "#8b6bbf",
    bg: "#f2eefb",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 7h2l2.5 10h9l2.5-7H9" stroke="#8b6bbf" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="21" r="1.5" fill="#8b6bbf"/>
        <circle cx="18" cy="21" r="1.5" fill="#8b6bbf"/>
        <path d="M9 7l1.5 6" stroke="#8b6bbf" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "personal-care",
    label: "Personal Care",
    color: "#d45c8a",
    bg: "#fdeef5",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="10" y="5" width="8" height="17" rx="3" fill="#d45c8a" opacity="0.15" stroke="#d45c8a" strokeWidth="1.6"/>
        <rect x="12" y="3" width="4" height="3" rx="1" fill="#d45c8a" opacity="0.4" stroke="#d45c8a" strokeWidth="1.3"/>
        <line x1="10" y1="11" x2="18" y2="11" stroke="#d45c8a" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    id: "household",
    label: "Household",
    color: "#5b8dee",
    bg: "#eef2fd",
    svg: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 5L4 12h3v9h14v-9h3L14 5z" fill="#5b8dee" opacity="0.15" stroke="#5b8dee" strokeWidth="1.6" strokeLinejoin="round"/>
        <rect x="11" y="16" width="6" height="5" rx="1" fill="#5b8dee" opacity="0.3" stroke="#5b8dee" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

export default function CategoryStrip() {
  return (
    <div className="px-4 py-3" style={{ background: "linear-gradient(180deg, #faf8f4 0%, #f7f4ef 100%)" }}>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <Link
              href={`/products?category=${cat.id}`}
              className="flex flex-col items-center gap-1.5 min-w-[58px] active:opacity-70"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                whileHover={{ y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-[58px] h-[58px] rounded-2xl flex items-center justify-center border"
                style={{
                  background: cat.bg,
                  borderColor: `${cat.color}22`,
                  boxShadow: `0 2px 8px ${cat.color}18, inset 0 1px 0 rgba(255,255,255,0.9)`,
                }}
              >
                {cat.svg}
              </motion.div>
              <span className="text-[10.5px] text-[#3a3530] font-medium text-center leading-tight whitespace-nowrap tracking-tight">
                {cat.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
