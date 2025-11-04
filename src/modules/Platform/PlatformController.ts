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

  // async connectPlatform(req: Request, res: ResponseCustom, next: NextFunction) {
  //   try {
  //     const result = await PlatformService.connectPlatform(req.params.name);
  //     return res.status(HttpStatusCode.OK).json({
  //       httpStatusCode: HttpStatusCode.OK,
  //       data: result,
  //     });
  //   } catch (error) {
  //     console.error('Error connectPlatform:', error);
  //     next(error);
  //   }
  // }
  // async disconnectPlatform(req: Request, res: ResponseCustom, next: NextFunction) {
  //   try {
  //     const result = await PlatformService.disconnectPlatform(req.params.name);
  //     return res.status(HttpStatusCode.OK).json({
  //       httpStatusCode: HttpStatusCode.OK,
  //       data: result,
  //     });
  //   } catch (error) {
  //     console.error('Error disconnectPlatform:', error);
  //     next(error);
  //   }
  // }
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
}

export default new PlatformController();
