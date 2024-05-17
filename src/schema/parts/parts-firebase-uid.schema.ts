/** @format */

export const partsFirebaseUidSchema: Record<string, any> = {
  $id: 'partsFirebaseUidSchema',
  type: 'object',
  properties: {
    firebaseUid: {
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{28}$'
    }
  }
};
