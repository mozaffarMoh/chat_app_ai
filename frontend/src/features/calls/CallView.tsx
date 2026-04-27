import React, { useState, useEffect } from 'react'
import { Button, Space, Typography } from 'antd'
import { AudioMutedOutlined, AudioOutlined, PhoneOutlined } from '@ant-design/icons'

interface Props {
  callType: 'AUDIO' | 'VIDEO'
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  localStream: MediaStream | null
  onEndCall: () => void
}

const CallView: React.FC<Props> = ({
  callType,
  localVideoRef,
  remoteVideoRef,
  localStream,
  onEndCall,
}) => {
  const [muted, setMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t: MediaStreamTrack) => {
        t.enabled = !muted
      })
    }
  }, [muted, localStream])

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        background: '#000',
        color: '#fff',
      }}
    >
      {callType === 'VIDEO' ? (
        <div style={{ position: 'relative', width: '100%', maxWidth: 800 }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: '100%', borderRadius: 8 }}
            aria-label="Remote video"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 160,
              borderRadius: 6,
              border: '2px solid #fff',
            }}
            aria-label="Local video"
          />
        </div>
      ) : (
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AudioOutlined style={{ fontSize: 48, color: '#fff' }} />
        </div>
      )}

      <Typography.Text style={{ color: '#fff', fontSize: 20 }}>
        {formatTime(elapsed)}
      </Typography.Text>

      <Space>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={muted ? <AudioMutedOutlined /> : <AudioOutlined />}
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute' : 'Mute'}
        />
        <Button
          danger
          type="primary"
          shape="circle"
          size="large"
          icon={<PhoneOutlined rotate={135} />}
          onClick={onEndCall}
          aria-label="End call"
        />
      </Space>
    </div>
  )
}

export default CallView
