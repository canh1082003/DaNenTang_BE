import { Response } from 'express';

export interface ErrorDetail {
  errorCode: string;
  errorMessage: string;
}

export interface BodyResponse {
  httpStatusCode: number;
  data?: any;
  errors?: ErrorDetail[];
}

export type ResponseCustom = Response<BodyResponse>;
