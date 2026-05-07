'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ImageIcon, FileText, Upload, X, Loader2, AlertCircle } from 'lucide-react'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp'
const DOC_ACCEPT =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/msword'
const MAX_IMAGES = 9

interface MediaRecord {
  id: string
  fileName: string
  mimeType: string
  mediaType: 'image' | 'document' | 'video'
  fileSize: number
  signedUrl: string | null
}

interface MediaAttachmentsProps {
  draftId: string
  readOnly?: boolean
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/msword',
])

export function MediaAttachments({ draftId, readOnly = false }: MediaAttachmentsProps) {
  const [media, setMedia] = useState<MediaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const attachmentKind = media.length > 0 ? media[0].mediaType : null
  const canAddImage = !readOnly && (attachmentKind === null || attachmentKind === 'image') && media.length < MAX_IMAGES
  const canAddDoc = !readOnly && attachmentKind === null

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/media`)
      if (res.ok) {
        const data = await res.json()
        setMedia(data.media ?? [])
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  async function handleUpload(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`/api/drafts/${draftId}/media`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
        return
      }
      setMedia((prev) => [...prev, data.media])
      toast.success(data.media.mediaType === 'document' ? 'Document uploaded' : 'Image uploaded')
    } catch {
      toast.error('Upload failed — check your connection')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(item: MediaRecord) {
    try {
      const res = await fetch(`/api/drafts/${draftId}/media/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to remove')
        return
      }
      setMedia((prev) => prev.filter((m) => m.id !== item.id))
      if (previewIndex !== null) setPreviewIndex(null)
    } catch {
      toast.error('Something went wrong')
    }
  }

  function onImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const remaining = MAX_IMAGES - media.length
    files.slice(0, remaining).forEach((f) => handleUpload(f))
  }

  function onDocFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleUpload(file)
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current += 1
    if (dragCounter.current === 1) setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current === 0) setDragging(false)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)

    if (readOnly || uploading) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const images = files.filter((f) => IMAGE_MIME_TYPES.has(f.type))
    const docs = files.filter((f) => DOC_MIME_TYPES.has(f.type))
    const unsupported = files.filter((f) => !IMAGE_MIME_TYPES.has(f.type) && !DOC_MIME_TYPES.has(f.type))

    if (unsupported.length > 0) {
      toast.error(`Unsupported file type: ${unsupported[0].name}`)
      return
    }

    // Mixed drop (images + document)
    if (images.length > 0 && docs.length > 0) {
      toast.error('Drop images or a document — not both at once')
      return
    }

    if (images.length > 0) {
      if (attachmentKind === 'document') {
        toast.error('Remove the document before adding images')
        return
      }
      const remaining = MAX_IMAGES - media.length
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_IMAGES} images already attached`)
        return
      }
      images.slice(0, remaining).forEach((f) => handleUpload(f))
      if (images.length > remaining) {
        toast.error(`Only ${remaining} image slot${remaining === 1 ? '' : 's'} remaining — first ${remaining} uploaded`)
      }
      return
    }

    if (docs.length > 0) {
      if (attachmentKind === 'image') {
        toast.error('Remove all images before adding a document')
        return
      }
      if (attachmentKind === 'document') {
        toast.error('Remove the existing document before adding a new one')
        return
      }
      handleUpload(docs[0])
      if (docs.length > 1) toast.error('Only one document per post — first file uploaded')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attachments…
        </CardContent>
      </Card>
    )
  }

  if (fetchError) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          Could not load attachments — check your connection and refresh.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={dragging && !readOnly ? 'border-primary ring-1 ring-primary' : ''}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Attachments</CardTitle>
          {attachmentKind && (
            <Badge variant="secondary">
              {attachmentKind === 'image'
                ? `Images ${media.length}/${MAX_IMAGES}`
                : 'Document'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          LinkedIn only supports one attachment type per post — images or a document, not both.
          {attachmentKind === 'image' && !readOnly && ' Remove all images to attach a document instead.'}
          {attachmentKind === 'document' && !readOnly && ' Remove the document to attach images instead.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Image grid ── */}
        {media.filter((m) => m.mediaType === 'image').length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media
              .filter((m) => m.mediaType === 'image')
              .map((item, i) => (
                <div
                  key={item.id}
                  className="relative group aspect-square rounded-md overflow-hidden border bg-muted cursor-pointer"
                  onClick={() => setPreviewIndex(i)}
                >
                  {item.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.signedUrl}
                      alt={item.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  {!readOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item) }}
                      className="absolute top-1 right-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* ── Document preview ── */}
        {media.filter((m) => m.mediaType === 'document').map((item) => (
          <div key={item.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-md border px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(item.fileSize)}
                    {item.fileName.match(/\.(docx?|pptx?)$/i) && ' — converted to PDF'}
                  </p>
                </div>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(item)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {item.signedUrl && (
              <iframe
                src={item.signedUrl}
                title={item.fileName}
                className="w-full rounded-md border"
                style={{ height: '480px' }}
              />
            )}
          </div>
        ))}

        {/* ── Empty state ── */}
        {media.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">No attachments yet.</p>
        )}

        {/* ── Upload buttons ── */}
        {!readOnly && (
          <div className="flex flex-wrap gap-2 pt-1">
            {(canAddImage || attachmentKind === 'image') && (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={onImageFileChange}
                  disabled={uploading || !canAddImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || !canAddImage}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {attachmentKind === 'image' ? 'Add More Images' : 'Add Images'}
                </Button>
              </>
            )}

            {canAddDoc && (
              <>
                <input
                  ref={docInputRef}
                  type="file"
                  accept={DOC_ACCEPT}
                  className="hidden"
                  onChange={onDocFileChange}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => docInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Add Document
                </Button>
              </>
            )}
          </div>
        )}

        {uploading && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading{attachmentKind === null || attachmentKind === 'document' ? ' and converting…' : '…'}
          </p>
        )}
      </CardContent>

      {/* ── Lightbox ── */}
      {previewIndex !== null && (() => {
        const images = media.filter((m) => m.mediaType === 'image')
        const item = images[previewIndex]
        if (!item?.signedUrl) return null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setPreviewIndex(null)}
          >
            <button
              className="absolute top-4 right-4 text-white"
              onClick={() => setPreviewIndex(null)}
              aria-label="Close preview"
            >
              <X className="h-7 w-7" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.signedUrl}
              alt={item.fileName}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {images.length > 1 && (
              <p className="absolute bottom-4 text-white/70 text-sm">
                {previewIndex + 1} / {images.length}
              </p>
            )}
          </div>
        )
      })()}
    </Card>
  )
}
