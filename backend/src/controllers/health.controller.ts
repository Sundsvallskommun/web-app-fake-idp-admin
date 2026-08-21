import { Controller, Get } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class HealthController {
  @Get('/health/up')
  @OpenAPI({ summary: 'Return health check' })
  up() {
    return { status: 'OK' };
  }
}
