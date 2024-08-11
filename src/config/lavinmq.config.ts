/** @format */

import { config } from 'dotenv';

config({
  path: '.env.takabase-local',
  override: false
});

// https://github.com/cloudamqp/amqp-client.js

export const lavinMQConfig: Record<string, string> = {
  url: String(process.env.API_LAVINMQ_URL)
};
