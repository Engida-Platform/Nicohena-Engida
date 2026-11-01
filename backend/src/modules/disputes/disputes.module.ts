import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Case } from '../admin/cases/entities/case.entity';
import { CaseMessage } from '../admin/cases/entities/case-message.entity';
import { CaseEvent } from '../admin/cases/entities/case-event.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { EscrowHold } from '../finance/entities/escrow-hold.entity';
import { User } from '../../users/entities/user.entity';
import { FinanceModule } from '../finance/finance.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Case,
      CaseMessage,
      CaseEvent,
      Booking,
      Property,
      EscrowHold,
      User,
    ]),
    FinanceModule,
    NotificationsModule,
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}

