import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Room } from './room.entity';
import { Amenity } from '../../amenities/entities/amenity.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';
import { AvailabilityBlock } from './availability-block.entity';
import { ListingReview } from './listing-review.entity';
import { PropertyCategory } from '../../catalog/entities/property-category.entity';
import { Destination } from '../../catalog/entities/destination.entity';

export enum PropertyType {
  HOUSE = 'HOUSE',
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  BEDROOM = 'BEDROOM',
  STUDIO = 'STUDIO',
}

export enum ListingType {
  RENTAL = 'RENTAL',
  SALE = 'SALE',
}

export enum ListingStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  SOLD = 'SOLD',
  ARCHIVED = 'ARCHIVED',
}

@Entity('properties')
@Index('idx_properties_host_id', ['hostId'])
@Index('idx_properties_city', ['city'])
@Index('idx_properties_type', ['propertyType'])
@Index('idx_properties_listing_type', ['listingType'])
@Index('idx_properties_status', ['status'])
@Index('idx_properties_sub_city', ['subCity'])
@Index('idx_properties_admin_hidden', ['adminHidden'])
@Index('idx_properties_category_id', ['categoryId'])
@Index('idx_properties_destination_id', ['destinationId'])
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'host_id' })
  hostId: string;

  @ManyToOne(() => User, (user) => user.properties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId?: string | null;

  @ManyToOne(() => PropertyCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: PropertyCategory | null;

  @Column({ type: 'uuid', nullable: true, name: 'destination_id' })
  destinationId?: string | null;

  @ManyToOne(() => Destination, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'destination_id' })
  destination?: Destination | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: PropertyType,
    default: PropertyType.HOUSE,
    name: 'property_type',
  })
  propertyType: PropertyType;

  @Column({
    type: 'enum',
    enum: ListingType,
    default: ListingType.RENTAL,
    name: 'listing_type',
  })
  listingType: ListingType;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.PUBLISHED,
    name: 'status',
  })
  status: ListingStatus;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, default: 'Ethiopia' })
  country: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  zone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sub_city' })
  subCity: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  woreda: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  neighborhood: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_night', default: 0 })
  pricePerNight: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'cleaning_fee',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string | number) => Number(v) || 0,
    },
  })
  cleaningFee: number;

  @Column({ type: 'boolean', default: false, name: 'instant_book' })
  instantBook: boolean;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, name: 'sale_price' })
  salePrice: number | null;

  @Column({ type: 'int', default: 1, name: 'max_guests' })
  maxGuests: number;

  @Column({ type: 'int', default: 1 })
  bedrooms: number;

  @Column({ type: 'int', default: 1 })
  bathrooms: number;

  @Column({ type: 'int', default: 0, name: 'area_sqm' })
  areaSqm: number;

  @Column({ type: 'int', default: 0, name: 'parking_spaces' })
  parkingSpaces: number;

  @Column({ type: 'boolean', default: true, name: 'is_available' })
  isAvailable: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'cover_image' })
  coverImage: string | null;

  @Column('text', { array: true, default: '{}' })
  images: string[];

  @Column({ type: 'boolean', default: false, name: 'admin_hidden' })
  adminHidden: boolean;

  @Column({ type: 'text', nullable: true, name: 'admin_hidden_reason' })
  adminHiddenReason: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'admin_hidden_at' })
  adminHiddenAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'admin_hidden_by_id' })
  adminHiddenById: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Room, (room) => room.property)
  rooms: Room[];

  @ManyToMany(() => Amenity)
  @JoinTable({
    name: 'property_amenities',
    joinColumn: { name: 'property_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'amenity_id', referencedColumnName: 'id' },
  })
  amenities: Amenity[];

  @OneToMany(() => Booking, (booking) => booking.property)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.property)
  reviews: Review[];

  @OneToMany(() => AvailabilityBlock, (block) => block.property)
  availabilityBlocks?: AvailabilityBlock[];

  @OneToMany(() => ListingReview, (review) => review.property)
  moderationReviews?: ListingReview[];
}
