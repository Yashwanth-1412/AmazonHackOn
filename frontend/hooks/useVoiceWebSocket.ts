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

  const setSendJson = useVoiceStore((s) => s.setSendJson)
  const setConnected = useVoiceStore((s) => s.setConnected)
  const setRecording = useVoiceStore((s) => s.setRecording)
  const setProcessing = useVoiceStore((s) => s.setProcessing)
  const setInterimTranscript = useVoiceStore((s) => s.setInterimTranscript)
  const setFinalTranscript = useVoiceStore((s) => s.setFinalTranscript)
  const clearRecognizedProducts = useVoiceStore((s) => s.clearRecognizedProducts)
  const addRecognizedProduct = useVoiceStore((s) => s.addRecognizedProduct)
  const setPendingBrandChoice = useVoiceStore((s) => s.setPendingBrandChoice)
  const confirmBrandChoice = useVoiceStore((s) => s.confirmBrandChoice)
  const resetStore = useVoiceStore((s) => s.reset)

  const isConnected = useVoiceStore((s) => s.isConnected)
  const isRecording = useVoiceStore((s) => s.isRecording)

  const addItem = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)

  const sendJson = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  // Share sendJson with other components via store
  useEffect(() => {
    setSendJson(sendJson)
    return () => { setSendJson(null) }
  }, [sendJson, setSendJson])

  // Mock voice session when backend is unavailable
  const runMockVoiceSession = useCallback(() => {
    setRecording(true)
    setConnected(true)
    setProcessing(false)

    toast("🎙️ Voice demo mode — backend not connected", { duration: 2000 })

    // Simulate interim transcript
    setTimeout(() => setInterimTranscript("add milk..."), 800)
    setTimeout(() => setInterimTranscript("add milk and bread"), 1600)
    setTimeout(() => {
      setFinalTranscript("Add milk and bread")
      setInterimTranscript("")

      // Simulate product recognition
      const mockProduct: Product = {
        id: "p1",
        name: "Amul Taaza Toned Milk",
        brand: "Amul",
        variant: "1 L",
        price: 62,
        mrp: 65,
        image: "🥛",
        category: "dairy",
        inStock: true,
        deliveryMins: 12,
        tags: ["daily"],
      }

      addItem(mockProduct)
      addRecognizedProduct({
        product_id: mockProduct.id,
        name: mockProduct.name,
        brand: mockProduct.brand,
        variant: mockProduct.variant,
        price: mockProduct.price,
        quantity: 1,
        image: mockProduct.image,
        confidence: 0.95,
        brand_options: [],
        needs_brand_confirmation: false,
      })

      toast.success("Added Amul Taaza Toned Milk x1", {
        description: "Tap cart to review",
        action: { label: "View Cart", onClick: () => openCart() },
      })
    }, 2200)

    // Stop recording after mock completes
    setTimeout(() => {
      setRecording(false)
      setConnected(false)
      // Clear after a few seconds
      setTimeout(() => {
        clearRecognizedProducts()
        setFinalTranscript("")
      }, 4000)
    }, 3000)
  }, [
    setRecording,
    setConnected,
    setProcessing,
    setInterimTranscript,
    setFinalTranscript,
    addItem,
    addRecognizedProduct,
    openCart,
    clearRecognizedProducts,
  ])

  const startRecording = useCallback(async () => {
    setRecording(true)
    setProcessing(true)
    setInterimTranscript("")
    setFinalTranscript("")
    clearRecognizedProducts()

    // Connect WebSocket
    const ws = new WebSocket(
      `${WS_BASE}/api/voice/stream?user_id=${userRef.current}`,
    )

    ws.onopen = () => {
      setConnected(true)
      setProcessing(false)

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
          setRecording(false)
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
              // session ready
            }
            break

          case "interim":
          case "interim_transcript":
            setInterimTranscript(data.transcript)
            break

          case "final":
            setFinalTranscript(data.transcript)
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

            addRecognizedProduct({
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
            setPendingBrandChoice({
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
      setConnected(false)
      setProcessing(false)
      wsRef.current = null
    }

    ws.onerror = () => {
      setConnected(false)
      setProcessing(false)
      setRecording(false)
      // Fall back to mock mode when backend is unavailable
      runMockVoiceSession()
    }

    wsRef.current = ws
  }, [
    setRecording,
    setProcessing,
    setInterimTranscript,
    setFinalTranscript,
    clearRecognizedProducts,
    setConnected,
    sendJson,
    addRecognizedProduct,
    addItem,
    openCart,
    setPendingBrandChoice,
    runMockVoiceSession
  ])

  const stopRecording = useCallback(() => {
    setRecording(false)

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
      clearRecognizedProducts()
      resetStore()
    }, 5000)
    reconnectTimer.current = timer
  }, [setRecording, sendJson, clearRecognizedProducts, resetStore])

  const confirmBrand = useCallback(
    (productId: string, selectedBrand: string) => {
      sendJson({
        type: "brand_choice",
        product_id: productId,
        brand: selectedBrand,
      })
      confirmBrandChoice(productId, selectedBrand)

      toast.success(`Brand updated to ${selectedBrand}`, { duration: 2000 })
    },
    [sendJson, confirmBrandChoice],
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
    isConnected,
    isRecording,
  }
}
