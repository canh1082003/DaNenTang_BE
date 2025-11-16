import { Request, NextFunction } from 'express';
import PlatformService from './PlatformService';
import { ResponseCustom } from '@/utils/expressCustom';
import { HttpStatusCode } from '@/utils/httpStatusCode';

class PlatformController {
  async getAllPlatforms(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const platforms = await PlatformService.getAllPlatforms();

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: platforms,
      });
    } catch (error) {
      console.error('Error getAllPlatforms:', error);
      next(error);
    }
  }

  async getPlatformDetail(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const platform = await PlatformService.getPlatformDetail(req.params.name);

      if (!platform) {
        return res.status(HttpStatusCode.NOT_FOUND).json({
          httpStatusCode: HttpStatusCode.NOT_FOUND,
          errors: {
            errorCode: 'PLATFORM_NOT_FOUND',
            errorMessage: 'Platform not found',
          },
        });
      }

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: platform,
      });
    } catch (error) {
      console.error('Error getPlatformDetail:', error);
      next(error);
    }
  }

  async connectPlatform(req: Request, res: ResponseCustom, next: NextFunction) {
    const { platform } = req.params;

    try {
      const result = await PlatformService.connectPlatform(platform);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: result,
      });
    } catch (error: any) {
       console.log('Failed to connect platform');
      next(error);
    }
  }
  async disconnectPlatform(req: Request, res: ResponseCustom, next: NextFunction) {
    const { platform } = req.params;

    try {
      const result = await PlatformService.disconnectPlatform(platform);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: result,
      });
    } catch (error: any) {
      console.log('Failed to disconnect platform');
      next(error);
    }
  }
  async syncPlatform(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const result = await PlatformService.syncPlatform(req.params.name);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: result,
      });
    } catch (error) {
      console.error('Error syncPlatform:', error);
      next(error);
    }
  }
  async createPlatform(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { name, status } = req.body;

      if (!name) {
        return res.status(HttpStatusCode.BAD_REQUEST).json({
          httpStatusCode: HttpStatusCode.BAD_REQUEST,
          data: 'Platform name is required.',
        });
      }

      const platform = await PlatformService.createPlatform({
        name,
        status,
      });

      return res.status(HttpStatusCode.CREATED).json({
        httpStatusCode: HttpStatusCode.CREATED,
        data: platform,
      });
    } catch (error: any) {
      next(error);
    }
  }
  async getPlatformStatus(req: Request, res: ResponseCustom, next: NextFunction) {
      try {
        const status = await PlatformService.getPlatformStatus();
        return res.status(HttpStatusCode.OK).json({
          httpStatusCode: HttpStatusCode.OK,
          data: status,
        });
      } catch (error: any) {
        console.error('Error getPlatformStatus:', error);
        next(error);
      }
    }
}

export default new PlatformController();
