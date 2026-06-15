"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRambleStore } from "@/store/ramble"
import { useRambleWebSocket } from "@/hooks/useRambleWebSocket"
import { toast } from "sonner"

export default function VisionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraMode, setCameraMode] = useState(false)

  const { connectOnly, sendRaw } = useRambleWebSocket()

  const compressImage = useCallback((dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX = 800
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.8))
      }
      img.src = dataUrl
    })
  }, [])

  const sendImageToCanvas = useCallback(async (dataUrl: string) => {
    setIsScanning(true)
    setPreview(dataUrl)

    try {
      // Ensure WS is connected — NO mic
      await connectOnly()

      const compressed = await compressImage(dataUrl)
      // Strip data:image/jpeg;base64, prefix
      const [header, b64] = compressed.split(",")
      const mime = header.replace("data:", "").replace(";base64", "")

      sendRaw({ type: "image", image: b64, mime })
      toast.success("Scanning image for products…", { duration: 2000 })
      setIsOpen(false)
    } catch (e) {
      toast.error("Failed to send image")
    } finally {
      setIsScanning(false)
    }
  }, [connectOnly, compressImage, sendRaw])

  // File/Gallery upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      await sendImageToCanvas(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [sendImageToCanvas])

  // Camera capture
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } }
      })
      streamRef.current = stream
      setCameraMode(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      }, 100)
    } catch {
      toast.error("Camera not available")
    }
  }, [])

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return
    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    stopCamera()
    await sendImageToCanvas(dataUrl)
  }, [sendImageToCanvas])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraMode(false)
  }, [])

  const handleClose = useCallback(() => {
    stopCamera()
    setIsOpen(false)
    setPreview(null)
  }, [stopCamera])

  return (
    <>
      {/* Camera trigger button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="relative flex flex-col items-center gap-1"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/60"
          style={{
            background: "linear-gradient(135deg, #2a9d8f 0%, #1a7a6e 100%)",
            boxShadow: "0 4px 16px rgba(42,157,143,0.4)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
              stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.8"/>
          </svg>
        </div>
        <span className="text-[10px] font-semibold text-[#3a3530]">Scan</span>
      </motion.button>

      {/* Camera/Upload modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-[430px] rounded-t-3xl overflow-hidden"
              style={{ background: "#faf8f4" }}
            >
              {cameraMode ? (
                /* Camera viewfinder */
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-[4/3] object-cover bg-black"
                  />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 rounded-2xl border-2 border-white/70"
                         style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }}>
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#2a9d8f] rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#2a9d8f] rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#2a9d8f] rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#2a9d8f] rounded-br-xl" />
                    </div>
                  </div>
                  <p className="absolute bottom-4 left-0 right-0 text-center text-white text-[12px] font-medium opacity-80">
                    Point at grocery products
                  </p>
                </div>
              ) : preview ? (
                /* Preview of captured image */
                <div className="relative">
                  <img src={preview} alt="preview" className="w-full aspect-[4/3] object-cover" />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white"
                      />
                      <p className="text-white font-medium text-[13px]">Identifying products…</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Choice screen */
                <div className="px-6 py-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[18px] font-bold text-[#1a1a1a]">Scan Products</h2>
                      <p className="text-[12px] text-[#888] mt-0.5">Point camera at groceries to add them instantly</p>
                    </div>
                    <button onClick={handleClose}
                      className="w-8 h-8 rounded-full bg-[#f0ece5] flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Camera */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={startCamera}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-[#e8e2d9] bg-white shadow-sm active:bg-[#f5f0e8]"
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                           style={{ background: "linear-gradient(135deg, #2a9d8f22, #2a9d8f11)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                            stroke="#2a9d8f" strokeWidth="1.8"/>
                          <circle cx="12" cy="13" r="4" stroke="#2a9d8f" strokeWidth="1.8"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-bold text-[#1a1a1a]">Camera</p>
                        <p className="text-[11px] text-[#888] mt-0.5">Take a photo</p>
                      </div>
                    </motion.button>

                    {/* Gallery */}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-[#e8e2d9] bg-white shadow-sm active:bg-[#f5f0e8]"
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                           style={{ background: "linear-gradient(135deg, #ff990022, #ff990011)" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="#ff9900" strokeWidth="1.8"/>
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#ff9900"/>
                          <path d="M21 15l-5-5L5 21" stroke="#ff9900" strokeWidth="1.8" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-bold text-[#1a1a1a]">Gallery</p>
                        <p className="text-[11px] text-[#888] mt-0.5">Choose photo</p>
                      </div>
                    </motion.button>
                  </div>

                  <p className="text-center text-[11px] text-[#aaa] mt-5">
                    Works with grocery shelves, fridge, shopping lists & product packs
                  </p>
                </div>
              )}

              {/* Action buttons */}
              {cameraMode && (
                <div className="flex items-center justify-between px-8 py-5 bg-black">
                  <button onClick={stopCamera} className="text-white/60 text-[13px] font-medium">Cancel</button>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center"
                  >
                    <div className="w-11 h-11 rounded-full bg-white" />
                  </motion.button>
                  <div className="w-16" />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}
