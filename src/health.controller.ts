import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators';

@Controller()
export class HealthController {
  @Public()
  @Get()
  root(): { ok: true } {
    return { ok: true };
  }

  @Public()
  @Get('health')
  health(): { ok: true } {
    return { ok: true };
  }
}
