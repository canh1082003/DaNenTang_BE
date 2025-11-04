
import Conversation from "../../databases/entities/Conversation";
import Platform from "../../databases/entities/Platform";
import Message from "../../databases/entities/Message";

class DashboardService {
  /**
   * Lấy tổng quan dashboard
   */
  async getDashboardSummary() {
    const totalConversations = await Conversation.countDocuments();
    const activePlatforms = await Platform.countDocuments({ status: 'connected' });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const messagesToday = await Message.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    // Sau này có thể tính toán tỉ lệ phản hồi thật
    const responseRate = 98.5;

    return {
      totalConversations,
      activePlatforms,
      messagesToday,
      responseRate,
    };
  }

  /**
   * Lấy 5 cuộc hội thoại gần nhất
   */
  async getRecentConversations() {
    return await Conversation.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('lastMessage')
      .populate('participants', 'username avatar')
      .lean();
  }

  /**
   * Lấy trạng thái của tất cả nền tảng
   */
  async getPlatformStatus() {
    return await Platform.find({}, 'name status connectedAt disconnectedAt');
  }
}

export default new DashboardService();
