import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  cron: {
    // STRAPI_DISABLE_CRON=true (usado en tests, ver tests/helpers/strapi.ts)
    // apaga los cron jobs sin tener que tocar esta config.
    enabled: env.bool('STRAPI_DISABLE_CRON', false) !== true,
    tasks: cronTasks,
  },
});

export default config;
