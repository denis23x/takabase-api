/** @format */

import type { ParamsUid } from '../../crud/params/params-uid';

export interface UserDeleteDto extends ParamsUid {
  Querystring: {
    password: string;
  };
}
