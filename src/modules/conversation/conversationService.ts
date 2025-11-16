import ForbiddenException from '@/common/exception/ForbiddenException';
import Conversation, { IConversation } from '@/databases/entities/Conversation';
import Message from '@/databases/entities/Message';
import User from '@/databases/entities/User';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

class ConversationService {
  // Tạo conversation mới giữa 2 user
  async createPrivateConversation(userId1: string, userId2: string) {
    const existingConversation = await Conversation.findOne({
      type: 'private',
      participants: {
        $all: [userId1, userId2],
      },
    });

    if (existingConversation) {
      return existingConversation;
    }
    const otherUser = await User.findById(userId2);
    if (!otherUser) {
      throw new Error('User not found');
    }
    const newConversation = new Conversation({
      type: 'private',
      participants: [userId1, userId2],
    });

    return await newConversation.save();
  }
  async markAsRead(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return null;
    }

    (conversation.lastReads as Map<string, Date>).set(
      userId.toString(),
      new Date()
    );
    await conversation.save();

    return true;
  }

  // Tạo nhóm chat mới
  async createGroupConversation(
    userId: string,
    botId: string,
    username: string,
    platform: 'Telegram' | 'Facebook' | 'Zalo'
  ) {
    const conversation = new Conversation({
      type: 'group',
      name: `${username}_${platform}`,
      participants: [userId, botId],
    });
    return await conversation.save();
  }
  // async assignLeader(
  //   conversationId: string,
  //   department: 'sales' | 'support' | 'care'
  // ) {
  //   const conversation = await Conversation.findById(conversationId);
  //   if (!conversation) {
  //     throw new Error('Conversation not found');
  //   }

  //   conversation.assignedDepartment = department;
  //   let leaderId: mongoose.Types.ObjectId | null = null;
  //   if (department === 'support') {
  //     leaderId = new mongoose.Types.ObjectId(process.env.LEADER_SUPPORT_ID!);
  //   } else if (department === 'sales') {
  //     leaderId = new mongoose.Types.ObjectId(process.env.LEADER_SALES_ID!);
  //   } else if (department === 'care') {
  //     leaderId = new mongoose.Types.ObjectId(process.env.LEADER_CARE_ID!);
  //   }
  //   if (!leaderId) {
  //     // fallback: tìm trong DB
  //     const leader = await User.findOne({ role: 'leader', department });
  //     if (!leader) {
  //       throw new Error(`No leader found for department ${department}`);
  //     }
  //     leaderId = leader._id as mongoose.Types.ObjectId;
  //   }

  //   if (!conversation.participants.includes(leaderId)) {
  //     conversation.participants.push(leaderId);
  //   }
  //   conversation.leader = leaderId;
  //   await conversation.save();
  //   return conversation.populate('leader', 'username role department');
  // }
  // async assignLeader(
  //   conversationId: string,
  //   defaultStaffId: string,
  //   department:
  //     | 'view_product'
  //     | 'buy_product'
  //     | 'consult_product'
  //     | 'support'
  //     | 'care'
  //     | 'sales'
  //     | 'other'
  // ) {
  //   const conversation = await Conversation.findById(conversationId);
  //   if (!conversation) {
  //     throw new Error('Conversation not found');
  //   }

  //   conversation.assignedDepartment = department;

  //   let leaderId: mongoose.Types.ObjectId | null = null;
  //   if (department === 'support') {
  //     leaderId = new mongoose.Types.ObjectId(process.env.LEADER_SUPPORT_ID!);
  //   } else if (department === 'sales') {
  //     leaderId = new mongoose.Types.ObjectId(process.env.LEADER_CONSULT_PRODUCT_ID!);
  //   }
  //   else if (department === 'care') {
  //     leaderId = new mongoose.Types.ObjectId(process.env.LEADER_CARE_ID!);
  //   }

  //   if (!leaderId) {
  //     const leader = await User.findOne({ role: 'leader', department });
  //     if (!leader) {
  //       throw new Error(`No leader found for department ${department}`);
  //     }
  //     leaderId = leader._id as mongoose.Types.ObjectId;
  //   }

  //   if (!conversation.participants.includes(leaderId)) {
  //     conversation.participants.push(leaderId);
  //   }

  //   conversation.leader = leaderId;
  //   await conversation.save();

  //   // ✅ luôn trả về bản mới nhất từ DB
  //   return Conversation.findById(conversationId)
  //     .populate('leader', 'username role department')
  //     .lean();
  // }

  async assignLeader(
    conversationId: string,
    department:
      | 'view_product'
      | 'buy_product'
      | 'consult_product'
      | 'support'
      | 'care'
      | 'sales'
      | 'other',
    defaultStaffId?: string
  ) {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants')
      .populate('assignedDepartment');

    if (!conversation) {
      throw new Error('Conversation not found');
    }
    let leaderId: mongoose.Types.ObjectId | null = null;

    if (department === 'support') {
      leaderId = new mongoose.Types.ObjectId(process.env.LEADER_SUPPORT_ID!);
    } else if (department === 'sales') {
      leaderId = new mongoose.Types.ObjectId(process.env.LEADER_SALES_ID!);
    } else if (department === 'care') {
      leaderId = new mongoose.Types.ObjectId(process.env.LEADER_CARE_ID!);
    }

    // Gán trực tiếp department string vào conversation
    if (department && department !== 'other') {
      conversation.assignedDepartment = department; // ví dụ "support", "care", "sales"
    } else {
      conversation.assignedDepartment = null; // hoặc "other" nếu muốn
    }

    await conversation.save();

    const currentIds = conversation.participants.map((p: any) =>
      p._id.toString()
    );
    const idsToAdd = new Set(currentIds);

    // ✅ 6. Add leader nếu có
    if (leaderId) {
      idsToAdd.add(leaderId.toString());
    }

    // ✅ 7. Add staff mặc định mà AI chọn (nếu có)
    if (defaultStaffId) {
      idsToAdd.add(defaultStaffId.toString());
    }

    // ✅ 8. Cập nhật participants duy nhất
    conversation.participants = Array.from(idsToAdd);
    conversation.leader = leaderId || undefined;
    await conversation.save();

    // Populate lại để trả cho FE / emit socket
    const updated = await Conversation.findById(conversation._id)
      .populate('participants')
      .populate('assignedDepartment')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar _id' },
      });

    return updated;
  }

  async assignAgent(conversationId: string, agentId: string) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      throw new Error('Invalid agent');
    }

    const agentIdObj = agent._id as mongoose.Types.ObjectId;

    if (!conversation.participants.includes(agentIdObj)) {
      conversation.participants.push(agentIdObj);
    }
    conversation.assignedAgent = agentIdObj;
    await conversation.save();

    return conversation.populate(
      'assignedAgent',
      'username avatar role department'
    );
  }
  async getAllConversations(userId: string, type: string) {
    let participantFilter: any = {};
    const currentUser = await User.findById(userId).lean();
    if (!currentUser) {
      throw new Error('User not found');
    }
    if (type === 'customer') {
      const customerIds = await User.find({ role: 'user' }).distinct('_id');
      participantFilter = { participants: { $in: customerIds } };
    } else if (type === 'staff') {
      // const staffIds = await User.find({
      //   role: { $in: ['staff'] },
      // }).distinct('_id');

      // participantFilter = { participants: { $in: staffIds } };
      const staffDept = currentUser.department; // 'sales' | 'support' | 'care' ...
      // Nếu user chưa có department -> trả về rỗng
      if (!staffDept) {
        return [];
      }

      // Trả về các conversation mà assignedDepartment match staffDept
      // (nếu bạn muốn bao gồm cả conversation staff đã là participant, có thể OR thêm condition participants includes userId)
      // const filter = {
      //   $or: [
      //     { assignedDepartment: { $in: [staffDept, /* thêm mapping nếu cần */] } },
      //     // tùy chọn: include conversations where staff already participant
      //     { participants: userId },
      //   ],
      // };
      const filter = {
        participants: userId,
        ...(participantFilter || {}),
      };

      const conversations = await Conversation.find(filter)
        .populate('participants', 'username avatar role department')
        .populate('lastMessage')
        .lean();

      // Tính unreadCount nếu cần (giữ logic cũ)
      const result = await Promise.all(
        conversations.map(async (conv) => {
          const lastReadAt = conv.lastReads?.[userId] || new Date(0);
          const unreadCount = await Message.countDocuments({
            conversation: conv._id,
            sender: { $ne: userId },
            createdAt: { $gt: lastReadAt },
          });
          return { ...conv, unreadCount };
        })
      );

      return result;
    }

    const filter = {
      participants: userId,
      ...(participantFilter || {}),
    };
    const conversations = await Conversation.find(filter)
      .populate('participants', 'username avatar')
      .populate('lastMessage')
      .lean();

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastReadAt = conv.lastReads?.[userId] || new Date(0);
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          createdAt: { $gt: lastReadAt },
        });
        return { ...conv, unreadCount };
      })
    );

    return result;
  }
  async addMember(
    conversationId: string,
    userIds: string[]
  ): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only add participants to group conversations');
    }

    const normalizedIds = Array.isArray(userIds) ? userIds : [userIds];
    conversation.participants = Array.from(
      new Set([
        ...conversation.participants.map((id) => id.toString()),
        ...(normalizedIds || []),
      ])
    )
      // 🧩 Lọc những id hợp lệ (24 ký tự hex)
      .filter((id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))
      // 🧩 Chuyển thành ObjectId an toàn
      .map((id) => new mongoose.Types.ObjectId(id));

    return await conversation.save();
  }

  // Xóa thành viên khỏi nhóm chat
  async removeParticipant(
    conversationId: string,
    userId: string,
    currentUserId?: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only remove participants from group conversations');
    }
    if (currentUserId && currentUserId === userId) {
      console.log(`[LEAVE] User ${userId} tự rời nhóm ${conversationId}`);
    } else {
      console.log(`[REMOVE] User ${userId} bị xóa khỏi nhóm ${conversationId}`);
    }
    // // Không cho phép xóa admin
    // if (conversation.admin?.toString() === userId) {
    //   throw new Error('Cannot remove admin from group');
    // }

    // Xóa thành viên khỏi nhóm
    conversation.participants = conversation.participants.filter(
      (id) => id.toString() !== userId
    );

    return await conversation.save();
  }

  // Lấy thông tin chi tiết của một conversation
  async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [userId] },
    })
      // .populate('participants', 'username avatar')
      // .populate('lastMessage', 'content type sender')
      // .lean();
      .populate('participants', 'username avatar role department')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar _id' },
      });

    if (!conversation) {
      throw new ForbiddenException({
        errorCode: "403",
        errorMessage: 'You are not a participant of this conversation',
      });
    }
    return conversation;
  }
  async leaveConversation(
    conversationId: string,
    userId: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Nếu conversation không có participants thì thôi
    if (!conversation.participants || conversation.participants.length === 0) {
      throw new Error('Conversation has no participants');
    }

    // 🧩 Xóa user khỏi participants
    conversation.participants = conversation.participants.filter(
      (id) => id.toString() !== userId
    );

    await conversation.save();

    // Nếu sau khi xóa không còn ai trong participants → xóa luôn conversation
    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndDelete(conversationId);
      console.log(`[DELETE] Conversation ${conversationId} removed (empty)`);
      return conversation;
    }

    // Populate lại để FE cập nhật realtime
    const updated = await Conversation.findById(conversation._id)
      .populate('participants', '_id username avatar department role')
      .populate('lastMessage');

    console.log(`[LEAVE] User ${userId} left conversation ${conversationId}`);

    return updated!;
  }

  async getFullConversation(conversationId: string): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar')
      .populate('lastMessage', 'content type sender')
      .lean();
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username');
    const fullConversation = {
      ...conversation,
      messages,
    };
    return fullConversation;
  }
  async deleteMessage(
    messageId: string,
    userId: string,
    deleteType: 'me' | 'everyone'
  ) {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (deleteType === 'me') {
      return await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { deletedBy: new Types.ObjectId(userId) } },
        { new: true }
      ).lean();
    }

    if (deleteType === 'everyone') {
      if (message.sender.toString() !== userId.toString()) {
        throw new Error('Only sender can delete for everyone');
      }

      return await Message.findByIdAndUpdate(
        messageId,
        { isDeletedForEveryone: true },
        { new: true }
      ).lean();
    }

    throw new Error('Invalid deleteType');
  }

  // Xoá toàn bộ conversation (1 phía)
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $addToSet: { deletedBy: new Types.ObjectId(userId) },
    });

    await Message.updateMany(
      { conversation: conversationId },
      { $addToSet: { deletedBy: new Types.ObjectId(userId) } }
    );

    // return lại conversation để controller/socket emit cho client
    return await Conversation.findById(conversationId)
      .populate('participants', 'username avatar')
      .lean();
  }
  //   async getAllConversationsForAdmin(period: "all" | "week" | "month" = "all"): Promise<any[]> {
  //    if (period === "all") {
  //   const conversations = await Conversation.find({})
  //     .populate("participants", "username avatar")
  //     .populate("lastMessage", "content createdAt")
  //     .sort({ updatedAt: -1 })
  //     .lean();
  //   const withMessageCounts = await Promise.all(
  //     conversations.map(async (conv) => {
  //       const totalMessages = await Message.countDocuments({
  //         conversation: conv._id,
  //       });

  //       return {
  //         ...conv,
  //         totalMessages,
  //       };
  //     })
  //   );

  //   return withMessageCounts;
  // }

  // if (period === "week") {
  //   const startOfWeek = new Date();
  //   startOfWeek.setDate(startOfWeek.getDate() - 7);

  //   // 🔸 Lấy top user theo số lượng tin nhắn trong tuần
  //   const topWeek = await Message.aggregate([
  //     { $match: { createdAt: { $gte: startOfWeek } } },
  //     { $group: { _id: "$sender", totalMessages: { $sum: 1 } } },
  //     { $sort: { totalMessages: -1 } },
  //     { $limit: 10 },
  //   ]);

  //   const userIds = topWeek.map((u) => u._id);
  //   const users = await User.find({ _id: { $in: userIds } }).select("username avatar");
  //   const conversations = await Conversation.find({
  //     participants: { $in: userIds },
  //   })
  //     .populate("lastMessage", "content createdAt")
  //     .lean();

  //   return topWeek.map((item) => {
  //     const user = users.find((u) => String(u._id) === String(item._id));
  //     const conversation = conversations.find((c) =>
  //       c.participants.some((p) => String(p) === String(item._id))
  //     );

  //     return {
  //       _id: item._id,
  //       user,
  //       lastMessage: conversation?.lastMessage || null,
  //       totalMessages: item.totalMessages,
  //     };
  //   });
  // }

  // // 🟠 Case 3: TOP TRONG THÁNG
  // if (period === "month") {
  //   const startOfMonth = new Date();
  //   startOfMonth.setDate(startOfMonth.getDate() - 30);

  //   // 🔸 Lấy top user theo số lượng tin nhắn trong tháng
  //   const topMonth = await Message.aggregate([
  //     { $match: { createdAt: { $gte: startOfMonth } } },
  //     { $group: { _id: "$sender", totalMessages: { $sum: 1 } } },
  //     { $sort: { totalMessages: -1 } },
  //     { $limit: 10 },
  //   ]);

  //   const userIds = topMonth.map((u) => u._id);
  //   const users = await User.find({ _id: { $in: userIds } }).select("username avatar");
  //   const conversations = await Conversation.find({
  //     participants: { $in: userIds },
  //   })
  //     .populate("lastMessage", "content createdAt")
  //     .lean();

  //   // 🔹 Kết hợp dữ liệu
  //   return topMonth.map((item) => {
  //     const user = users.find((u) => String(u._id) === String(item._id));
  //     const conversation = conversations.find((c) =>
  //       c.participants.some((p) => String(p) === String(item._id))
  //     );

  //     return {
  //       _id: item._id,
  //       user,
  //       lastMessage: conversation?.lastMessage || null,
  //       totalMessages: item.totalMessages,
  //     };
  //   });
  // }

  //       return [];

  //   }
  async getAllConversationsForAdmin(period: string): Promise<any[]> {
    // 🟢 Nếu là "all" → lấy toàn bộ
    if (period === 'all') {
      const conversations = await Conversation.find({})
        .populate('participants', 'username avatar')
        .populate('lastMessage', 'content createdAt')
        .sort({ updatedAt: -1 })
        .lean();

      const conversationsWithCount = await Promise.all(
        conversations.map(async (conv) => {
          const totalMessages = await Message.countDocuments({
            conversation: conv._id,
          });
          return { ...conv, totalMessages };
        })
      );

      return conversationsWithCount;
    }

    // 🟠 Nếu là "week" hoặc "month" → vẫn lọc, nhưng trả về toàn bộ thông tin conversation
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    }

    // Lấy những conversation có message trong khoảng thời gian tương ứng
    const recentConversations = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$conversation', totalMessages: { $sum: 1 } } },
      { $sort: { totalMessages: -1 } },
      { $limit: 10 },
    ]);

    if (!recentConversations.length) {
      return [];
    }

    const conversationIds = recentConversations.map((c) => c._id);

    // Lấy toàn bộ conversation đầy đủ thông tin
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
    })
      .populate('participants', 'username avatar')
      .populate('lastMessage', 'content createdAt')
      .sort({ updatedAt: -1 })
      .lean();

    // Gắn thêm totalMessages tương ứng
    const result = conversations.map((conv) => {
      const matched = recentConversations.find(
        (r) => String(r._id) === String(conv._id)
      );
      return {
        ...conv,
        totalMessages: matched ? matched.totalMessages : 0,
      };
    });

    return result;
  }
}
export default new ConversationService();
