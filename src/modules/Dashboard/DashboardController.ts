import { Request, NextFunction } from 'express';
import DashboardService from './DashboardService';
import { ResponseCustom } from '@/utils/expressCustom';
import { HttpStatusCode } from '@/utils/httpStatusCode';

class DashboardController {
  async getDashboardSummary(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const summary = await DashboardService.getDashboardSummary();

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: summary,
      });
    } catch (error: any) {
      console.error('Error getDashboardSummary:', error);
      next(error);
    }
  }

  async getRecentConversations(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const recent = await DashboardService.getRecentConversations();

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: recent,
      });
    } catch (error: any) {
      console.error('Error getRecentConversations:', error);
      next(error);
    }
  }

  async getPlatformStatus(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const status = await DashboardService.getPlatformStatus();

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

export default new DashboardController();
