import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import type { CreateUserDto, UpdateUserDto } from './admin.service';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * AdminController
 * Base path : /api/v1/admin/users  (global prefix /api/v1 is set in main.ts)
 *
 * All routes are protected by JwtAuthGuard (validates JWT) and then
 * AdminGuard (checks that req.user.role === 'admin').
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /api/v1/admin/users */
  @Get()
  findAll() {
    return this.adminService.findAll();
  }

  /** GET /api/v1/admin/users/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  /** POST /api/v1/admin/users */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    return this.adminService.create(dto);
  }

  /** PATCH /api/v1/admin/users/:id */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.update(id, dto);
  }

  /** DELETE /api/v1/admin/users/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
