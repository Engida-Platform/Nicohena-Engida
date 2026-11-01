import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CasesService } from './cases.service';
import {
  Case,
  CaseCategory,
  CasePriority,
  CaseSeverity,
  CaseStatus,
  CaseType,
  CompensationStatus,
} from '../admin/cases/entities/case.entity';
import { User, UserRole } from '../../users/entities/user.entity';

describe('CasesService (User Support & Dispute Center)', () => {
  let service: CasesService;
  let mockCaseRepo: any;
  let mockMessageRepo: any;
  let mockEventRepo: any;
  let mockBookingRepo: any;
  let mockPropertyRepo: any;
  let mockNotificationsService: any;
  let mockAuditService: any;

  const mockUser: User = {
    id: 'user-uuid-1',
    role: UserRole.USER,
    name: 'Abebe Kebede',
    email: 'abebe@example.com',
  } as User;

  const mockOtherUser: User = {
    id: 'user-uuid-2',
    role: UserRole.USER,
    name: 'Almaz Ayana',
    email: 'almaz@example.com',
  } as User;

  beforeEach(() => {
    mockCaseRepo = {
      create: jest.fn().mockImplementation((c) => ({ id: 'case-uuid-1', ...c })),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockMessageRepo = {
      create: jest.fn().mockImplementation((m) => ({ id: 'msg-uuid-1', ...m })),
      save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
    };

    mockEventRepo = {
      create: jest.fn().mockImplementation((e) => ({ id: 'evt-uuid-1', ...e })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    mockBookingRepo = {
      findOne: jest.fn(),
    };

    mockPropertyRepo = {
      findOne: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    service = new CasesService(
      mockCaseRepo,
      mockMessageRepo,
      mockEventRepo,
      mockBookingRepo,
      mockPropertyRepo,
      mockNotificationsService,
      mockAuditService,
    );
  });

  describe('create', () => {
    it('successfully creates a case with initial message and audit log', async () => {
      const dto = {
        subject: 'WiFi not working during stay',
        category: CaseCategory.BOOKING,
        description: 'The router in unit 3B was powered down and no network credentials worked.',
      };

      const result = await service.create(dto, mockUser);

      expect(result).toBeDefined();
      expect(result.subject).toBe(dto.subject);
      expect(result.category).toBe(CaseCategory.BOOKING);
      expect(result.status).toBe(CaseStatus.OPEN);
      expect(result.requesterUserId).toBe(mockUser.id);
      expect(result.number).toMatch(/^CAS-\d{4}-[A-Z0-9]{6}$/);

      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: dto.description,
          authorName: mockUser.name,
          createdById: mockUser.id,
        }),
      );
      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'case.created',
          actorId: mockUser.id,
        }),
      );
      expect(mockAuditService.record).toHaveBeenCalled();
    });

    it('throws NotFoundException when linked bookingId does not exist', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            subject: 'Damaged item',
            category: CaseCategory.BOOKING,
            description: 'Something broke in the apartment',
            bookingId: '00000000-0000-0000-0000-000000000000',
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMine', () => {
    it('returns paginated cases for authenticated user', async () => {
      const mockCases = [
        { id: 'c1', requesterUserId: mockUser.id, subject: 'Case 1' },
      ];
      mockCaseRepo.findAndCount.mockResolvedValue([mockCases, 1]);

      const res = await service.listMine(mockUser, 1, 10);
      expect(res.total).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(mockCaseRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { requesterUserId: mockUser.id },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('detail', () => {
    it('returns case detail and messages when user owns the case', async () => {
      const mockCase = {
        id: 'c1',
        requesterUserId: mockUser.id,
        subject: 'Case 1',
        messages: [
          { id: 'm1', createdAt: new Date('2026-04-10T10:00:00Z'), body: 'First' },
          { id: 'm2', createdAt: new Date('2026-04-10T12:00:00Z'), body: 'Second' },
        ],
      };
      mockCaseRepo.findOne.mockResolvedValue(mockCase);

      const res = await service.detail('c1', mockUser);
      expect(res.id).toBe('c1');
      expect(res.messages).toHaveLength(2);
    });

    it('throws ForbiddenException when another user tries to view the case', async () => {
      const mockCase = {
        id: 'c1',
        requesterUserId: mockOtherUser.id,
      };
      mockCaseRepo.findOne.mockResolvedValue(mockCase);

      await expect(service.detail('c1', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addMessage', () => {
    it('adds inbound reply and sets case status to WAITING_ON_INTERNAL', async () => {
      const mockCase = {
        id: 'c1',
        requesterUserId: mockUser.id,
        status: CaseStatus.WAITING_ON_REQUESTER,
      };
      mockCaseRepo.findOne.mockResolvedValue(mockCase);

      const msg = await service.addMessage(
        'c1',
        { body: 'I have attached the requested photos.' },
        mockUser,
      );

      expect(msg.body).toBe('I have attached the requested photos.');
      expect(mockCase.status).toBe(CaseStatus.WAITING_ON_INTERNAL);
      expect(mockCaseRepo.save).toHaveBeenCalledWith(mockCase);
    });

    it('throws BadRequestException if case is CLOSED', async () => {
      const mockCase = {
        id: 'c1',
        requesterUserId: mockUser.id,
        status: CaseStatus.CLOSED,
      };
      mockCaseRepo.findOne.mockResolvedValue(mockCase);

      await expect(
        service.addMessage('c1', { body: 'Hello?' }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('decideCompensation', () => {
    it('updates compensationStatus to APPROVED when user accepts offer', async () => {
      const mockCase = {
        id: 'c1',
        requesterUserId: mockUser.id,
        compensationStatus: CompensationStatus.PROPOSED,
        compensationAmountMinor: '50000',
      };
      mockCaseRepo.findOne.mockResolvedValue(mockCase);

      const updated = await service.decideCompensation(
        'c1',
        { action: 'ACCEPT', note: 'Thank you for resolving this' },
        mockUser,
      );

      expect(updated.compensationStatus).toBe(CompensationStatus.APPROVED);
      expect(mockEventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'compensation.accept' }),
      );
    });

    it('throws BadRequestException if compensationStatus is not PROPOSED', async () => {
      const mockCase = {
        id: 'c1',
        requesterUserId: mockUser.id,
        compensationStatus: CompensationStatus.NONE,
      };
      mockCaseRepo.findOne.mockResolvedValue(mockCase);

      await expect(
        service.decideCompensation('c1', { action: 'ACCEPT' }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
