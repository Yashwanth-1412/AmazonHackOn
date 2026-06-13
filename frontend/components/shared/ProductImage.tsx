/**
 * ProductImage — renders a crisp SVG icon for any product.
 * Falls back gracefully: logo_url → category SVG icon
 * No broken images, no emojis — clean for hackathon demo.
 */

interface Props {
  name: string
  brand?: string
  category: string
  logoUrl?: string
  size?: number
  className?: string
}

// Category → { bg, fg, path (SVG path data) }
const CATEGORY_SVG: Record<string, { bg: string; fg: string; icon: string }> = {
  dairy: {
    bg: "#e8f4fd", fg: "#1a6fa8",
    icon: `<path d="M8 3h8l1 4H7L8 3z" fill="currentColor" opacity=".3"/>
           <rect x="6" y="7" width="12" height="13" rx="2" fill="currentColor" opacity=".15"/>
           <path d="M9 11c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v1H9v-1z" fill="currentColor"/>
           <circle cx="12" cy="15" r="2.5" fill="currentColor"/>`,
  },
  bakery: {
    bg: "#fdf3e3", fg: "#c47d1a",
    icon: `<ellipse cx="12" cy="14" rx="7" ry="5" fill="currentColor" opacity=".2"/>
           <path d="M5 12c0-3.3 3.1-6 7-6s7 2.7 7 6" fill="currentColor" opacity=".4"/>
           <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4" fill="currentColor" opacity=".6"/>
           <circle cx="12" cy="12" r="2" fill="currentColor"/>`,
  },
  grocery: {
    bg: "#f0faf0", fg: "#2d7a3a",
    icon: `<rect x="5" y="8" width="14" height="11" rx="2" fill="currentColor" opacity=".2"/>
           <path d="M8 8V6a4 4 0 018 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/>
           <circle cx="9.5" cy="14" r="1" fill="currentColor"/>
           <circle cx="14.5" cy="14" r="1" fill="currentColor"/>`,
  },
  snacks: {
    bg: "#fff4f0", fg: "#d94f20",
    icon: `<path d="M12 5l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="currentColor" opacity=".25"/>
           <circle cx="12" cy="13" r="5" fill="currentColor" opacity=".2"/>
           <path d="M9 13c1-1.5 2-2 3-2s2 .5 3 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  },
  beverages: {
    bg: "#f0f8ff", fg: "#0070c0",
    icon: `<path d="M8 5h8l-1 3H9L8 5z" fill="currentColor" opacity=".3"/>
           <rect x="9" y="8" width="6" height="10" rx="1.5" fill="currentColor" opacity=".2"/>
           <path d="M15 11h2a1 1 0 010 2h-2" fill="currentColor" opacity=".5"/>
           <rect x="10" y="10" width="4" height="2" rx="1" fill="currentColor" opacity=".6"/>`,
  },
  "fruits-vegetables": {
    bg: "#f2fdf0", fg: "#3a8c2a",
    icon: `<ellipse cx="12" cy="15" rx="5" ry="4" fill="currentColor" opacity=".2"/>
           <path d="M12 11 C10 8 7 8 7 11" fill="currentColor" opacity=".4"/>
           <path d="M12 11 C14 8 17 8 17 11" fill="currentColor" opacity=".4"/>
           <line x1="12" y1="7" x2="12" y2="11" stroke="currentColor" stroke-width="1.5"/>`,
  },
  household: {
    bg: "#f5f0ff", fg: "#6b3faa",
    icon: `<path d="M12 4L4 10h2v9h4v-5h4v5h4v-9h2z" fill="currentColor" opacity=".25"/>
           <rect x="10" y="14" width="4" height="5" rx="0.5" fill="currentColor" opacity=".5"/>`,
  },
  "personal-care": {
    bg: "#fff0f8", fg: "#c0197a",
    icon: `<circle cx="12" cy="9" r="4" fill="currentColor" opacity=".2"/>
           <path d="M8 15c0-2.2 1.8-4 4-4s4 1.8 4 4v2H8v-2z" fill="currentColor" opacity=".3"/>
           <circle cx="12" cy="9" r="2" fill="currentColor" opacity=".7"/>`,
  },
  pharmacy: {
    bg: "#f0fff4", fg: "#0f7c3a",
    icon: `<rect x="10" y="6" width="4" height="12" rx="1" fill="currentColor" opacity=".3"/>
           <rect x="6" y="10" width="12" height="4" rx="1" fill="currentColor" opacity=".3"/>
           <circle cx="12" cy="12" r="2" fill="currentColor" opacity=".6"/>`,
  },
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 55%, 55%)`
}

export default function ProductImage({ name, brand, category, logoUrl, size = 80, className = "" }: Props) {
  const config = CATEGORY_SVG[category] ?? CATEGORY_SVG.grocery
  const accentColor = brand ? stringToColor(brand) : config.fg

  // If we have a real logo URL, try it with SVG fallback on error
  if (logoUrl && logoUrl.startsWith("http")) {
    return (
      <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          className="object-contain"
          onError={(e) => {
            const target = e.currentTarget
            target.style.display = "none"
            const svg = target.nextElementSibling as HTMLElement
            if (svg) svg.style.display = "block"
          }}
        />
        {/* SVG shown only when img fails */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: accentColor, display: "none", position: "absolute" }}
          aria-label={name}
          dangerouslySetInnerHTML={{ __html: config.icon }}
        />
      </div>
    )
  }

  // Generate SVG icon (plain fallback, no logo)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color: accentColor }}
      aria-label={name}
      dangerouslySetInnerHTML={{ __html: config.icon }}
    />
  )
}
