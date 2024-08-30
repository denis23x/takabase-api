/** @format */

export const insightsSchema: Record<string, any> = {
  $id: 'insightsSchema',
  type: 'object',
  properties: {
    categories: {
      $ref: 'partsInsightsSchema#'
    },
    posts: {
      $ref: 'partsInsightsSchema#'
    },
    users: {
      $ref: 'partsInsightsSchema#'
    }
  }
};
