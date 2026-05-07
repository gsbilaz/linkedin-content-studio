'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mic, Square, Trash2, Loader2, AlertCircle, Upload } from 'lucide-react'
import { DraftModeToggle } from '@/components/new-content/draft-mode-toggle'

type Stage = 'idle' | 'requesting' | 'recording' | 'recorded' | 'uploading' | 'done'

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

function mimeToExt(mimeType: string): string {
  const base = mimeType.split(';')[0].trim()
  if (base === 'audio/mp4') return 'mp4'
  if (base === 'audio/ogg') return 'ogg'
  return 'webm'
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VoiceRecorder() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'single' | 'multiple'>('single')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  // Check browser support
  const isSupported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  function startTimer() {
    setSeconds(0)
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    setStage('requesting')
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())

        const mimeUsed = recorder.mimeType || 'audio/webm'
        const baseMime = mimeUsed.split(';')[0].trim()
        const ext = mimeToExt(baseMime)
        const blob = new Blob(chunksRef.current, { type: mimeUsed })
        const file = new File([blob], `recording.${ext}`, { type: baseMime })

        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
        const url = URL.createObjectURL(blob)
        audioUrlRef.current = url
        setAudioUrl(url)
        setAudioFile(file)
        setStage('recorded')
      }

      recorder.start(1000)
      startTimer()
      setStage('recording')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setError(
          'Microphone access denied. Allow microphone access in your browser settings and try again.'
        )
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setError('No microphone detected. Connect a microphone and try again.')
      } else {
        setError(`Could not start recording: ${msg}`)
      }
      setStage('idle')
    }
  }, [])

  function stopRecording() {
    stopTimer()
    recorderRef.current?.stop()
  }

  function discard() {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioUrl(null)
    setAudioFile(null)
    setSeconds(0)
    setError(null)
    setStage('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!audioFile) return

    setStage('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('file', audioFile)
    if (title.trim()) formData.append('title', title.trim())
    formData.append('mode', mode)

    try {
      const res = await fetch('/api/media/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setStage('recorded')
        return
      }
      setStage('done')
      toast.success(
        mode === 'multiple' ? 'Drafts generated — reviewing first one' : 'Draft generated!'
      )
      router.push(`/drafts/${data.draftId}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStage('recorded')
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Voice recording is not supported in this browser
        </div>
        <p className="text-sm text-amber-700">
          Try Chrome, Edge, Firefox, or Safari 14.3+. You can also{' '}
          <a href="/new-content/audio" className="underline">
            upload an audio file
          </a>{' '}
          instead.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Idle ── */}
      {stage === 'idle' && (
        <div className="flex flex-col items-center gap-6 py-8">
          <button
            type="button"
            onClick={startRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 active:scale-95 touch-manipulation"
            aria-label="Start recording"
          >
            <Mic className="h-10 w-10" />
          </button>
          <p className="text-sm text-muted-foreground">Tap to start recording</p>
        </div>
      )}

      {/* ── Requesting permission ── */}
      {stage === 'requesting' && (
        <div className="flex flex-col items-center gap-4 py-8 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm">Requesting microphone access…</p>
        </div>
      )}

      {/* ── Recording ── */}
      {stage === 'recording' && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-2xl font-semibold tabular-nums">
              {formatTime(seconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600 active:scale-95 touch-manipulation"
            aria-label="Stop recording"
          >
            <Square className="h-10 w-10 fill-white" />
          </button>
          <p className="text-sm text-muted-foreground">Tap to stop</p>
        </div>
      )}

      {/* ── Recorded ── */}
      {(stage === 'recorded' || stage === 'uploading') && audioUrl && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              Recording ({formatTime(seconds)})
            </Label>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audioUrl} controls className="w-full rounded-md" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recording-title">Title (optional)</Label>
            <Input
              id="recording-title"
              placeholder="e.g. Podcast discussion notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={stage === 'uploading'}
            />
          </div>

          <DraftModeToggle
            value={mode}
            onChange={setMode}
            disabled={stage === 'uploading'}
          />

          {error && (
            <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {stage === 'uploading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {mode === 'multiple'
                ? 'Transcribing and generating drafts…'
                : 'Transcribing and generating draft…'}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={discard}
              disabled={stage === 'uploading'}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button type="submit" disabled={stage === 'uploading'} className="flex-1">
              {stage === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'multiple' ? 'Generating drafts…' : 'Generating draft…'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {mode === 'multiple' ? 'Transcribe and Generate Drafts' : 'Transcribe and Generate Draft'}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Recording is transcribed by OpenAI Whisper, then a LinkedIn draft is written by Claude
            using your writing style.
          </p>
        </form>
      )}

      {/* ── Done (redirecting) ── */}
      {stage === 'done' && (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Redirecting to your draft…</p>
        </div>
      )}

      {/* ── Error in idle state ── */}
      {stage === 'idle' && error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
