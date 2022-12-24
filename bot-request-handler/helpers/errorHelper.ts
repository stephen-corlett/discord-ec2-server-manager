import { LambdaError } from '../errors';

export const isLambdaError = (error: unknown): error is LambdaError => {
  const lambdaError = error as LambdaError;
  return typeof lambdaError?.message === 'string' && typeof lambdaError?.statusCode === 'number';
};
