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

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  // ==================== CATEGORIES ====================

  @Get('categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  // ==================== DESTINATIONS ====================

  @Get('destinations')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async listDestinations(@Query('featured') featured?: string) {
    const onlyFeatured = featured !== undefined ? featured === 'true' : undefined;
    return this.catalogService.listDestinations(onlyFeatured);
  }

  @Post('destinations')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async createDestination(@Body() dto: CreateDestinationDto) {
    return this.catalogService.createDestination(dto);
  }

  @Patch('destinations/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async updateDestination(
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
  ) {
    return this.catalogService.updateDestination(id, dto);
  }

  @Delete('destinations/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async deleteDestination(@Param('id') id: string) {
    return this.catalogService.deleteDestination(id);
  }

  // ==================== AMENITIES ====================

  @Get('amenities/categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  getAmenityCategories() {
    return Object.values(AmenityCategory);
  }

  @Get('amenities')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async listAmenities() {
    return this.catalogService.listAmenities();
  }

  @Post('amenities')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async createAmenity(@Body() dto: CreateAmenityDto) {
    return this.catalogService.createAmenity(dto);
  }

  @Patch('amenities/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async updateAmenity(
    @Param('id') id: string,
    @Body() dto: UpdateAmenityDto,
  ) {
    return this.catalogService.updateAmenity(id, dto);
  }

  @Delete('amenities/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async deleteAmenity(@Param('id') id: string) {
    return this.catalogService.deleteAmenity(id);
  }
}

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  @Get('destinations')
  async getPublicDestinations(@Query('featured') featured?: string) {
    const onlyFeatured = featured === 'true' ? true : undefined;
    return this.catalogService.listDestinations(onlyFeatured, true);
  }

  @Get('categories')
  async getPublicCategories() {
    return this.catalogService.listCategories(true);
  }
}
