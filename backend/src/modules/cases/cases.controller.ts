import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CasesService } from './cases.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import {
  AddUserCaseMessageDto,
  CreateUserCaseDto,
  DecideCaseCompensationDto,
} from './dto/user-case.dto';

class QueryUserCasesDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

@ApiTags('Cases & Reports')
@ApiBearerAuth('JWT-auth')
@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  /**
   * Submit a new support ticket / dispute.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit support ticket or dispute',
    description: 'Creates a new customer support case or booking dispute ticket.',
  })
  @ApiResponse({ status: 201, description: 'Support case created' })
  create(@Body() dto: CreateUserCaseDto, @GetUser() user: User) {
    return this.casesService.create(dto, user);
  }

  /**
   * List all support tickets created by the authenticated user.
   */
  @Get('mine')
  @ApiOperation({
    summary: 'List my support cases',
    description: 'Retrieves all support cases filed by the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Paginated user cases' })
  listMine(@GetUser() user: User, @Query() query: QueryUserCasesDto) {
    return this.casesService.listMine(user, query.page, query.limit);
  }

  /**
   * Retrieve case details and public conversation thread.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get case details and message history',
    description: 'Retrieves case metadata, triage status, and conversation history.',
  })
  @ApiParam({ name: 'id', description: 'Case UUID' })
  @ApiResponse({ status: 200, description: 'Case detail object' })
  detail(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.casesService.detail(id, user);
  }

  /**
   * Send an inbound reply from the customer.
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add message to case thread',
    description: 'Sends a reply message to customer support within an existing case thread.',
  })
  @ApiParam({ name: 'id', description: 'Case UUID' })
  @ApiResponse({ status: 201, description: 'Message added to case' })
  addMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddUserCaseMessageDto,
    @GetUser() user: User,
  ) {
    return this.casesService.addMessage(id, dto, user);
  }

  /**
   * Customer accepts or declines staff-proposed compensation.
   */
  @Post(':id/compensation/decide')
  @ApiOperation({
    summary: 'Accept or decline proposed compensation',
    description: 'Records customer decision on a support-offered refund or travel credit compensation.',
  })
  @ApiParam({ name: 'id', description: 'Case UUID' })
  @ApiResponse({ status: 200, description: 'Compensation decision recorded' })
  decideCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideCaseCompensationDto,
    @GetUser() user: User,
  ) {
    return this.casesService.decideCompensation(id, dto, user);
  }
}
