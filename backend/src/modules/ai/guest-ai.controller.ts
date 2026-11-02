import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuestAiService } from './guest-ai.service';
import {
  ConversationalSearchDto,
  GuestRecommendationsDto,
  ComparePropertiesDto,
  BookingAssistantDto,
} from './guest-ai.dto';

@ApiTags('AI Services')
@Controller('ai/guest')
export class GuestAiController {
  constructor(private readonly guestAiService: GuestAiService) {}

  /**
   * 1. Conversational Property Search
   * Interprets natural language queries (location, budget, guests, amenities),
   * applies validated filters, and searches real properties in PostgreSQL.
   */
  @Post('conversational-search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Conversational property search',
    description: 'Understands natural language search queries ("quiet apartment in Bole near Edna Mall for 3 people under 3000 ETB") and returns matched database listings.',
  })
  @ApiResponse({ status: 200, description: 'Natural language search results and applied filters' })
  async conversationalSearch(@Body() dto: ConversationalSearchDto) {
    return this.guestAiService.conversationalSearch(dto);
  }

  /**
   * 2. Personalized Property Recommendations
   * Recommends relevant properties based on guest booking history,
   * saved preferences, target budget, and verified ratings.
   */
  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Personalized guest recommendations',
    description: 'Generates tailored property recommendations based on user travel history, current search intent, and ratings.',
  })
  @ApiResponse({ status: 200, description: 'Personalized property recommendations' })
  async getRecommendations(
    @Body() dto: GuestRecommendationsDto,
    @Req() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.id || user?.userId || user?.sub;
    return this.guestAiService.getPersonalizedRecommendations(userId, dto);
  }

  /**
   * 3. AI Property Comparison
   * Performs side-by-side comparison of 2-4 real properties,
   * highlights price, space, amenities tradeoffs, and gives grounded recommendation.
   */
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI property comparison',
    description: 'Performs side-by-side analysis of 2-4 listings, highlighting price, amenities, distance, and suited traveler types.',
  })
  @ApiResponse({ status: 200, description: 'Comparison breakdown and synthesized verdict' })
  async compareProperties(@Body() dto: ComparePropertiesDto) {
    return this.guestAiService.compareProperties(dto);
  }

  /**
   * 4. AI Booking Assistant
   * Answers questions about property amenities, rules, live availability,
   * and (for authenticated guests) reservation status, payments, and cancellation rules.
   */
  @Post('booking-assistant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'AI guest booking assistant',
    description: 'Answers guest queries about property amenities, rules, check-in policies, and reservation status using grounded platform data.',
  })
  @ApiResponse({ status: 200, description: 'Assistant answer with follow-up suggestions' })
  async bookingAssistantChat(
    @Body() dto: BookingAssistantDto,
    @Req() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.id || user?.userId || user?.sub;
    return this.guestAiService.bookingAssistantChat(userId, dto);
  }
}
