import HttpStatus from 'http-status-codes';

import LambdaError from './LambdaError';

class UnauthorizedError extends LambdaError {
  constructor(message?: string) {
    super(message || 'Unauthorized');
    this.statusCode = HttpStatus.UNAUTHORIZED;
  }
}

export default UnauthorizedError;
