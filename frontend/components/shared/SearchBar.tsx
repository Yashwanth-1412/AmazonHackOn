"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X, ArrowLeft } from "lucide-react"

interface SearchBarProps {
  /** If true, renders as a full input (used on search/products page). Otherwise renders as a clickable pill. */
  expanded?: boolean
  /** Initial value when in expanded mode */
  initialQuery?: string
  /** Placeholder text */
  placeholder?: string
}

export default function SearchBar({
  expanded = false,
  initialQuery = "",
  placeholder = 'Search "milk", "pooja thali"…',
}: SearchBarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(expanded)
  const [query, setQuery] = useState(initialQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSearch = (value: string) => {
    const trimmed = value.trim()
    if (trimmed) {
      router.push(`/products?search=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleClear = () => {
    setQuery("")
    inputRef.current?.focus()
  }

  const handleClose = () => {
    setIsOpen(false)
    setQuery("")
  }

  // Compact pill mode — tap to expand
  if (!isOpen && !expanded) {
    return (
      <div className="bg-white px-3 py-2 border-b border-[#e3e6e6]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-2.5 bg-[#f0f2f2] rounded-full px-4 py-2.5 border border-[#e3e6e6] text-left"
        >
          <Search size={16} className="text-[#888c8c] shrink-0" />
          <span className="text-[#888c8c] text-sm">{placeholder}</span>
        </button>
      </div>
    )
  }

  // Expanded input mode
  return (
    <div className="bg-white px-3 py-2 border-b border-[#e3e6e6]">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {!expanded && (
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-[#565959] active:bg-[#f0f2f2]"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="flex-1 flex items-center gap-2.5 bg-[#f0f2f2] rounded-full px-4 py-2.5 border border-[#e3e6e6] focus-within:border-[#ff9900] focus-within:ring-1 focus-within:ring-[#ff9900] transition-all">
          <Search size={16} className="text-[#888c8c] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-[#0f1111] placeholder:text-[#888c8c] outline-none"
            autoComplete="off"
            enterKeyHint="search"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={handleClear}
                className="p-0.5 rounded-full text-[#565959] active:bg-[#e3e6e6]"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <button
          type="submit"
          disabled={!query.trim()}
          className="px-3 py-2 text-sm font-semibold text-[#ff9900] disabled:text-[#ccc] active:opacity-70"
        >
          Search
        </button>
      </form>
    </div>
  )
}
