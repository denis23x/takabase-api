/** @format */

import type { RemoteConfig } from 'firebase-admin/remote-config';

declare module 'fastify' {
  interface FastifyInstance {
    remoteConfig: RemoteConfig;
    remoteConfigPlugin: {
      getForbiddenUsername: () => Promise<string[]>;
      getAppearance: () => Promise<any>;
    };
  }
}

export {};
