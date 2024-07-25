/** @format */

export const insightSchema: Record<string, any> = {
  $id: 'insightSchema',
  type: 'object',
  properties: {
    countPreceding: {
      type: 'number'
    },
    countFollowing: {
      type: 'number'
    },
    changeState: {
      type: 'string'
    },
    changePercent: {
      type: 'number'
    }
  }
};
