'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Camera, AlertCircle, KeyboardIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface QRScannerProps {
  onScan: (memberId: string) => void
  isProcessing?: boolean
}

export function QRScanner({ onScan, isProcessing = false }: QRScannerProps) {
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [manualId, setManualId] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let mounted = true

    async function initScanner() {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')

        if (!mounted) return

        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
          },
          false
        )

        scanner.render(
          (decodedText: string) => {
            // The QR value is the user's profile ID
            const memberId = decodedText.trim()
            if (memberId) {
              onScan(memberId)
            }
          },
          (errorMessage: string) => {
            // Ignore scan errors — they fire on every failed frame
            void errorMessage
          }
        )

        scannerRef.current = scanner
        setIsInitializing(false)
      } catch (err) {
        if (mounted) {
          setScannerError('Camera access unavailable. Use manual entry below.')
          setIsInitializing(false)
        }
      }
    }

    initScanner()

    return () => {
      mounted = false
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {
          // ignore cleanup errors
        })
        scannerRef.current = null
      }
    }
  }, [onScan])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualId.trim()) {
      onScan(manualId.trim())
      setManualId('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative h-72 w-full max-w-sm mx-auto">
        {isInitializing && !scannerError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {scannerError ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">{scannerError}</p>
          </div>
        ) : (
          <div id="qr-reader" ref={containerRef} className="w-full" />
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Processing check-in...</p>
            </div>
          </div>
        )}
      </div>

      {!scannerError && (
        <p className="text-center text-xs text-muted-foreground">
          Point camera at member&apos;s QR code
        </p>
      )}

      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <KeyboardIcon className="h-3 w-3" />
          Manual entry (paste or type member ID)
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            placeholder="Member ID or QR code value..."
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            disabled={isProcessing}
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={!manualId.trim() || isProcessing}>
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
