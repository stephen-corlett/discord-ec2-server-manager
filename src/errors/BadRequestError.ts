import HttpStatus from 'http-status-codes';

import LambdaError from './LambdaError';

class BadRequestError extends LambdaError {
  constructor(message?: string) {
    super(message || 'Bad request');
    this.statusCode = HttpStatus.BAD_REQUEST;
  }
}

export default BadRequestError;
