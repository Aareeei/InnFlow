import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { ApprovalService } from './approval.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import type { AuthUser } from '../common/types';
import { TENANT_ID_KEY } from '../common/types';

class ApprovalNoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}

class ApprovalResolveDto extends ApprovalNoteDto {
  @IsBoolean()
  approved!: boolean;
}

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('approvals')
export class ApprovalController {
  constructor(private readonly approvals: ApprovalService) {}

  @Get()
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'List human approvals' })
  list(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.approvals.listApprovals(req[TENANT_ID_KEY], {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('requests:read')
  @ApiOperation({ summary: 'Get approval by ID' })
  get(@Req() req: Request & { [TENANT_ID_KEY]?: string }, @Param('id') id: string) {
    return this.approvals.getApproval(req[TENANT_ID_KEY], id);
  }

  @Post(':id/approve')
  @RequirePermissions('approvals:resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve pending request' })
  approve(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ApprovalNoteDto,
  ) {
    return this.approvals.approve(req[TENANT_ID_KEY], id, user.sub, body.note);
  }

  @Post(':id/reject')
  @RequirePermissions('approvals:resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject pending request' })
  reject(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ApprovalNoteDto,
  ) {
    return this.approvals.reject(req[TENANT_ID_KEY], id, user.sub, body.note);
  }

  @Post(':id/resolve')
  @RequirePermissions('approvals:resolve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve or reject pending request' })
  resolve(
    @Req() req: Request & { [TENANT_ID_KEY]?: string },
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ApprovalResolveDto,
  ) {
    return body.approved
      ? this.approvals.approve(req[TENANT_ID_KEY], id, user.sub, body.note)
      : this.approvals.reject(req[TENANT_ID_KEY], id, user.sub, body.note);
  }
}
