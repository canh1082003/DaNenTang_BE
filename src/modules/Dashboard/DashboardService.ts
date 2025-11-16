import Conversation from '../../databases/entities/Conversation';
import Platform from '../../databases/entities/Platform';
import Message from '../../databases/entities/Message';

class DashboardService {
  /**
   * Lấy tổng quan dashboard
   */
  async getDashboardSummary() {
    // Đếm tổng số conversation
    const conversations = await Conversation.find({});
    const totalConversations = conversations.length;

    const platforms = await Platform.find({ status: 'connected' });
    const activePlatforms = platforms.length;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const messagesToday = await Message.countDocuments({
      createdAt: { $gte: startOfToday },
    });

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
}

export default new DashboardService();
