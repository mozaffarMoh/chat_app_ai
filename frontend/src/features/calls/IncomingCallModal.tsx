import React from 'react'
import { Modal, Avatar, Space, Typography, Button } from 'antd'
import { PhoneOutlined } from '@ant-design/icons'
import type { IncomingCallInfo } from '../../shared/hooks/useCall'

interface Props {
  info: IncomingCallInfo
  onAccept: () => void
  onDecline: () => void
}

const IncomingCallModal: React.FC<Props> = ({ info, onAccept, onDecline }) => {
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
          {(info.initiatorName ?? info.initiatorId)[0]?.toUpperCase()}
        </Avatar>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {info.initiatorName ?? info.initiatorId}
          </Typography.Title>
          <Typography.Text type="secondary">
            Incoming {info.callType === 'VIDEO' ? 'Video' : 'Audio'} Call
          </Typography.Text>
        </div>
        <Space size="large">
          <Button
            danger
            type="primary"
            shape="circle"
            size="large"
            icon={<PhoneOutlined rotate={135} />}
            onClick={onDecline}
            aria-label="Decline call"
          />
          <Button
            type="primary"
            shape="circle"
            size="large"
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            icon={<PhoneOutlined rotate={135} />}
            onClick={onAccept}
            aria-label="Accept call"
          />
        </Space>
      </Space>
    </Modal>
  )
}

export default IncomingCallModal
