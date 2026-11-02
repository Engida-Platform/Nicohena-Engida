import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { GuestAiService } from './guest-ai.service';
import {
  ConversationalSearchDto,
  GuestRecommendationsDto,
  ComparePropertiesDto,
  BookingAssistantDto,
} from './guest-ai.dto';

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
  async bookingAssistantChat(
    @Body() dto: BookingAssistantDto,
    @Req() req?: any,
  ) {
    const user = req?.user;
    const userId = user?.id || user?.userId || user?.sub;
    return this.guestAiService.bookingAssistantChat(userId, dto);
  }
}
