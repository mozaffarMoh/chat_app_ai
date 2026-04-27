import { Button, Drawer, Grid, Layout, Segmented, Typography } from 'antd'
import { MenuOutlined, PlusOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { conversationsService } from './conversations.service'
import { ConversationList } from './ConversationList'
import { ChatView } from './ChatView'
import { NewConversationModal } from './NewConversationModal'
import { BoardView } from '../board/BoardView'
import IncomingCallModal from '../calls/IncomingCallModal'
import OutgoingCallOverlay from '../calls/OutgoingCallOverlay'
import CallView from '../calls/CallView'
import { useCall } from '../../shared/hooks/useCall'
import { useSocket } from '../../shared/hooks/useSocket'
import { useAuth } from '../auth/AuthContext'
import type { Conversation } from '../../shared/types'

const { Sider, Content } = Layout
const { Title } = Typography

type ViewMode = 'list' | 'board'

export function WorkspaceLayout() {
  const { user } = useAuth()
  useSocket(!!user)
  const call = useCall()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [siderOpen, setSiderOpen] = useState(false)
  const [conversations, setConversations] = useState<
    (Conversation & { unreadCount?: number; lastMessage?: { body: string } })[]
  >([])
  const [activeId, setActiveId] = useState<string>()
  const [modalOpen, setModalOpen] = useState(false)
  const [view, setView] = useState<ViewMode>(
    () => (localStorage.getItem('workspace_view') as ViewMode | null) ?? 'list',
  )

  const load = async () => {
    const convs = (await conversationsService.getAll()) as typeof conversations
    setConversations(convs)
    if (!activeId && convs.length > 0) setActiveId(convs[0]!.id)
  }

  useEffect(() => {
    void load()
  }, [])

  const handleViewChange = (val: string | number) => {
    const v = val as ViewMode
    setView(v)
    localStorage.setItem('workspace_view', v)
  }

  if (!user) return null

  const activeConv = conversations.find((c) => c.id === activeId)
  const otherParticipant = activeConv?.participants?.find((p) => p.userId !== user.id)
  const conversationTitle =
    activeConv?.type === 'DIRECT'
      ? (otherParticipant?.user?.displayName ?? 'Direct Message')
      : (activeConv?.name ?? 'Group')

  const SiderContent = (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          Conversations
        </Title>
        <Button type="text" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} aria-label="New conversation" />
      </div>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Segmented
          block
          options={[
            { label: 'List', value: 'list' },
            { label: 'Board', value: 'board' },
          ]}
          value={view}
          onChange={handleViewChange}
        />
      </div>
      {view === 'list' && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            currentUser={user}
            onSelect={(id) => { setActiveId(id); if (isMobile) setSiderOpen(false) }}
            onNewConversation={() => setModalOpen(true)}
          />
        </div>
      )}
    </>
  )

  return (
    <Layout style={{ height: '100%' }}>
      {isMobile ? (
        <Drawer
          open={siderOpen}
          placement="left"
          onClose={() => setSiderOpen(false)}
          width={300}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
          title={null}
        >
          {SiderContent}
        </Drawer>
      ) : (
        <Sider
          width={300}
          theme="light"
          style={{ borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}
        >
          {SiderContent}
        </Sider>
      )}

      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {isMobile && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <Button icon={<MenuOutlined />} onClick={() => setSiderOpen(true)} aria-label="Open conversations" />
          </div>
        )}
        {view === 'board' ? (
          <BoardView
            conversations={conversations}
            currentUser={user}
            onSelectConversation={(id) => {
              setActiveId(id)
              setView('list')
            }}
          />
        ) : activeId && activeConv ? (
          <ChatView
            conversationId={activeId}
            conversationTitle={conversationTitle}
            currentUser={user}
            recipientId={otherParticipant?.userId}
            onStartCall={(type) => {
              if (otherParticipant?.userId) {
                void call.initiateCall(activeId, otherParticipant.userId, type)
              }
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#999',
            }}
          >
            Select a conversation to start chatting
          </div>
        )}
      </Content>

      <NewConversationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(conv) => {
          setConversations((prev) => [conv as (typeof prev)[0], ...prev])
          setActiveId(conv.id)
        }}
      />

      {/* Call overlays */}
      {call.callState === 'ringing_incoming' && call.incomingCallInfo && (
        <IncomingCallModal
          info={call.incomingCallInfo}
          onAccept={call.acceptCall}
          onDecline={call.declineCall}
        />
      )}
      {call.callState === 'ringing_outgoing' && call.callType && (
        <OutgoingCallOverlay
          recipientId={otherParticipant?.userId ?? ''}
          callType={call.callType}
          onCancel={call.endCall}
        />
      )}
      {(call.callState === 'connecting' || call.callState === 'active') && call.callType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: '#000',
          }}
        >
          <CallView
            callType={call.callType}
            localVideoRef={call.localVideoRef}
            remoteVideoRef={call.remoteVideoRef}
            localStream={call.localStream}
            onEndCall={call.endCall}
          />
        </div>
      )}
    </Layout>
  )
}
