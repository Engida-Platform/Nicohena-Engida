import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Reviews')
@Controller('properties/:propertyId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Public: Get all reviews for a property with average rating
   */
  @Get()
  @ApiOperation({
    summary: 'Get public property reviews',
    description: 'Retrieves all approved reviews for a property along with aggregate rating metrics.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'List of reviews with rating breakdown' })
  async findByProperty(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.reviewsService.findByProperty(propertyId);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if user has reviewed property',
    description: 'Returns whether the authenticated user has already submitted a review for this property.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Review status object' })
  async hasReviewed(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @GetUser() user: User,
  ) {
    return this.reviewsService.hasReviewed(propertyId, user.id);
  }

  /**
   * Protected: Submit a review for a property (must have a completed booking)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit a guest review',
    description: 'Submits a 1-5 star review and comment. Requires a completed booking for the property by the authenticated guest.',
  })
  @ApiParam({ name: 'propertyId', description: 'Property UUID' })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 400, description: 'User does not have a completed stay or has already reviewed' })
  async create(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() createReviewDto: CreateReviewDto,
    @GetUser() user: User,
  ) {
    return this.reviewsService.create(propertyId, createReviewDto, user.id);
  }
}
