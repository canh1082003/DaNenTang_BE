import config from './common/config';
import BaseExceptionHandler from './common/exception/handler/BaseExceptionHandler';
import logger from './common/logger';
import router from './routes/routes';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import { createServer, Server as HTTPServer } from 'http';
import helmet from 'helmet';
import { connectDatabase } from './databases';
export class App {
  public app: Application;
  public server: HTTPServer;
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.middlewares();
    this.routes();
    this.errorHandler();
  }
  private middlewares() {
    // this.app.use(cors());
    this.app.use(
  cors({
    origin: [
      "https://danentang-fe.onrender.com", 
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

    this.app.use(helmet());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private routes() {
    this.app.use(config.contextPath, router);
  }

  private errorHandler() {
    this.app.use(
      (error: Error, _req: Request, res: Response, _next: NextFunction) => {
        BaseExceptionHandler.handleError(error, res);
      }
    );
  }

  public listen() {
    try {
      const HOST = config.hostServer;
      const PORT = config.portServer;
      void connectDatabase();
      this.server.listen(PORT, () => {
        logger.info(
          `Server running at http://${HOST}:${PORT}${config.contextPath}`
        );
      });
    } catch (error) {
      logger.error(error);
    }
  }

}

export default new App();
