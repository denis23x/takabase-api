/** @format */

export const partsInsightsSchema: Record<string, any> = {
  $id: 'partsInsightsSchema',
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
