import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/security/public.decorator';
import { HealthService, ReadinessResult } from './health.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: '存活探针' })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: '就绪探针' })
  ready(): Promise<ReadinessResult> {
    return this.healthService.ready();
  }
}
