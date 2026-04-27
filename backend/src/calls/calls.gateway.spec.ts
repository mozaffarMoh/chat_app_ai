import { Test, type TestingModule } from '@nestjs/testing';
import { CallsGateway } from './calls.gateway.js';
import { CallsService } from './calls.service.js';

const mockCallsService = {
  getUserActiveCallSession: jest.fn(),
  updateStatus: jest.fn(),
};

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

const mockSocket = {
  id: 'socket-1',
  data: { userId: 'user-1' },
  join: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
};

describe('CallsGateway', () => {
  let gateway: CallsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsGateway,
        { provide: CallsService, useValue: mockCallsService },
      ],
    }).compile();

    gateway = module.get<CallsGateway>(CallsGateway);
    (gateway as unknown as { server: unknown }).server = mockServer;
    jest.clearAllMocks();
  });

  describe('call:signal', () => {
    it('relays signal to the specified socket ID', () => {
      gateway.handleSignal({
        callId: 'call-1',
        recipientSocketId: 'socket-2',
        signal: { type: 'offer' },
      });
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'call:signal',
        expect.objectContaining({ callId: 'call-1' }),
      );
    });
  });

  describe('call:initiate', () => {
    it('emits call:busy when recipient is already in a call', async () => {
      mockCallsService.getUserActiveCallSession.mockResolvedValue({
        id: 'existing-call',
      });

      gateway.handleInitiate(mockSocket as never, {
        callId: 'call-1',
        recipientId: 'user-2',
        callType: 'AUDIO',
        conversationId: 'conv-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockSocket.emit).toHaveBeenCalledWith('call:busy', {
        recipientId: 'user-2',
      });
    });

    it('forwards call:incoming to recipient when available', async () => {
      mockCallsService.getUserActiveCallSession.mockResolvedValue(null);

      gateway.handleInitiate(mockSocket as never, {
        callId: 'call-1',
        recipientId: 'user-2',
        callType: 'VIDEO',
        conversationId: 'conv-1',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockServer.to).toHaveBeenCalledWith('user:user-2');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'call:incoming',
        expect.objectContaining({ callId: 'call-1' }),
      );
    });
  });

  describe('disconnect during active call', () => {
    it('emits call:ended to the other party and updates status', async () => {
      const session = {
        id: 'call-1',
        initiatorId: 'user-1',
        recipientId: 'user-2',
        status: 'ACTIVE',
      };
      mockCallsService.getUserActiveCallSession.mockResolvedValue(session);
      mockCallsService.updateStatus.mockResolvedValue({
        ...session,
        status: 'ENDED',
      });

      gateway.handleDisconnect(mockSocket as never);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockServer.to).toHaveBeenCalledWith('user:user-2');
      expect(mockServer.emit).toHaveBeenCalledWith('call:ended', {
        callId: 'call-1',
      });
    });
  });
});
