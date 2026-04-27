import { useState, useEffect, useRef, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { getSocketInstances } from '../../shared/hooks/useSocket'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

export type CallType = 'AUDIO' | 'VIDEO'
export type CallStateValue =
  | 'idle'
  | 'ringing_outgoing'
  | 'ringing_incoming'
  | 'connecting'
  | 'active'
  | 'ended'

export interface IncomingCallInfo {
  callId: string
  initiatorId: string
  initiatorName?: string
  callType: CallType
  conversationId: string
}

export interface UseCallReturn {
  callState: CallStateValue
  callType: CallType | null
  incomingCallInfo: IncomingCallInfo | null
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  initiateCall: (conversationId: string, recipientId: string, type: CallType) => Promise<void>
  acceptCall: () => void
  declineCall: () => void
  endCall: () => void
}

export function useCall(): UseCallReturn {
  const [callState, setCallState] = useState<CallStateValue>('idle')
  const [callType, setCallType] = useState<CallType | null>(null)
  const [incomingCallInfo, setIncomingCallInfo] = useState<IncomingCallInfo | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const callIdRef = useRef<string | null>(null)
  const remoteUserIdRef = useRef<string | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }
    localStreamRef.current = null
    setLocalStream(null)
    setRemoteStream(null)
    setCallState('idle')
    setCallType(null)
    setIncomingCallInfo(null)
    callIdRef.current = null
    remoteUserIdRef.current = null
  }, [])

  const getMedia = useCallback(async (type: CallType) => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'VIDEO',
    })
  }, [])

  const initiateCall = useCallback(
    async (conversationId: string, recipientId: string, type: CallType) => {
      const stream = await getMedia(type)
      localStreamRef.current = stream
      setLocalStream(stream)
      setCallType(type)
      setCallState('ringing_outgoing')
      remoteUserIdRef.current = recipientId

      const { data } = await axios.post<{ id: string }>(
        `${API_BASE}/conversations/${conversationId}/calls`,
        { recipientId, type },
        { withCredentials: true },
      )
      const callId = data.id
      callIdRef.current = callId

      const { callsSocket } = getSocketInstances()
      callsSocket?.emit('call:initiate', { callId, recipientId, callType: type, conversationId })
    },
    [getMedia],
  )

  const acceptCall = useCallback(() => {
    if (!incomingCallInfo) return
    const { callId, initiatorId, callType: type } = incomingCallInfo
    callIdRef.current = callId
    remoteUserIdRef.current = initiatorId

    void getMedia(type).then((stream) => {
      localStreamRef.current = stream
      setLocalStream(stream)
      setCallType(type)
      setCallState('connecting')

      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      })
      peerRef.current = peer

      peer.on('signal', (signal) => {
        const { callsSocket } = getSocketInstances()
        callsSocket?.emit('call:signal', {
          callId,
          recipientUserId: remoteUserIdRef.current,
          signal,
        })
      })

      peer.on('stream', (remoteStr) => {
        setRemoteStream(remoteStr)
        setCallState('active')
      })

      const { callsSocket } = getSocketInstances()
      callsSocket?.emit('call:accepted', { callId, initiatorId })
    })
  }, [incomingCallInfo, getMedia])

  const declineCall = useCallback(() => {
    if (!incomingCallInfo) return
    const { callsSocket } = getSocketInstances()
    callsSocket?.emit('call:declined', {
      callId: incomingCallInfo.callId,
      initiatorId: incomingCallInfo.initiatorId,
    })
    cleanup()
  }, [incomingCallInfo, cleanup])

  const endCall = useCallback(() => {
    const { callsSocket } = getSocketInstances()
    if (callIdRef.current && remoteUserIdRef.current) {
      callsSocket?.emit('call:ended', {
        callId: callIdRef.current,
        recipientId: remoteUserIdRef.current,
      })
    }
    cleanup()
  }, [cleanup])

  useEffect(() => {
    const { callsSocket } = getSocketInstances()
    if (!callsSocket) return

    const onIncoming = (data: IncomingCallInfo) => {
      setIncomingCallInfo(data)
      setCallState('ringing_incoming')
    }

    const onAccepted = (data: { callId: string; acceptorId: string }) => {
      remoteUserIdRef.current = data.acceptorId
      const stream = localStreamRef.current
      if (!stream) return
      setCallState('connecting')

      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      })
      peerRef.current = peer

      peer.on('signal', (signal) => {
        callsSocket.emit('call:signal', {
          callId: callIdRef.current,
          recipientUserId: data.acceptorId,
          signal,
        })
      })

      peer.on('stream', (remoteStr) => {
        setRemoteStream(remoteStr)
        setCallState('active')
      })
    }

    const onSignal = (data: { callId: string; signal: SimplePeer.SignalData }) => {
      peerRef.current?.signal(data.signal)
    }

    const onDeclined = () => cleanup()
    const onEnded = () => cleanup()
    const onBusy = () => {
      setCallState('idle')
    }

    callsSocket.on('call:incoming', onIncoming)
    callsSocket.on('call:accepted', onAccepted)
    callsSocket.on('call:signal', onSignal)
    callsSocket.on('call:declined', onDeclined)
    callsSocket.on('call:ended', onEnded)
    callsSocket.on('call:busy', onBusy)

    return () => {
      callsSocket.off('call:incoming', onIncoming)
      callsSocket.off('call:accepted', onAccepted)
      callsSocket.off('call:signal', onSignal)
      callsSocket.off('call:declined', onDeclined)
      callsSocket.off('call:ended', onEnded)
      callsSocket.off('call:busy', onBusy)
    }
  }, [cleanup])

  // Attach local stream to local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Attach remote stream to remote video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  return {
    callState,
    callType,
    incomingCallInfo,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
  }
}
