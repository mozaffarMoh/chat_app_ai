import React from 'react'
import { Modal, Avatar, Button, Space, Spin, Typography } from 'antd'
import { PhoneOutlined } from '@ant-design/icons'

interface Props {
  recipientId: string
  recipientName?: string
  callType: 'AUDIO' | 'VIDEO'
  onCancel: () => void
}

const OutgoingCallOverlay: React.FC<Props> = ({ recipientId, recipientName, callType, onCancel }) => {
  const displayName = recipientName ?? recipientId
  return (
    <Modal
      open
      closable={false}
      footer={null}
      centered
      width={360}
      styles={{ body: { textAlign: 'center', padding: '32px 24px' } }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Avatar size={72} style={{ backgroundColor: '#1677ff', fontSize: 28 }}>
          {displayName[0]?.toUpperCase()}
        </Avatar>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {displayName}
          </Typography.Title>
          <Space>
            <Spin size="small" />
            <Typography.Text type="secondary">
              Calling ({callType === 'VIDEO' ? 'Video' : 'Audio'})…
            </Typography.Text>
          </Space>
        </div>
        <Button
          danger
          type="primary"
          shape="circle"
          size="large"
          icon={<PhoneOutlined rotate={135} />}
          onClick={onCancel}
          aria-label="Cancel call"
        />
      </Space>
    </Modal>
  )
}

export default OutgoingCallOverlay
