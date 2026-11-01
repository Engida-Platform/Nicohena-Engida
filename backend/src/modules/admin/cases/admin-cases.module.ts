import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCasesController } from './admin-cases.controller';
import { AdminCasesService } from './admin-cases.service';
import { Case } from './entities/case.entity';
import { CaseMessage } from './entities/case-message.entity';
import { CaseNote } from './entities/case-note.entity';
import { CaseAttachment } from './entities/case-attachment.entity';
import { CaseEvent } from './entities/case-event.entity';
import { CannedResponse } from './entities/canned-response.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Property } from '../../properties/entities/property.entity';
import { Report } from '../../reports/entities/report.entity';
import { User } from '../../../users/entities/user.entity';
import { EscrowHold } from '../../finance/entities/escrow-hold.entity';
import { FinanceModule } from '../../finance/finance.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Case,
      CaseMessage,
      CaseNote,
      CaseAttachment,
      CaseEvent,
      CannedResponse,
      Booking,
      Property,
      Report,
      User,
      EscrowHold,
    ]),
    NotificationsModule,
    AuditModule,
    forwardRef(() => FinanceModule),
  ],
  controllers: [AdminCasesController],
  providers: [AdminCasesService],
  exports: [AdminCasesService],
})
export class AdminCasesModule {}
