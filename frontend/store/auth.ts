import { create } from "zustand"

interface AuthStore {
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

function getInitialAuth(): boolean {
  if (typeof window === "undefined") return false
  return document.cookie.includes("admin-session=true")
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,

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
