/** @format */

import type { ParamsId } from '../../crud/params/params-id';

export interface PostPrivateDeleteDto extends ParamsId {
  Querystring: {
    firebaseUid: string;
    image?: string;
  };
}
