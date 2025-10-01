import { ValidationError } from 'express-validator';
import { HttpStatusCode } from '../constants';
import BaseException from './BaseException';
import { ErrorDetail } from '../interfaces/express';

export default class Unauthorized extends BaseException {
  constructor(message: ValidationError[] | ErrorDetail) {
    super({
      httpCode: HttpStatusCode.UNAUTHORIZED,
      description: message,
    });
  }
}
