import { Router } from "express";
import DashboardController from "./DashboardController";

export const DashboardRouter = Router();

DashboardRouter.get('/summary', DashboardController.getDashboardSummary);

// Lấy danh sách 5 cuộc hội thoại gần nhất
DashboardRouter.get('/recent-conversations', DashboardController.getRecentConversations);

// Lấy danh sách trạng thái của các nền tảng
DashboardRouter.get('/platform-status', DashboardController.getPlatformStatus);
