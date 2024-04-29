/** @format */

import { ParamsId } from '../../crud/params/params-id';

export interface UserDeleteDto extends ParamsId {
  Querystring: {
    password: string;
  };
}
