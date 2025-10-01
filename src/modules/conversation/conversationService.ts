import Conversation, { IConversation } from '@/databases/entities/Conversation';
import Message from '@/databases/entities/Message';
import User from '@/databases/entities/User';
import mongoose from 'mongoose';
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

  // Tạo nhóm chat mới
  async createGroupConversation(data: {
    name: string;
    admin: string;
    participants: string[];
  }): Promise<IConversation> {
    const newConversation = new Conversation({
      type: 'group',
      name: data.name,
      admin: data.admin,
      participants: data.participants,
    });

    return await newConversation.save();
  }
  async getAllConversations(userId: string) {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username avatar')
      .populate('lastMessage')
      .lean();

    return conversations;
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

    conversation.participants = Array.from(
      new Set([
        ...conversation.participants.map((id) => id.toString()),
        ...userIds,
      ])
    ).map((id) => new mongoose.Types.ObjectId(id));

    return await conversation.save();
  }

  // Xóa thành viên khỏi nhóm chat
  async removeParticipant(
    conversationId: string,
    userId: string
  ): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Can only remove participants from group conversations');
    }

    // Không cho phép xóa admin
    if (conversation.admin?.toString() === userId) {
      throw new Error('Cannot remove admin from group');
    }

    // Xóa thành viên khỏi nhóm
    conversation.participants = conversation.participants.filter(
      (id) => id.toString() !== userId
    );

    return await conversation.save();
  }

  // Lấy thông tin chi tiết của một conversation
  async getConversationById(conversationId: string): Promise<IConversation> {
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username avatar')
      .populate('lastMessage', 'content type sender')
      .lean();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return conversation;
  }
  async deleteConversationId(conversationId: string): Promise<IConversation> {
    const conversation = await Conversation.findByIdAndDelete(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation;
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
}
export default new ConversationService();
