/**
 * Returns the backend API base URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_API_URL — explicit override (cloud deployments, custom domains)
 * 2. Same hostname as frontend + NEXT_PUBLIC_BACKEND_PORT (default 8000)
 *    → works on localhost, LAN IP, EC2 public IP, any host automatically
 */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "https" : "http"
    const port = process.env.NEXT_PUBLIC_BACKEND_PORT || "8000"
    // On production (port 80/443) backend is usually on the same host via reverse proxy
    const isStandardPort = window.location.port === "" || window.location.port === "80" || window.location.port === "443"
    if (isStandardPort) {
      // Behind reverse proxy — backend served from same origin at /api
      // Override with NEXT_PUBLIC_API_URL if on different host/port
      return `${proto}://${window.location.hostname}:${port}`
    }
    return `${proto}://${window.location.hostname}:${port}`
  }
  return "http://localhost:8000"
}

export function getWsUrl(): string {
  return getApiUrl().replace(/^http/, "ws")
}
