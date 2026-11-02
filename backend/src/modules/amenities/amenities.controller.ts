import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AmenitiesService } from './amenities.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Amenities')
@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  /**
   * Public: Get all available amenities
   */
  @Get()
  @ApiOperation({
    summary: 'Get all amenities',
    description: 'Retrieves all available amenities categorized with icons for property listings.',
  })
  @ApiResponse({ status: 200, description: 'List of amenities' })
  async findAll() {
    return this.amenitiesService.findAll();
  }

  /**
   * Protected: Create or retrieve custom host amenity
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create or find custom amenity',
    description: 'Finds an existing amenity by name or creates a new one for host assignment.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'High-speed Fiber WiFi' },
        icon: { type: 'string', example: 'wifi', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Amenity retrieved or created' })
  @ApiResponse({ status: 400, description: 'Amenity name is required' })
  async create(@Body() body: { name: string; icon?: string }) {
    if (!body?.name?.trim()) {
      throw new BadRequestException('Amenity name is required');
    }
    return this.amenitiesService.findOrCreate(body.name, body.icon);
  }
}
