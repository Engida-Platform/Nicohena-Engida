import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewModerationStatus } from './entities/review.entity';
import { Property } from '../properties/entities/property.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async findByProperty(propertyId: string): Promise<{
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
  }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    const reviews = await this.reviewRepository
      .createQueryBuilder('review')
      .select([
        'review.id',
        'review.propertyId',
        'review.rating',
        'review.comment',
        'review.createdAt',
      ])
      .leftJoin('review.user', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('review.propertyId = :propertyId', { propertyId })
      .andWhere('review.moderationStatus = :moderationStatus', {
        moderationStatus: ReviewModerationStatus.VISIBLE,
      })
      .orderBy('review.createdAt', 'DESC')
      .getMany();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10,
          ) / 10
        : 0;

    return { reviews, averageRating, totalReviews };
  }

  async hasReviewed(propertyId: string, userId: string): Promise<{ hasReviewed: boolean }> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId }, select: ['id'] });
    if (!property) throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    const existing = await this.reviewRepository.findOne({ where: { propertyId, userId }, select: ['id'] });
    return { hasReviewed: Boolean(existing) };
  }

  async create(
    propertyId: string,
    createReviewDto: CreateReviewDto,
    userId: string,
  ): Promise<Review> {
    try {
      let savedHostId: string | null = null;
      let savedPropertyTitle: string | null = null;

      const saved = await this.reviewRepository.manager.transaction(async (manager) => {
        const propertyRepository = manager.getRepository(Property);
        const reviewRepository = manager.getRepository(Review);
        const bookingRepository = manager.getRepository(Booking);

        // Serialize reviews for this property; the unique index is the final concurrency guard.
        const property = await propertyRepository.findOne({
          where: { id: propertyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!property) {
          throw new NotFoundException(`Property with ID "${propertyId}" not found`);
        }
        if (property.hostId === userId) {
          throw new BadRequestException('You cannot review your own property');
        }

        savedHostId = property.hostId;
        savedPropertyTitle = property.title;

        // If the guest already submitted a review, update it seamlessly
        let review = await reviewRepository.findOne({ where: { propertyId, userId } });
        if (review) {
          review.rating = createReviewDto.rating;
          if (createReviewDto.comment !== undefined) {
            review.comment = createReviewDto.comment;
          }
          review.moderationStatus = ReviewModerationStatus.VISIBLE;
          return reviewRepository.save(review);
        }

        review = reviewRepository.create({
          propertyId,
          userId,
          rating: createReviewDto.rating,
          comment: createReviewDto.comment || null,
          moderationStatus: ReviewModerationStatus.VISIBLE,
        });
        return reviewRepository.save(review);
      });

      this.logger.log(
        `Review created by user ${userId} for property ${propertyId} (rating: ${createReviewDto.rating})`,
      );

      if (this.notificationsService && savedHostId) {
        try {
          await this.notificationsService.createNotification({
            userId: savedHostId,
            type: NotificationType.BOOKING_COMPLETED,
            title: 'New Guest Review',
            message: `A guest left a ${createReviewDto.rating}-star review for "${savedPropertyTitle || 'your property'}".`,
            link: '/host/reviews',
            metadata: { propertyId, reviewId: saved.id, rating: createReviewDto.rating },
            idempotencyKey: `review_${saved.id}_host`,
          });
        } catch (notifErr: unknown) {
          this.logger.warn(`Failed to notify host of new review: ${notifErr}`);
        }
      }

      const createdReview = await this.reviewRepository
        .createQueryBuilder('review')
        .select([
          'review.id',
          'review.propertyId',
          'review.rating',
          'review.comment',
          'review.createdAt',
        ])
        .leftJoin('review.user', 'user')
        .addSelect(['user.id', 'user.name'])
        .where('review.id = :id', { id: saved.id })
        .getOne();
      if (!createdReview) throw new NotFoundException('The review was saved but could not be loaded');
      return createdReview;
    } catch (error: unknown) {
      const databaseError = error as { driverError?: { code?: string; constraint?: string } };
      if (databaseError?.driverError?.code === '23505' && databaseError.driverError.constraint === 'idx_reviews_property_user_unique') {
        throw new ConflictException('You have already reviewed this property');
      }
      throw error;
    }
  }
}
