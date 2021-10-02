import HttpStatus from 'http-status-codes';

import LambdaError from './lambdaError';

class InternalServerError extends LambdaError {
  constructor(message?: string) {
    super(message || 'Internal server error');
    this.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

export default InternalServerError;
