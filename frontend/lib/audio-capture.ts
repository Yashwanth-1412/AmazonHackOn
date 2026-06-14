"use client"

/**
 * Browser-side audio capture using MediaRecorder API.
 * Captures PCM audio at 16kHz and sends via callback.
 */

export interface AudioCaptureOptions {
  sampleRate?: number
  onChunk: (base64Audio: string) => void
  onError?: (error: string) => void
}

export class AudioCapture {
  private mediaRecorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private options: AudioCaptureOptions
  private isCapturing = false

  constructor(options: AudioCaptureOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    if (this.isCapturing) return

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate || 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      this.audioContext = new AudioContext({
        sampleRate: this.options.sampleRate || 16000,
      })

      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)

      this.processor.onaudioprocess = (event) => {
        if (!this.isCapturing) return
        const inputData = event.inputBuffer.getChannelData(0)
        const pcmBuffer = this.float32ToPcm16(inputData)
        const base64 = this.arrayBufferToBase64(pcmBuffer)
        this.options.onChunk(base64)
      }

      source.connect(this.processor)
      this.processor.connect(this.audioContext.destination)
      this.isCapturing = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Microphone access denied"
      this.options.onError?.(message)
      throw err
    }
  }

  stop(): void {
    this.isCapturing = false

    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop()
      }
      this.mediaRecorder = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }

  private float32ToPcm16(float32: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return buffer
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
    }
    return btoa(binary)
  }
}
