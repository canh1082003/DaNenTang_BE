import { ValidationError } from 'express-validator';
import { HttpStatusCode } from '../constants';
import BaseException from './BaseException';
import { ErrorDetail } from '../interfaces/express';

export default class ServerInternalException extends BaseException {
  constructor(message: ValidationError[] | ErrorDetail) {
    super({
      httpCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
      description: message,
    });
  }
}
