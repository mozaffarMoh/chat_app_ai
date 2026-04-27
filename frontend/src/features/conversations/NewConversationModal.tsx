import { Form, Input, Modal, Radio, Select } from 'antd'
import { useState } from 'react'
import { conversationsService } from './conversations.service'
import api from '../../shared/services/api'
import type { Conversation, User } from '../../shared/types'

interface NewConversationModalProps {
  open: boolean
  onClose: () => void
  onCreated: (conversation: Conversation) => void
}

export function NewConversationModal({ open, onClose, onCreated }: NewConversationModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'DIRECT' | 'GROUP'>('DIRECT')
  const [userOptions, setUserOptions] = useState<{ value: string; label: string }[]>([])
  const [searching, setSearching] = useState(false)

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) return
    setSearching(true)
    try {
      const res = await api.get<{ data: User[] }>('/users/search', { params: { q: query } })
      setUserOptions(res.data.data.map((u) => ({ value: u.id, label: u.displayName ?? u.email })))
    } finally {
      setSearching(false)
    }
  }

  const handleOk = async () => {
    try {
      const values = (await form.validateFields()) as {
        participantIds: string[]
        name?: string
      }
      setLoading(true)
      const conv = await conversationsService.create({
        type,
        participantIds: values.participantIds,
        name: values.name,
      })
      onCreated(conv)
      form.resetFields()
      onClose()
    } catch {
      // validation error handled by antd
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="New Conversation"
      open={open}
      onOk={() => void handleOk()}
      onCancel={onClose}
      confirmLoading={loading}
      okText="Create"
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ type: 'DIRECT' }}>
        <Form.Item label="Type">
          <Radio.Group value={type} onChange={(e) => setType(e.target.value as 'DIRECT' | 'GROUP')}>
            <Radio value="DIRECT">Direct</Radio>
            <Radio value="GROUP">Group</Radio>
          </Radio.Group>
        </Form.Item>

        {type === 'GROUP' && (
          <Form.Item
            name="name"
            label="Group Name"
            rules={[{ required: true, message: 'Please enter a group name' }]}
          >
            <Input placeholder="e.g. Engineering Team" />
          </Form.Item>
        )}

        <Form.Item
          name="participantIds"
          label={type === 'DIRECT' ? 'User' : 'Participants'}
          rules={[{ required: true, message: 'Please select at least one user' }]}
        >
          <Select
            mode={type === 'GROUP' ? 'multiple' : undefined}
            placeholder="Search by name or email"
            filterOption={false}
            onSearch={(q) => void searchUsers(q)}
            loading={searching}
            options={userOptions}
            showSearch
            onChange={(val) => {
              // For direct, enforce single value as array
              if (type === 'DIRECT' && typeof val === 'string') {
                form.setFieldValue('participantIds', [val])
              }
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
