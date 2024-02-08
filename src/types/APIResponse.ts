import { APIGatewayProxyResult } from 'aws-lambda';

export interface IAPIResponse {
  statusCode: number;
  body?: unknown;
  toApiGatewayProxyResult: () => APIGatewayProxyResult;
}

class APIResponse<T> implements IAPIResponse {
  constructor(public statusCode: number, public body: T) {}

  toApiGatewayProxyResult(): APIGatewayProxyResult {
    return {
      statusCode: this.statusCode,
      body: JSON.stringify(this.body),
      isBase64Encoded: false,
      headers: {},
    };
  }
}

export default APIResponse;
