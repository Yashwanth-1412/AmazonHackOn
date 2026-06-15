import { create } from "zustand"

// Demo user — for hackathon this is fixed; replace with real auth in production
export const DEMO_USER_ID = process.env.NEXT_PUBLIC_USER_ID || "u001"

interface AuthStore {
  isAuthenticated: boolean
  userId: string
  login: () => void
  logout: () => void
}

function getInitialAuth(): boolean {
  if (typeof window === "undefined") return false
  return document.cookie.includes("admin-session=true")
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  userId: DEMO_USER_ID,

  login: () => {
    document.cookie =
      "admin-session=true; path=/; max-age=604800; samesite=lax"
    set({ isAuthenticated: true })
  },

  logout: () => {
    document.cookie = "admin-session=; path=/; max-age=0"
    set({ isAuthenticated: false })
  },
}))

// Hydrate on client side only
if (typeof window !== "undefined") {
  const isAuth = getInitialAuth()
  if (isAuth) {
    useAuthStore.setState({ isAuthenticated: true })
  }
}
