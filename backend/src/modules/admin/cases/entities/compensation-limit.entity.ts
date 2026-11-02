import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Tracks compensation amounts per agent to enforce daily and monthly limits.
 * Prevents abuse while allowing legitimate customer service actions.
 */
@Entity('compensation_limits')
@Index('idx_compensation_limits_agent_date', ['agentId', 'periodDate'])
export class CompensationLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'date', name: 'period_date' })
  periodDate: string; // YYYY-MM-DD format

  @Column({ type: 'varchar', length: 10, name: 'period_type' })
  periodType: 'DAILY' | 'MONTHLY';

  @Column({ type: 'bigint', name: 'total_minor', default: '0' })
  totalMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'int', name: 'transaction_count', default: 0 })
  transactionCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
