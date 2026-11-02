# Compensation Limits Implementation Guide

## Summary
Implement daily and monthly compensation limits per agent to prevent abuse while allowing legitimate customer service actions.

## Components Created

### 1. Database Entity
**File**: `backend/src/modules/admin/cases/entities/compensation-limit.entity.ts`

Tracks compensation amounts per agent with:
- Daily tracking (YYYY-MM-DD)
- Monthly tracking (YYYY-MM)
- Total amount in minor units
- Transaction count
- Currency

### 2. Service
**File**: `backend/src/modules/admin/cases/compensation-limits.service.ts`

Provides:
- `checkLimits(agentId, amountMinor, currency)`: Validates before proposing
- `recordCompensation(agentId, amountMinor, currency)`: Records after approval
- `getAgentUsage(agentId, currency)`: Returns current usage stats

### 3. Settings
**Updated**: `backend/src/modules/finance/services/finance-settings.service.ts`

Added settings:
- `compensationDailyLimitMinor`: Default 50000 (500 ETB / ~$5)
- `compensationMonthlyLimitMinor`: Default 500000 (5000 ETB / ~$50)

## Integration Steps

### Step 1: Add Entity to Module
Edit `backend/src/modules/admin/cases/admin-cases.module.ts`:

```typescript
import { CompensationLimit } from './entities/compensation-limit.entity';
import { CompensationLimitsService } from './compensation-limits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Case,
      CaseMessage,
      CaseNote,
      CaseAttachment,
      CaseEvent,
      CannedResponse,
      CompensationLimit, // ADD THIS
      Booking,
      Property,
      Report,
      User,
    ]),
  ],
  controllers: [AdminCasesController],
  providers: [AdminCasesService, CompensationLimitsService], // ADD CompensationLimitsService
  exports: [AdminCasesService],
})
export class AdminCasesModule {}
```

### Step 2: Inject Service into AdminCasesService
Edit `backend/src/modules/admin/cases/admin-cases.service.ts`:

Add to constructor:
```typescript
constructor(
  // ... existing injections ...
  private readonly compensationLimitsService: CompensationLimitsService,
) {}
```

### Step 3: Enforce Limits in proposeCompensation
In `proposeCompensation` method, uncomment the limit check:

```typescript
// Check compensation limits for the proposer
const amountMinor = toMinorUnits(dto.amount);
const currency = dto.currency || 'ETB';

// Enforce limits - throws BadRequestException if exceeded
await this.compensationLimitsService.checkLimits(actor.id, amountMinor, currency);
```

### Step 4: Record Usage in decideCompensation
In `decideCompensation` method, after approval:

```typescript
if (decision === 'approve') {
  // ... existing code ...
  
  // Record compensation usage for the approver (not proposer)
  const amountMinor = toMinorUnits(Number(supportCase.compensationAmount));
  await this.compensationLimitsService.recordCompensation(
    actor.id,
    amountMinor,
    supportCase.compensationCurrency,
  );
}
```

### Step 5: Create Migration
```bash
cd backend
npm run migration:generate -- src/database/migrations/AddCompensationLimits
npm run migration:run
```

### Step 6: Add Endpoint to Check Limits
In `admin-cases.controller.ts`, add:

```typescript
@Get('my-compensation-usage')
@UseGuards(JwtAuthGuard, AdminGuard)
@RequirePermissions(Permission.CASES_COMPENSATE)
async getMyCompensationUsage(@CurrentUser() user: User) {
  return this.compensationLimitsService.getAgentUsage(user.id);
}
```

## Default Limits

- **Daily**: 50,000 ETB (≈ $500 at 100 ETB/$1)
- **Monthly**: 500,000 ETB (≈ $5,000)

Configurable via finance settings.

## Error Messages

When limit exceeded:
```
Daily compensation limit exceeded. 
Limit: ETB 500.00, Used today: ETB 450.00, Requested: ETB 100.00. 
Request approval from a supervisor for amounts exceeding your daily limit.
```

## Testing

1. **Test daily limit**:
   - Propose multiple compensations until daily limit reached
   - Verify error on exceeding

2. **Test monthly limit**:
   - Propose compensations across multiple days
   - Verify monthly total is tracked correctly

3. **Test limit reset**:
   - Verify daily limits reset at midnight
   - Verify monthly limits reset on first of month

4. **Test multi-currency** (if supported):
   - Verify limits are per-currency

## Security Considerations

1. **Separation of duties**: Proposer ≠ Approver enforced
2. **Limit tracking**: Per approver (not proposer) to prevent circumvention
3. **Audit trail**: All checks and recordings logged
4. **Super Admin bypass**: Consider if Super Admins should have unlimited compensation (currently they don't - this is intentional)

## Future Enhancements

1. **Escalation workflow**: Auto-request supervisor approval when limit exceeded
2. **Temporary limit increases**: Allow temporary limit elevation with justification
3. **Anomaly detection**: Alert on unusual compensation patterns
4. **Per-role limits**: Different limits for Support Agent vs Booking Manager
5. **Approval chains**: Large compensations require multiple approvals
