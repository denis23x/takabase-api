/** @format */

export const insightsSchema: Record<string, any> = {
  $id: 'insightsSchema',
  type: 'object',
  properties: {
    categories: {
      $ref: '#/definitions/insights'
    },
    posts: {
      $ref: '#/definitions/insights'
    },
    users: {
      $ref: '#/definitions/insights'
    }
  },
  definitions: {
    insights: {
      $id: '#insights',
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
    }
  }
};
