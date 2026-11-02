import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

class MyReportsQueryDto {
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
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Report a listing or user violation',
    description: 'Submits a content moderation or safety report against a property listing or user.',
  })
  @ApiResponse({ status: 201, description: 'Report submitted successfully' })
  create(@Body() dto: CreateReportDto, @GetUser() user: User) {
    return this.reportsService.create(dto, user);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List my submitted reports',
    description: 'Retrieves all reports filed by the current user with moderation status.',
  })
  @ApiResponse({ status: 200, description: 'List of user reports' })
  listMine(@GetUser() user: User, @Query() query: MyReportsQueryDto) {
    return this.reportsService.listMine(user.id, query.page, query.limit);
  }
}
