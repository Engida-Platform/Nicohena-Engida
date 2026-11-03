import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PropertiesService } from './properties.service';
import { HostService } from '../host/host.service';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { DeletePropertyImageDto } from './dto/delete-property-image.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminBypassGuard } from '../admin/rbac/super-admin-bypass.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly hostService: HostService,
  ) {}

  /**
   * Public: Search and filter property listings
   */
  @Get()
  @ApiOperation({
    summary: 'Search and filter published properties',
    description: 'Returns a paginated list of published properties matching location, price, room, and category filters.',
  })
  @ApiResponse({ status: 200, description: 'List of matching properties with pagination metadata' })
  async findAll(@Query() query: QueryPropertyDto) {
    return this.propertiesService.findAll(query);
  }

  /**
   * Public: Get a single property with full details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get public property details',
    description: 'Fetches comprehensive listing details including images, host summary, rooms, amenities, and review aggregates.',
  })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Full property details' })
  @ApiResponse({ status: 404, description: 'Property not found or not published' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findPublicOne(id);
  }

  /**
   * Public: Get related properties for a given property
   */
  @Get(':id/related')
  @ApiOperation({
    summary: 'Get related properties',
    description: 'Returns up to 6 similar listings in the same city, category, or price range.',
  })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Array of related property summaries' })
  async findRelated(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findRelated(id);
  }

  /**
   * Protected: Get current user's own listings
   */
  @Get('my/listings')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user listings',
    description: 'Retrieves all property listings owned by the authenticated host across all publication statuses.',
  })
  @ApiResponse({ status: 200, description: 'List of host properties' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyListings(@GetUser() user: User) {
    return this.propertiesService.findMyProperties(user.id);
  }

  /** Legacy create route is retired; new listings must use the host onboarding workflow. */
  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.GONE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Legacy property creation (retired; use /host/listings)' })
  @ApiResponse({ status: 410, description: 'Create listings through /host/listings' })
  create() {
    throw new GoneException('Create a host profile, then create listings through /host/listings');
  }

  /**
   * Protected: Update a property listing (owner or admin only)
   * Deprecation notice: Prefer PUT /host/listings/:id.
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update property listing',
    description: 'Updates listing content. Significant updates to published listings trigger moderation review.',
  })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Property updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not listing owner or admin' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @GetUser() user: User,
  ) {
    return this.hostService.updateListing(id, updatePropertyDto, user.id, user.role);
  }

  /**
   * Permanent deletion is retired. Admin takedown must preserve the record so
   * bookings, reviews and the audit trail stay intact.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.GONE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete listing (retired)' })
  @ApiResponse({ status: 410, description: 'Listings cannot be deleted; archive or hide instead' })
  remove() {
    throw new GoneException(
      'Listings cannot be permanently deleted. Archive the listing or hide it from public view instead.',
    );
  }

  /**
   * Protected: Add a room to a property (owner or admin only)
   */
  @Post(':id/rooms')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add room to property' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 201, description: 'Room added successfully' })
  async addRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createRoomDto: CreateRoomDto,
    @GetUser() user: User,
  ) {
    return this.hostService.addListingRoom(id, createRoomDto, user.id, user.role);
  }

  /**
   * Protected: Upload and set cover image for a property
   */
  @Post(':id/cover-image')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file (max 10MB)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Cover image uploaded and updated' })
  async uploadCoverImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required under "file" form field');
    }
    return this.propertiesService.uploadCoverImage(id, file, user.id, user.role);
  }

  /**
   * Protected: Upload multiple images to property gallery (up to 10)
   */
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload gallery images (up to 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Image files array (max 10, max 10MB each)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Gallery images uploaded successfully' })
  async uploadGalleryImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required under "files" form field');
    }
    return this.propertiesService.uploadGalleryImages(id, files, user.id, user.role);
  }

  /**
   * Protected: Remove an image from property gallery
   */
  @Delete(':id/images')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove gallery image' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Gallery image removed' })
  async removeGalleryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteImageDto: DeletePropertyImageDto,
    @GetUser() user: User,
  ) {
    return this.propertiesService.removeGalleryImage(id, deleteImageDto.imageUrl, user.id, user.role);
  }

  /**
   * Protected: Add an availability block (dates when property cannot be booked)
   */
  @Post(':id/availability-blocks')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Block calendar dates' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 201, description: 'Calendar block created' })
  async addAvailabilityBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAvailabilityBlockDto,
    @GetUser() user: User,
  ) {
    return this.hostService.addAvailabilityBlock(
      id,
      dto.startDate,
      dto.endDate,
      dto.reason || null,
      user.id,
      user.role,
    );
  }

  /**
   * Public: Get all availability blocks for a property
   */
  @Get(':id/availability-blocks')
  @ApiOperation({ summary: 'Get calendar availability blocks' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiResponse({ status: 200, description: 'Array of blocked date ranges' })
  async getAvailabilityBlocks(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.getAvailabilityBlocks(id);
  }

  /**
   * Protected: Remove an availability block from a property
   */
  @Delete(':id/availability-blocks/:blockId')
  @UseGuards(JwtAuthGuard, SuperAdminBypassGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove calendar block' })
  @ApiParam({ name: 'id', description: 'Property UUID' })
  @ApiParam({ name: 'blockId', description: 'Availability Block UUID' })
  @ApiResponse({ status: 204, description: 'Availability block removed' })
  async removeAvailabilityBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @GetUser() user: User,
  ) {
    return this.hostService.removeAvailabilityBlock(id, blockId, user.id, user.role);
  }
}
