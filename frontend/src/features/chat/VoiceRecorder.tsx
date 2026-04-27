import { Button, notification, Tooltip } from 'antd'
import { AudioOutlined, CloseOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'
import { voiceService } from '../conversations/voice.service'
import type { Message } from '../../shared/types'

const MAX_DURATION_MS = 120_000 // 2 minutes

interface VoiceRecorderProps {
  conversationId: string
  onRecorded: (message: Message) => void
  disabled?: boolean
}

export function VoiceRecorder({ conversationId, onRecorded, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start(100)
      mediaRef.current = recorder
      startTimeRef.current = Date.now()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => {
        const newElapsed = Date.now() - startTimeRef.current
        setElapsed(newElapsed)
        if (newElapsed >= MAX_DURATION_MS) stopRecording(true)
      }, 500)
    } catch (err) {
      if ((err as { name: string }).name === 'NotAllowedError') {
        notification.error({
          message: 'Microphone permission denied',
          description: 'Please allow microphone access to record voice messages.',
        })
      }
    }
  }

  const stopRecording = (autoStop = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = mediaRef.current
    if (!recorder || recorder.state === 'inactive') return
    const durationMs = Date.now() - startTimeRef.current
    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((t) => t.stop())
      if (!autoStop && durationMs < 500) return // too short, discard
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setUploading(true)
      try {
        const message = await voiceService.uploadVoiceMessage(
          conversationId,
          blob,
          Math.round(durationMs / 1000),
        )
        onRecorded(message)
      } catch {
        notification.error({ message: 'Failed to send voice message' })
      } finally {
        setUploading(false)
      }
    }
    recorder.stop()
    setRecording(false)
    setElapsed(0)
  }

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = mediaRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop())
      }
      recorder.stop()
    }
    setRecording(false)
    setElapsed(0)
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  if (recording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#ff4d4f', fontFamily: 'monospace', fontSize: 14 }}>
          🔴 {formatTime(elapsed)} / 02:00
        </span>
        <Tooltip title="Send recording">
          <Button
            type="primary"
            size="small"
            icon={<AudioOutlined />}
            loading={uploading}
            onClick={() => stopRecording()}
          />
        </Tooltip>
        <Tooltip title="Cancel recording">
          <Button danger size="small" icon={<CloseOutlined />} onClick={cancelRecording} />
        </Tooltip>
      </div>
    )
  }

  return (
    <Tooltip title="Hold to record voice message">
      <Button
        icon={<AudioOutlined />}
        disabled={disabled || uploading}
        onClick={() => void startRecording()}
      />
    </Tooltip>
  )
}
