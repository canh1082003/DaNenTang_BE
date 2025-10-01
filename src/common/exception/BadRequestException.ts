import { ValidationError } from 'express-validator';
import { HttpStatusCode } from '../constants';
import BaseException from './BaseException';
import { ErrorDetail } from '../interfaces/express';

export default class BadRequestException extends BaseException {
  constructor(message: ValidationError[] | ErrorDetail) {
    super({
      httpCode: HttpStatusCode.BAD_REQUEST,
      description: message,
    });
  }
}
