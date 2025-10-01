import { ValidationError } from 'express-validator';
import { ErrorDetail } from './express';

export interface ErrorArgs {
  httpCode: number;
  description: ErrorDetail | ValidationError[];
  isOperational?: boolean;
}
