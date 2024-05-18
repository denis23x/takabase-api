/** @format */

import { ParamsId } from '../../crud/params/params-id';

export interface PostDeleteDto extends ParamsId {
  Querystring: {
    firebaseUid: string;
    image?: string;
  };
}
