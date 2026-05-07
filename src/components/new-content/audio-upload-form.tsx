'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Upload, FileAudio, FileVideo, X, Loader2 } from 'lucide-react'
import { DraftModeToggle } from '@/components/new-content/draft-mode-toggle'

const ACCEPTED = '.mp3,.mp4,.m4a,.wav,.ogg,.webm,.flac,.aac,.mov'
const MAX_MB = 25

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isVideoType(mimeType: string) {
  return mimeType.startsWith('video/')
}

type Stage = 'idle' | 'uploading' | 'done' | 'error'

export function AudioUploadForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'single' | 'multiple'>('single')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  function validateAndSetFile(f: File) {
    setError(null)
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`)
      return
    }
    setFile(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) validateAndSetFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndSetFile(f)
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function handleDragLeave() {
    setDragging(false)
  }

  function clearFile() {
    setFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setStage('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    if (title.trim()) formData.append('title', title.trim())
    formData.append('mode', mode)

    try {
      const res = await fetch('/api/media/transcribe', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setStage('error')
        return
      }
      setStage('done')
      toast.success(mode === 'multiple' ? 'Drafts generated — reviewing first one' : 'Draft generated from your recording')
      router.push(`/drafts/${data.draftId}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStage('error')
    }
  }

  const busy = stage === 'uploading' || stage === 'done'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="audio-title">Title (optional)</Label>
        <Input
          id="audio-title"
          placeholder="e.g. Interview with marketing team"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
        />
      </div>

      {/* Drop zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-14 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Click or drag a file here</p>
          <p className="mt-1 text-sm text-muted-foreground">
            MP3, MP4, M4A, WAV, WebM, OGG — up to {MAX_MB} MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleFileChange}
            disabled={busy}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              {isVideoType(file.type) ? (
                <FileVideo className="h-5 w-5 text-primary" />
              ) : (
                <FileAudio className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)} · {file.type || 'audio/video'}
              </p>
            </div>
            {!busy && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      <DraftModeToggle value={mode} onChange={setMode} disabled={busy} />

      {/* Processing status */}
      {busy && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {stage === 'done'
            ? 'Redirecting…'
            : mode === 'multiple'
            ? 'Transcribing and generating drafts…'
            : 'Transcribing and generating draft…'}
        </div>
      )}

      <Button type="submit" disabled={!file || busy}>
        {busy
          ? stage === 'done'
            ? 'Redirecting…'
            : mode === 'multiple'
            ? 'Generating drafts…'
            : 'Generating draft…'
          : mode === 'multiple'
          ? 'Transcribe and Generate Drafts'
          : 'Transcribe and Generate Draft'}
      </Button>

      <p className="text-xs text-muted-foreground">
        Audio is transcribed by OpenAI Whisper, then LinkedIn draft(s) are generated by Claude using
        your writing style. Processing typically takes 15–60 seconds depending on file length.
      </p>
    </form>
  )
}
