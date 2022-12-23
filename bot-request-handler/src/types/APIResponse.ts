import { APIGatewayProxyResult } from 'aws-lambda';

interface IAPIResponse<T> {
  statusCode: number;
  body?: T;
}

class APIResponse<T> implements IAPIResponse<T> {
  constructor(public statusCode: number, public body: T) {}

  toApiGatewayResponse(): APIGatewayProxyResult {
    return {
      statusCode: this.statusCode,
      body: JSON.stringify(this.body),
    };
  }
}

export default APIResponse;
