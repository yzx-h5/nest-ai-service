import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkResponseWrapped } from './common/response/api-response.dto';
import { Public } from './common/security/public.decorator';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查' })
  @ApiOkResponseWrapped(String, '服务正常运行')
  getHello(): string {
    return this.appService.getHello();
  }
}
