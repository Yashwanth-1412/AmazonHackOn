"use client"

import { useCallback, useRef, useEffect } from "react"
import { useRambleStore } from "@/store/ramble"
import { useCartStore } from "@/store/cart"
import { AudioCapture } from "@/lib/audio-capture"
import { toast } from "sonner"
import type { Product } from "@/types"

const WS_BASE = "ws://localhost:8000"

export function useRambleWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<AudioCapture | null>(null)
  const userRef = useRef("u001")

  const setSendJson = useRambleStore((s) => s.setSendJson)
  const setConnected = useRambleStore((s) => s.setConnected)
  const setConnecting = useRambleStore((s) => s.setConnecting)
  const setListening = useRambleStore((s) => s.setListening)
  const setPaused = useRambleStore((s) => s.setPaused)
  const setCanvas = useRambleStore((s) => s.setCanvas)
  const clearCanvas = useRambleStore((s) => s.clearCanvas)
  const reset = useRambleStore((s) => s.reset)

  const isConnected = useRambleStore((s) => s.isConnected)
  const isListening = useRambleStore((s) => s.isListening)

  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const sendJson = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    setSendJson(sendJson)
    return () => {
      setSendJson(null)
    }
  }, [sendJson, setSendJson])

  const startListening = useCallback(async () => {
    setConnecting(true)
    setListening(true)

    const ws = new WebSocket(
      `${WS_BASE}/api/ramble/stream?user_id=${userRef.current}`
    )

    ws.onopen = () => {
      setConnected(true)
      setConnecting(false)

      const audio = new AudioCapture({
        onChunk: (b64) => {
          sendJson({ type: "audio", audio: b64 })
        },
        onEnd: () => {
          sendJson({ type: "audio_end" })
        },
        onError: (err) => {
          toast.error("Microphone error: " + err)
          stopListening()
        },
      })

      audio
        .start()
        .then(() => {
          audioRef.current = audio
        })
        .catch(() => {
          setListening(false)
          setConnected(false)
          toast.error("Could not access microphone")
        })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case "status":
            if (data.status === "ready") {
              toast.success("Ramble active — start speaking!", {
                duration: 2000,
              })
            }
            break

          case "toast":
            if (data.kind === "success") toast.success(data.message, { duration: 2000 })
            else if (data.kind === "warning") toast.warning(data.message, { duration: 3000 })
            else if (data.kind === "error") toast.error(data.message, { duration: 3000 })
            else toast(data.message, { duration: 2000 })
            break

          case "canvas_update":
            setCanvas(data.canvas || [], data.total || 0)
            break

          case "product_found":
            toast.info(`Found: ${data.product}`, { duration: 1500 })
            break

          case "cart_action":
            if (data.action === "add_to_cart") {
              for (const item of data.items) {
                const product: Product = {
                  id: item.product_id,
                  name: item.name,
                  brand: item.brand,
                  variant: item.variant || "",
                  price: item.price,
                  mrp: item.price,
                  image: item.image || "",
                  category: (item.category || "grocery") as Product["category"],
                  inStock: true,
                  deliveryMins: 15,
                  tags: [],
                }
                for (let i = 0; i < item.quantity; i++) {
                  addItem(product)
                }
              }
              clearCanvas()
              openCart()
              toast.success(`Added ${data.items.length} items to cart!`)
            }
            break

          case "error":
            toast.error(data.message || "Ramble error")
            break
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      // Always release mic on disconnect
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current = null
      }
      setConnected(false)
      setListening(false)
      setPaused(false)
      wsRef.current = null
    }

    ws.onerror = () => {
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current = null
      }
      setConnected(false)
      setListening(false)
      toast.error("Ramble connection failed")
    }

    wsRef.current = ws
  }, [
    setConnected,
    setConnecting,
    setListening,
    setPaused,
    setCanvas,
    clearCanvas,
    sendJson,
    addItem,
    openCart,
  ])

  const stopListening = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.stop()
      audioRef.current = null
    }
    if (wsRef.current) {
      sendJson({ type: "stop" })
      wsRef.current.close()
      wsRef.current = null
    }
    setListening(false)
  }, [sendJson, setListening])

  const pauseListening = useCallback(() => {
    sendJson({ type: "pause" })
    setPaused(true)
    if (audioRef.current) {
      // Detach onEnd before stop so we don't send audio_end to backend
      // (pause doesn't mean turn complete — Gemini keeps the session)
      const audio = audioRef.current
      audioRef.current = null
      audio.stopSilent()  // stop mic without firing onEnd
    }
  }, [sendJson, setPaused])

  const resumeListening = useCallback(async () => {
    sendJson({ type: "resume" })
    setPaused(false)

    const audio = new AudioCapture({
      onChunk: (b64) => {
        sendJson({ type: "audio", audio: b64 })
      },
      onEnd: () => {
        sendJson({ type: "audio_end" })
      },
      onError: (err) => {
        toast.error("Microphone error: " + err)
      },
    })

    try {
      await audio.start()
      audioRef.current = audio
    } catch {
      toast.error("Could not access microphone")
    }
  }, [sendJson, setPaused])

  const sendRaw = useCallback((data: object) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }, [])

  const sendAction = useCallback(
    (action: "add_to_cart" | "discard") => {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "action", action }))
      } else {
        // fallback to sendJson
        sendJson({ type: "action", action })
      }
    },
    [sendJson]
  )

  useEffect(() => {
    return () => {
      // Clean up mic + WebSocket on component unmount
      if (audioRef.current) {
        audioRef.current.stop()
        audioRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  return {
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    sendAction,
    sendRaw,
    isConnected,
    isListening,
  }
}
