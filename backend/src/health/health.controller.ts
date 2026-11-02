import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Admin - System & Audit')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Platform health probe',
    description: 'Returns operational status and server timestamp for uptime monitoring.',
  })
  @ApiResponse({ status: 200, description: 'Service operational' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
