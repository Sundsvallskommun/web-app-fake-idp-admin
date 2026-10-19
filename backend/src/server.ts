import App from '@/app';
import { IndexController } from '@controllers/index.controller';
import validateEnv from '@utils/validateEnv';
import { UserController } from './controllers/user.controller';
import { HealthController } from './controllers/health.controller';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { GroupController } from './controllers/group.controller';
import { ApplicationController } from './controllers/application.controller';
import { OidcClientController } from './controllers/oidc-client.controller';

validateEnv();

const app = new App([
  IndexController,
  AdminAuthController,
  UserController,
  GroupController,
  ApplicationController,
  OidcClientController,
  HealthController,
]);

app.listen();
