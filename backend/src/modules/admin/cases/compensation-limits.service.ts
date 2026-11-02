import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompensationLimit } from './entities/compensation-limit.entity';
import { FinanceSettingsService } from '../../finance/services/finance-settings.service';
import { toMinorUnits, fromMinorUnits } from '../../../lib/money';

/**
 * Enforces daily and monthly compensation limits per agent to prevent abuse.
 * Tracks compensation amounts across all cases handled by an agent.
 */
@Injectable()
export class CompensationLimitsService {
  private readonly logger = new Logger(CompensationLimitsService.name);

  constructor(
    @InjectRepository(CompensationLimit)
    private readonly limitRepo: Repository<CompensationLimit>,
    private readonly financeSettings: FinanceSettingsService,
  ) {}

  /**
   * Checks if an agent can approve compensation without exceeding limits.
   * Throws BadRequestException if limits would be exceeded.
   */
  async checkLimits(
    agentId: string,
    amountMinor: bigint,
    currency: string = 'ETB',
  ): Promise<{
    allowed: boolean;
    dailyUsed: bigint;
    monthlyUsed: bigint;
    dailyLimit: bigint;
    monthlyLimit: bigint;
    dailyRemaining: bigint;
    monthlyRemaining: bigint;
  }> {
    const settings = await this.financeSettings.getAllSettings();
    const dailyLimit = BigInt(settings.compensationDailyLimitMinor);
    const monthlyLimit = BigInt(settings.compensationMonthlyLimitMinor);

    const today = this.getDateString(new Date());
    const thisMonth = today.slice(0, 7); // YYYY-MM

    // Get current usage
    const [dailyRecord, monthlyRecord] = await Promise.all([
      this.limitRepo.findOne({
        where: { agentId, periodDate: today, periodType: 'DAILY', currency },
      }),
      this.limitRepo.findOne({
        where: { agentId, periodDate: thisMonth, periodType: 'MONTHLY', currency },
      }),
    ]);

    const dailyUsed = BigInt(dailyRecord?.totalMinor ?? '0');
    const monthlyUsed = BigInt(monthlyRecord?.totalMinor ?? '0');

    const newDailyTotal = dailyUsed + amountMinor;
    const newMonthlyTotal = monthlyUsed + amountMinor;

    const dailyRemaining = dailyLimit > dailyUsed ? dailyLimit - dailyUsed : 0n;
    const monthlyRemaining =
      monthlyLimit > monthlyUsed ? monthlyLimit - monthlyUsed : 0n;

    if (newDailyTotal > dailyLimit) {
      const dailyLimitDisplay = fromMinorUnits(dailyLimit);
      const dailyUsedDisplay = fromMinorUnits(dailyUsed);
      const requestedDisplay = fromMinorUnits(amountMinor);
      throw new BadRequestException(
        `Daily compensation limit exceeded. ` +
          `Limit: ${currency} ${dailyLimitDisplay}, ` +
          `Used today: ${currency} ${dailyUsedDisplay}, ` +
          `Requested: ${currency} ${requestedDisplay}. ` +
          `Request approval from a supervisor for amounts exceeding your daily limit.`,
      );
    }

    if (newMonthlyTotal > monthlyLimit) {
      const monthlyLimitDisplay = fromMinorUnits(monthlyLimit);
      const monthlyUsedDisplay = fromMinorUnits(monthlyUsed);
      const requestedDisplay = fromMinorUnits(amountMinor);
      throw new BadRequestException(
        `Monthly compensation limit exceeded. ` +
          `Limit: ${currency} ${monthlyLimitDisplay}, ` +
          `Used this month: ${currency} ${monthlyUsedDisplay}, ` +
          `Requested: ${requestedDisplay}. ` +
          `Request approval from a supervisor for amounts exceeding your monthly limit.`,
      );
    }

    return {
      allowed: true,
      dailyUsed,
      monthlyUsed,
      dailyLimit,
      monthlyLimit,
      dailyRemaining,
      monthlyRemaining,
    };
  }

  /**
   * Records compensation amount after approval.
   * Updates both daily and monthly tracking records.
   */
  async recordCompensation(
    agentId: string,
    amountMinor: bigint,
    currency: string = 'ETB',
  ): Promise<void> {
    const today = this.getDateString(new Date());
    const thisMonth = today.slice(0, 7); // YYYY-MM

    // Update daily record
    await this.incrementLimit(agentId, today, 'DAILY', amountMinor, currency);

    // Update monthly record
    await this.incrementLimit(agentId, thisMonth, 'MONTHLY', amountMinor, currency);

    this.logger.log(
      `Recorded compensation: Agent ${agentId}, ${currency} ${fromMinorUnits(amountMinor)}`,
    );
  }

  /**
   * Gets current usage statistics for an agent.
   */
  async getAgentUsage(agentId: string, currency: string = 'ETB') {
    const today = this.getDateString(new Date());
    const thisMonth = today.slice(0, 7);

    const [dailyRecord, monthlyRecord, settings] = await Promise.all([
      this.limitRepo.findOne({
        where: { agentId, periodDate: today, periodType: 'DAILY', currency },
      }),
      this.limitRepo.findOne({
        where: { agentId, periodDate: thisMonth, periodType: 'MONTHLY', currency },
      }),
      this.financeSettings.getAllSettings(),
    ]);

    const dailyUsed = BigInt(dailyRecord?.totalMinor ?? '0');
    const monthlyUsed = BigInt(monthlyRecord?.totalMinor ?? '0');
    const dailyLimit = BigInt(settings.compensationDailyLimitMinor);
    const monthlyLimit = BigInt(settings.compensationMonthlyLimitMinor);

    return {
      daily: {
        used: fromMinorUnits(dailyUsed),
        limit: fromMinorUnits(dailyLimit),
        remaining: fromMinorUnits(dailyLimit - dailyUsed),
        count: dailyRecord?.transactionCount ?? 0,
      },
      monthly: {
        used: fromMinorUnits(monthlyUsed),
        limit: fromMinorUnits(monthlyLimit),
        remaining: fromMinorUnits(monthlyLimit - monthlyUsed),
        count: monthlyRecord?.transactionCount ?? 0,
      },
      currency,
    };
  }

  private async incrementLimit(
    agentId: string,
    periodDate: string,
    periodType: 'DAILY' | 'MONTHLY',
    amountMinor: bigint,
    currency: string,
  ): Promise<void> {
    let record = await this.limitRepo.findOne({
      where: { agentId, periodDate, periodType, currency },
    });

    if (!record) {
      record = this.limitRepo.create({
        agentId,
        periodDate,
        periodType,
        totalMinor: '0',
        currency,
        transactionCount: 0,
      });
    }

    const currentTotal = BigInt(record.totalMinor);
    const newTotal = currentTotal + amountMinor;
    record.totalMinor = newTotal.toString();
    record.transactionCount += 1;

    await this.limitRepo.save(record);
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}
