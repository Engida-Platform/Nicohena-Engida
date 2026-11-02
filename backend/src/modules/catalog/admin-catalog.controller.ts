import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { PermissionsGuard } from '../admin/rbac/permissions.guard';
import { RequirePermissions } from '../admin/rbac/permissions.decorator';
import { Permission } from '../admin/rbac/permissions';
import { AdminCatalogService } from './admin-catalog.service';
import { AmenityCategory } from '../amenities/entities/amenity.entity';
import {
  CreateAmenityDto,
  CreateCategoryDto,
  CreateDestinationDto,
  UpdateAmenityDto,
  UpdateCategoryDto,
  UpdateDestinationDto,
} from './dto/admin-catalog.dto';

@ApiTags('Catalog')
@ApiBearerAuth('JWT-auth')
@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  // ==================== CATEGORIES ====================

  @Get('categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'List all property categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create a property category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Update a property category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Delete a property category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  // ==================== DESTINATIONS ====================

  @Get('destinations')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'List platform destinations' })
  @ApiQuery({ name: 'featured', required: false, description: 'Filter only featured destinations' })
  @ApiResponse({ status: 200, description: 'List of destinations' })
  async listDestinations(@Query('featured') featured?: string) {
    const onlyFeatured = featured !== undefined ? featured === 'true' : undefined;
    return this.catalogService.listDestinations(onlyFeatured);
  }

  @Post('destinations')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create a featured destination' })
  @ApiResponse({ status: 201, description: 'Destination created' })
  async createDestination(@Body() dto: CreateDestinationDto) {
    return this.catalogService.createDestination(dto);
  }

  @Patch('destinations/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Update a destination' })
  @ApiParam({ name: 'id', description: 'Destination UUID' })
  @ApiResponse({ status: 200, description: 'Destination updated' })
  async updateDestination(
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
  ) {
    return this.catalogService.updateDestination(id, dto);
  }

  @Delete('destinations/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Delete a destination' })
  @ApiParam({ name: 'id', description: 'Destination UUID' })
  @ApiResponse({ status: 200, description: 'Destination deleted' })
  async deleteDestination(@Param('id') id: string) {
    return this.catalogService.deleteDestination(id);
  }

  // ==================== AMENITIES ====================

  @Get('amenities/categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'List amenity category enum values' })
  @ApiResponse({ status: 200, description: 'Array of amenity categories' })
  getAmenityCategories() {
    return Object.values(AmenityCategory);
  }

  @Get('amenities')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'List all amenities (admin)' })
  @ApiResponse({ status: 200, description: 'List of amenities' })
  async listAmenities() {
    return this.catalogService.listAmenities();
  }

  @Post('amenities')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create an amenity' })
  @ApiResponse({ status: 201, description: 'Amenity created' })
  async createAmenity(@Body() dto: CreateAmenityDto) {
    return this.catalogService.createAmenity(dto);
  }

  @Patch('amenities/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Update an amenity' })
  @ApiParam({ name: 'id', description: 'Amenity UUID' })
  @ApiResponse({ status: 200, description: 'Amenity updated' })
  async updateAmenity(
    @Param('id') id: string,
    @Body() dto: UpdateAmenityDto,
  ) {
    return this.catalogService.updateAmenity(id, dto);
  }

  @Delete('amenities/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  @ApiOperation({ summary: 'Delete an amenity' })
  @ApiParam({ name: 'id', description: 'Amenity UUID' })
  @ApiResponse({ status: 200, description: 'Amenity deleted' })
  async deleteAmenity(@Param('id') id: string) {
    return this.catalogService.deleteAmenity(id);
  }
}

@ApiTags('Catalog')
@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  @Get('destinations')
  @ApiOperation({ summary: 'Get public featured destinations' })
  @ApiQuery({ name: 'featured', required: false })
  @ApiResponse({ status: 200, description: 'List of public destinations' })
  async getPublicDestinations(@Query('featured') featured?: string) {
    const onlyFeatured = featured === 'true' ? true : undefined;
    return this.catalogService.listDestinations(onlyFeatured, true);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get public property categories' })
  @ApiResponse({ status: 200, description: 'List of public categories' })
  async getPublicCategories() {
    return this.catalogService.listCategories(true);
  }
}

