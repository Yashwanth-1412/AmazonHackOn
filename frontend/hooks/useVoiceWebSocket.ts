"use client"

import { useCallback, useRef, useEffect } from "react"
import { useVoiceStore } from "@/store/voice"
import { AudioCapture } from "@/lib/audio-capture"
import { useCartStore } from "@/store/cart"
import { toast } from "sonner"
import type { Product } from "@/types"

const WS_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") ?? "ws://localhost:8000"

export function useVoiceWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<AudioCapture | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const userRef = useRef("u001")

  const store = useVoiceStore((s) => s)
  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const sendJson = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Share sendJson with other components via store
  useEffect(() => {
    store.setSendJson(sendJson)
    return () => { store.setSendJson(null) }
  }, [sendJson, store])

  const startRecording = useCallback(async () => {
    store.setRecording(true)
    store.setProcessing(true)
    store.setInterimTranscript("")
    store.setFinalTranscript("")
    store.clearRecognizedProducts()

    // Connect WebSocket
    const ws = new WebSocket(
      `${WS_BASE}/api/voice/stream?user_id=${userRef.current}`,
    )

    ws.onopen = () => {
      store.setConnected(true)
      store.setProcessing(false)

      // Start audio capture
      const audio = new AudioCapture({
        onChunk: (b64) => {
          sendJson({ type: "audio", audio: b64 })
        },
        onError: (err) => {
          toast.error("Microphone error: " + err)
          stopRecording()
        },
      })

      audio
        .start()
        .then(() => {
          audioRef.current = audio
        })
        .catch(() => {
          store.setRecording(false)
          store.setConnected(false)
          toast.error("Could not access microphone")
        })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case "status":
            if (data.status === "ready") {
              // session ready
            }
            break

          case "interim":
          case "interim_transcript":
            store.setInterimTranscript(data.transcript)
            break

          case "final":
            store.setFinalTranscript(data.transcript)
            break

          case "product_recognized": {
            const product = data.product as {
              product_id: string
              name: string
              brand: string
              variant: string
              category: string
              quantity: number
              image: string
              price: number
              confidence: number
              needs_brand_confirmation: boolean
              brand_options: { brand: string; confidence: number; reason: string }[]
            }

            store.addRecognizedProduct({
              product_id: product.product_id,
              name: product.name,
              brand: product.brand,
              variant: product.variant,
              price: product.price,
              quantity: product.quantity,
              image: product.image,
              confidence: product.confidence,
              brand_options: product.brand_options || [],
              needs_brand_confirmation: product.needs_brand_confirmation,
            })

            // Add to cart
            const cartProduct: Product = {
              id: product.product_id,
              name: product.name,
              brand: product.brand,
              variant: product.variant || "",
              price: product.price,
              mrp: product.price,
              image: product.image,
              category: (product.category || "grocery") as Product["category"],
              inStock: true,
              deliveryMins: 15,
              tags: [],
            }

            for (let i = 0; i < product.quantity; i++) {
              addItem(cartProduct)
            }

            toast.success(
              `Added ${product.brand ? product.brand + " " : ""}${product.name} x${product.quantity}`,
              {
                description: "Tap cart to review",
                action: { label: "View Cart", onClick: () => openCart() },
              },
            )
            break
          }

          case "brand_confirmation":
            store.setPendingBrandChoice({
              product_id: data.product_id,
              product_name: data.product_name,
              recommended_brand: data.recommended_brand,
              brand_options: data.brand_options,
              transcript: data.transcript,
            })
            toast(
              `Which brand of ${data.product_name}? ${data.recommended_brand} or ${data.brand_options.filter((b: string) => b !== data.recommended_brand).join(" or ")}?`,
              {
                duration: 5000,
                action: {
                  label: "Choose",
                  onClick: () => {
                    /* BrandPicker handles this */
                  },
                },
              },
            )
            break

          case "error":
            toast.error(data.message || "Voice processing error")
            break
        }
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      store.setConnected(false)
      store.setProcessing(false)
      wsRef.current = null
    }

    ws.onerror = () => {
      store.setConnected(false)
      store.setProcessing(false)
      toast.error("Voice connection failed")
    }

    wsRef.current = ws
  }, [store, addItem, openCart, sendJson])

  const stopRecording = useCallback(() => {
    store.setRecording(false)

    if (audioRef.current) {
      audioRef.current.stop()
      audioRef.current = null
    }

    if (wsRef.current) {
      sendJson({ type: "stop" })
      wsRef.current.close()
      wsRef.current = null
    }

    // Keep recognized products visible for a few seconds
    clearTimeout(reconnectTimer.current)
    const timer = setTimeout(() => {
      store.clearRecognizedProducts()
      store.reset()
    }, 5000)
    reconnectTimer.current = timer
  }, [store, sendJson])

  const confirmBrand = useCallback(
    (productId: string, selectedBrand: string) => {
      sendJson({
        type: "brand_choice",
        product_id: productId,
        brand: selectedBrand,
      })
      store.confirmBrandChoice(productId, selectedBrand)

      toast.success(`Brand updated to ${selectedBrand}`, { duration: 2000 })
    },
    [sendJson, store],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.stop()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      clearTimeout(reconnectTimer.current)
    }
  }, [])

  return {
    startRecording,
    stopRecording,
    confirmBrand,
    isConnected: store.isConnected,
    isRecording: store.isRecording,
  }
}
