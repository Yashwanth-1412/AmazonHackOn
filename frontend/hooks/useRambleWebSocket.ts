"use client"

import { useCallback, useEffect } from "react"
import { useRambleStore } from "@/store/ramble"
import { useCartStore } from "@/store/cart"
import { AudioCapture } from "@/lib/audio-capture"
import { toast } from "sonner"
import type { Product } from "@/types"

const WS_BASE = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") ?? "ws://localhost:8000"

// ── Module-level singletons ────────────────────────────────────────────────
// All hook instances (RambleButton, RambleCanvas) share the same WS + mic.
// This is the core fix: useRef creates per-component state, we need global.
let _ws: WebSocket | null = null
let _audio: AudioCapture | null = null

function stopAudio() {
  if (_audio) {
    _audio.stop()
    _audio = null
  }
}

function stopAudioSilent() {
  if (_audio) {
    const a = _audio
    _audio = null
    a.stopSilent()
  }
}

function closeWs() {
  if (_ws) {
    try { _ws.close() } catch { /* ignore */ }
    _ws = null
  }
}
// ──────────────────────────────────────────────────────────────────────────

export function useRambleWebSocket() {
  const setSendJson  = useRambleStore((s) => s.setSendJson)
  const setConnected = useRambleStore((s) => s.setConnected)
  const setConnecting = useRambleStore((s) => s.setConnecting)
  const setListening = useRambleStore((s) => s.setListening)
  const setPaused    = useRambleStore((s) => s.setPaused)
  const setCanvas    = useRambleStore((s) => s.setCanvas)
  const clearCanvas  = useRambleStore((s) => s.clearCanvas)

  const isConnected = useRambleStore((s) => s.isConnected)
  const isListening = useRambleStore((s) => s.isListening)

  const addItem  = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  // sendJson always uses the current module-level _ws
  const sendJson = useCallback((data: object) => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(data))
    }
  }, [])

  useEffect(() => {
    setSendJson(sendJson)
    return () => { setSendJson(null) }
  }, [sendJson, setSendJson])

  const startListening = useCallback(async () => {
    // Prevent double-start
    if (_ws && _ws.readyState === WebSocket.OPEN) return

    setConnecting(true)
    setListening(true)

    const ws = new WebSocket(`${WS_BASE}/api/ramble/stream?user_id=u001`)
    _ws = ws

    ws.onopen = () => {
      setConnected(true)
      setConnecting(false)

      const audio = new AudioCapture({
        onChunk: (b64) => {
          if (_ws?.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({ type: "audio", audio: b64 }))
          }
        },
        onEnd: () => {
          if (_ws?.readyState === WebSocket.OPEN) {
            _ws.send(JSON.stringify({ type: "audio_end" }))
          }
        },
        onError: (err) => {
          toast.error("Microphone error: " + err)
          stopListening()
        },
      })

      audio.start()
        .then(() => { _audio = audio })
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
            if (data.status === "ready") toast.success("Ramble active — start speaking!", { duration: 2000 })
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
          case "cart_action":
            if (data.action === "add_to_cart") {
              for (const item of data.items) {
                const product: Product = {
                  id: item.product_id, name: item.name, brand: item.brand,
                  variant: item.variant || "", price: item.price, mrp: item.price,
                  image: "", category: (item.category || "grocery") as Product["category"],
                  inStock: true, deliveryMins: 15, tags: [],
                }
                for (let i = 0; i < item.quantity; i++) addItem(product)
              }
              clearCanvas()
              openCart()
            }
            break
          case "error":
            toast.error(data.message || "Ramble error")
            break
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onclose = () => {
      // Release mic whenever WS closes for any reason
      stopAudio()
      _ws = null
      setConnected(false)
      setListening(false)
      setPaused(false)
    }

    ws.onerror = () => {
      stopAudio()
      _ws = null
      setConnected(false)
      setListening(false)
      toast.error("Ramble connection failed")
    }
  }, [setConnected, setConnecting, setListening, setPaused, setCanvas, clearCanvas, addItem, openCart])

  const stopListening = useCallback(() => {
    stopAudio()                          // kill mic immediately
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ type: "stop" }))
    }
    closeWs()
    setListening(false)
    setPaused(false)
  }, [setListening, setPaused])

  const pauseListening = useCallback(() => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ type: "pause" }))
    }
    setPaused(true)
    stopAudioSilent()                    // kill mic, no audio_end (keep Gemini session)
  }, [setPaused])

  const resumeListening = useCallback(async () => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ type: "resume" }))
    }
    setPaused(false)

    const audio = new AudioCapture({
      onChunk: (b64) => {
        if (_ws?.readyState === WebSocket.OPEN) {
          _ws.send(JSON.stringify({ type: "audio", audio: b64 }))
        }
      },
      onEnd: () => {
        if (_ws?.readyState === WebSocket.OPEN) {
          _ws.send(JSON.stringify({ type: "audio_end" }))
        }
      },
      onError: (err) => toast.error("Microphone error: " + err),
    })

    try {
      await audio.start()
      _audio = audio
    } catch {
      toast.error("Could not access microphone")
    }
  }, [setPaused])

  const sendRaw = useCallback((data: object) => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify(data))
    }
  }, [])

  const sendAction = useCallback((action: "add_to_cart" | "discard") => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ type: "action", action }))
    }
  }, [])

  // Cleanup on full unmount (page unload)
  useEffect(() => {
    return () => {
      stopAudio()
      closeWs()
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
