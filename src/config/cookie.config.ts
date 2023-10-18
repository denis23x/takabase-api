/** @format */

import { CookieSerializeOptions, FastifyCookieOptions } from '@fastify/cookie';
import * as dotenv from 'dotenv';

dotenv.config();

// https://github.com/fastify/fastify-cookie

const cookieConfigList: Record<string, FastifyCookieOptions> = {
  development: {
    secret: 'secret'
  },
  production: {
    secret: String(process.env.COOKIE_SECRET)
  }
};

const cookieOptionsList: Record<string, CookieSerializeOptions> = {
  development: {
    domain: 'localhost',
    path: '/',
    secure: false,
    httpOnly: true,
    sameSite: 'none'
  },
  production: {
    domain: String(process.env.COOKIE_DOMAIN),
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'none'
  }
};

export const cookieConfig: FastifyCookieOptions = cookieConfigList[String(process.env.NODE_ENV)];

export const cookieOptions: CookieSerializeOptions = cookieOptionsList[String(process.env.NODE_ENV)];
