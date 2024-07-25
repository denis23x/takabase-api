/** @format */

import type { ParamsId } from '../../crud/params/params-id';

export interface PostPasswordDeleteDto extends ParamsId {
  Querystring: {
    firebaseUid: string;
    image?: string;
  };
}
