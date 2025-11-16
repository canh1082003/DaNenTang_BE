import { Router } from "express";
import DashboardController from "./DashboardController";

export const DashboardRouter = Router();

// get total conversation
DashboardRouter.get('/summary', DashboardController.getDashboardSummary);

// Lấy danh sách 5 cuộc hội thoại gần nhất
DashboardRouter.get('/recent-conversations', DashboardController.getRecentConversations);

