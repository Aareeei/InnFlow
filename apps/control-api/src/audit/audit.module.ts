import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditAliasController } from './audit-alias.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController, AuditAliasController],
  providers: [AuditService],
})
export class AuditModule {}
