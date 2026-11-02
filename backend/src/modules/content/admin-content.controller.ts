import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import { AdminContentService } from './admin-content.service';
import { FaqCategory } from './entities/faq-item.entity';
import {
  CreateContentBlockDto,
  CreateFaqDto,
  UpdateContentBlockDto,
  UpdateFaqDto,
} from './dto/admin-content.dto';

@ApiTags('Content')
@ApiBearerAuth('JWT-auth')
@Controller('admin/content')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminContentController {
  constructor(private readonly contentService: AdminContentService) {}

  // ==================== FAQS ====================

  @Get('faqs/categories')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'List FAQ category options' })
  @ApiResponse({ status: 200, description: 'List of FAQ categories' })
  getFaqCategories() {
    return Object.values(FaqCategory);
  }

  @Get('faqs')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'List FAQs' })
  @ApiQuery({ name: 'category', required: false, enum: FaqCategory, description: 'Category filter' })
  @ApiQuery({ name: 'published', required: false, description: 'Publication status filter' })
  @ApiResponse({ status: 200, description: 'List of FAQs' })
  async listFaqs(
    @Query('category') category?: FaqCategory,
    @Query('published') published?: string,
  ) {
    const onlyPublished = published !== undefined ? published === 'true' : undefined;
    return this.contentService.listFaqs(category, onlyPublished);
  }

  @Post('faqs')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Create FAQ item' })
  @ApiResponse({ status: 201, description: 'FAQ item created' })
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.contentService.createFaq(dto);
  }

  @Patch('faqs/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Update FAQ item' })
  @ApiParam({ name: 'id', description: 'FAQ UUID' })
  @ApiResponse({ status: 200, description: 'FAQ item updated' })
  async updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.contentService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Delete FAQ item' })
  @ApiParam({ name: 'id', description: 'FAQ UUID' })
  @ApiResponse({ status: 200, description: 'FAQ item deleted' })
  async deleteFaq(@Param('id') id: string) {
    return this.contentService.deleteFaq(id);
  }

  // ==================== CONTENT BLOCKS ====================

  @Get('blocks')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'List CMS content blocks' })
  @ApiQuery({ name: 'published', required: false, description: 'Filter published blocks' })
  @ApiResponse({ status: 200, description: 'List of content blocks' })
  async listContentBlocks(@Query('published') published?: string) {
    const onlyPublished = published !== undefined ? published === 'true' : undefined;
    return this.contentService.listContentBlocks(onlyPublished);
  }

  @Get('blocks/:slug')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Get content block by slug' })
  @ApiParam({ name: 'slug', description: 'Block slug identifier' })
  @ApiResponse({ status: 200, description: 'Content block found' })
  async getContentBlockBySlug(@Param('slug') slug: string) {
    return this.contentService.getContentBlockBySlug(slug);
  }

  @Post('blocks')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Create CMS content block' })
  @ApiResponse({ status: 201, description: 'Content block created' })
  async createContentBlock(
    @Body() dto: CreateContentBlockDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return this.contentService.createContentBlock(dto, adminId);
  }

  @Patch('blocks/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Update CMS content block' })
  @ApiParam({ name: 'id', description: 'Content block UUID' })
  @ApiResponse({ status: 200, description: 'Content block updated' })
  async updateContentBlock(
    @Param('id') id: string,
    @Body() dto: UpdateContentBlockDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return this.contentService.updateContentBlock(id, dto, adminId);
  }

  @Delete('blocks/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  @ApiOperation({ summary: 'Delete CMS content block' })
  @ApiParam({ name: 'id', description: 'Content block UUID' })
  @ApiResponse({ status: 200, description: 'Content block deleted' })
  async deleteContentBlock(@Param('id') id: string) {
    return this.contentService.deleteContentBlock(id);
  }
}

@ApiTags('Content')
@Controller('content')
export class PublicContentController {
  constructor(private readonly contentService: AdminContentService) {}

  @Get('faqs')
  @ApiOperation({ summary: 'Get published FAQs' })
  @ApiQuery({ name: 'category', required: false, enum: FaqCategory })
  @ApiResponse({ status: 200, description: 'List of public FAQs' })
  async getPublicFaqs(@Query('category') category?: FaqCategory) {
    return this.contentService.listFaqs(category, true);
  }

  @Get('blocks/:slug')
  @ApiOperation({ summary: 'Get published content block by slug' })
  @ApiParam({ name: 'slug', description: 'Block slug identifier' })
  @ApiResponse({ status: 200, description: 'Public content block' })
  async getPublicBlockBySlug(@Param('slug') slug: string) {
    return this.contentService.getContentBlockBySlug(slug, true);
  }
}

