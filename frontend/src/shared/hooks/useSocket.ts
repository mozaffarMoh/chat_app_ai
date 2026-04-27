import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { message as antMessage } from 'antd'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string

interface SocketRefs {
  chatSocket: Socket | null
  callsSocket: Socket | null
}

let chatSocketInstance: Socket | null = null
let callsSocketInstance: Socket | null = null

export function getSocketInstances(): SocketRefs {
  return { chatSocket: chatSocketInstance, callsSocket: callsSocketInstance }
}

export function useSocket(isAuthenticated: boolean): {
  chatSocket: Socket | null
  callsSocket: Socket | null
  connect: () => void
  disconnect: () => void
} {
  const chatRef = useRef<Socket | null>(null)
  const callsRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (chatRef.current?.connected) return

    const chat = io(`${SOCKET_URL}/chat`, {
      withCredentials: true,
      autoConnect: true,
    })

    const calls = io(`${SOCKET_URL}/calls`, {
      withCredentials: true,
      autoConnect: true,
    })

    chat.on('connect_error', (err) => {
      if (err.message.includes('Unauthorized')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    })

    chat.on('disconnect', () => {
      void antMessage.loading({ content: 'Reconnecting…', key: 'socket-reconnect', duration: 0 })
    })
    chat.on('connect', () => {
      antMessage.destroy('socket-reconnect')
    })

    calls.on('connect_error', (err) => {
      if (err.message.includes('Unauthorized')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    })

    chatRef.current = chat
    callsRef.current = calls
    chatSocketInstance = chat
    callsSocketInstance = calls
  }, [])

  const disconnect = useCallback(() => {
    chatRef.current?.disconnect()
    callsRef.current?.disconnect()
    chatRef.current = null
    callsRef.current = null
    chatSocketInstance = null
    callsSocketInstance = null
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      connect()
    } else {
      disconnect()
    }
    return () => {
      // keep sockets alive across re-renders; disconnected on logout
    }
  }, [isAuthenticated, connect, disconnect])

  return {
    chatSocket: chatRef.current,
    callsSocket: callsRef.current,
    connect,
    disconnect,
  }
}
