import type { User } from "@/types"

export const USER: User = {
  id: "usr_001",
  name: "Priya Sharma",
  phone: "+91 98765 43210",
  location: "Bangalore",
  address: "A-1101, A Block, Sri Aditya Athena, Marathahalli, Bangalore - 560037",
  householdSize: 3,
  monthlySpend: 2400,
  totalOrders: 47,
  memberSince: "2022-06-15",
  insights: [
    { id: "i1", icon: "🥛", label: "Top Category", value: "Dairy & Eggs" },
    { id: "i2", icon: "📅", label: "Order Frequency", value: "Every 7 days" },
    { id: "i3", icon: "💰", label: "Avg Order Value", value: "₹340" },
    { id: "i4", icon: "⚡", label: "Fastest Delivery", value: "6 minutes" },
  ],
}

export const CATEGORIES = [
  { id: "beverages",       label: "Beverages",    icon: "🥤" },
  { id: "snacks",          label: "Snacks",        icon: "🍟" },
  { id: "dairy",           label: "Dairy",         icon: "🥛" },
  { id: "fruits-vegetables", label: "Veggies",     icon: "🥦" },
  { id: "bakery",          label: "Bakery",        icon: "🍞" },
  { id: "grocery",         label: "Staples",       icon: "🛒" },
  { id: "personal-care",   label: "Personal Care", icon: "🧴" },
  { id: "household",       label: "Household",     icon: "🧹" },
  { id: "pharmacy",        label: "Pharmacy",      icon: "💊" },
]

export const PROMO_BANNERS = [
  {
    id: "b1",
    title: "Monsoon Essentials",
    subtitle: "Stock up before it pours",
    badge: "UP TO 40% OFF",
    bg: "from-blue-400 to-blue-600",
    emoji: "🌧️",
  },
  {
    id: "b2",
    title: "Back to School",
    subtitle: "Powered by Bournvita & Gritzo",
    badge: "UP TO 80% OFF",
    bg: "from-sky-300 to-indigo-400",
    emoji: "🎒",
  },
  {
    id: "b3",
    title: "Weekend Feast",
    subtitle: "Fresh veggies & dairy delivered",
    badge: "FREE DELIVERY",
    bg: "from-green-400 to-emerald-600",
    emoji: "🥗",
  },
]
