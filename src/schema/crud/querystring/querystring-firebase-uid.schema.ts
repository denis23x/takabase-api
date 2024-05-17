/** @format */

export const querystringFirebaseUidSchema: Record<string, any> = {
  $id: 'querystringFirebaseUidSchema',
  type: 'object',
  properties: {
    firebaseUid: {
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{28}$'
    }
  }
};
