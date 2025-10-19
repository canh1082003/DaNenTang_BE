import Conversation from '@/databases/entities/Conversation';
import Message, { IMessage } from '@/databases/entities/Message';

class ChatService {
  async SendMessage(
    data: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'file';
      fileName?: string;
    },
    senderId: string
  ): Promise<IMessage> {
    const message = new Message({
      conversation: data.conversationId,
      fileName: data.fileName || null,
      sender: senderId,
      content: data.content,
      type: data.type || 'text',
      readBy: [senderId],
    });

    const savedMessage = await message.save();

    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessage: savedMessage._id,
    });
    return savedMessage;
  }
  async getRoomChatByConversation(conversationId: string) {
    const conversation = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username');
    return conversation;
  }
}
export default new ChatService();
