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
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  /**
   * Submit a new support ticket / dispute.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserCaseDto, @GetUser() user: User) {
    return this.casesService.create(dto, user);
  }

  /**
   * List all support tickets created by the authenticated user.
   */
  @Get('mine')
  listMine(@GetUser() user: User, @Query() query: QueryUserCasesDto) {
    return this.casesService.listMine(user, query.page, query.limit);
  }

  /**
   * Retrieve case details and public conversation thread.
   */
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.casesService.detail(id, user);
  }

  /**
   * Send an inbound reply from the customer.
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
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
  decideCompensation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideCaseCompensationDto,
    @GetUser() user: User,
  ) {
    return this.casesService.decideCompensation(id, dto, user);
  }
}

