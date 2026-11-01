import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { Case } from '../admin/cases/entities/case.entity';
import { CaseMessage } from '../admin/cases/entities/case-message.entity';
import { CaseEvent } from '../admin/cases/entities/case-event.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Case,
      CaseMessage,
      CaseEvent,
      Booking,
      Property,
    ]),
    NotificationsModule,
    AuditModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}

