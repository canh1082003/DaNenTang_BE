import "express";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Record<string, Express.Multer.File[]> | Express.Multer.File[];
    }
  }
}
