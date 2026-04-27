import { useEffect, useRef, useState } from 'react'
import { Button, Slider, Typography } from 'antd'
import { PauseOutlined, PlayCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

interface VoiceMessagePlayerProps {
  src: string
  durationSeconds: number
}

export function VoiceMessagePlayer({ src, durationSeconds }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
    }
    const onError = () => setError(true)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [src])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  if (error) {
    return (
      <Text type="danger" style={{ fontSize: 12 }}>
        Unable to load audio
      </Text>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
      <Button
        type="text"
        size="small"
        icon={playing ? <PauseOutlined /> : <PlayCircleOutlined />}
        onClick={togglePlay}
      />
      <Slider
        min={0}
        max={durationSeconds}
        step={0.1}
        value={currentTime}
        onChange={handleSeek}
        style={{ flex: 1 }}
        tooltip={{ formatter: (v) => formatTime(v ?? 0) }}
      />
      <Text style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
        {formatTime(currentTime)} / {formatTime(durationSeconds)}
      </Text>
    </div>
  )
}
