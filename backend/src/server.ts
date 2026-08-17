import App from '@/app';
import { IndexController } from '@controllers/index.controller';
import validateEnv from '@utils/validateEnv';
import { UserController } from './controllers/user.controller';
import { HealthController } from './controllers/health.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';

validateEnv();

const app = new App([IndexController, AdminAuthController, UserController, HealthController]);

app.listen();
