import { Request } from "express";
import { Response } from "express";

export type userInfo = { userId: string; role?: string };
export type RequestCustom = Request & { userInfo?: userInfo };

export interface ErrorDetail {
  errorCode: string;
  errorMessage: string;
}

export interface BodyResponse {
  httpStatusCode: number;
  data?: any;
  errors?: ErrorDetail[] | ErrorDetail;
}

export type ResponseCustom = Response<BodyResponse>;
