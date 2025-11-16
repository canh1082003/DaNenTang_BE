import { Request } from 'express';
import type { Multer } from "multer";
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
  file?: Multer.File;
  files?: Multer.File[];
}
