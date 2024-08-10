/** @format */

import fp from 'fastify-plugin';
import { getRemoteConfig } from 'firebase-admin/remote-config';
import type { RemoteConfig } from 'firebase-admin/remote-config';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ExplicitParameterValue, RemoteConfigTemplate } from 'firebase-admin/remote-config';

const remoteConfigPlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  const remoteConfig: RemoteConfig = getRemoteConfig(fastifyInstance.firebase());

  fastifyInstance.decorate('remoteConfig', remoteConfig);

  // prettier-ignore
  fastifyInstance.decorate('remoteConfigPlugin', {
    getForbiddenUsername: async (): Promise<string[]> => {
      const remoteConfigTemplate: RemoteConfigTemplate = await fastifyInstance.remoteConfig.getTemplate();
      const remoteValue: ExplicitParameterValue = remoteConfigTemplate.parameters.forbiddenUsername.defaultValue as ExplicitParameterValue;

      return JSON.parse(remoteValue.value);
    },
    getAppearance: async (): Promise<any> => {
      const remoteConfigTemplate: RemoteConfigTemplate = await fastifyInstance.remoteConfig.getTemplate();
      const remoteValue: ExplicitParameterValue = remoteConfigTemplate.parameters.appearance.defaultValue as ExplicitParameterValue;

      return JSON.parse(remoteValue.value);
    }
  });
});

export default remoteConfigPlugin;
