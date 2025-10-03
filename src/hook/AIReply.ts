import axios from 'axios';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import TelegramBot from 'node-telegram-bot-api';
dotenv.config();

export async function getAIReply(
  userMessage: string,
  imageUrl?: string // nếu có ảnh thì truyền URL ảnh vào
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch('https://v98store.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini', // hỗ trợ multimodal (text + image)
        messages: [
          {
            role: 'system',
            content:
              'Bạn là một trợ lý AI cá nhân của Công Anh. Khi giao tiếp, hãy xưng "mình" và nói với người đối thoại là "bạn". Không tự nhận tên người dùng là Công Anh, chỉ giới thiệu bản thân là trợ lý của Công Anh. Hãy trả lời tự nhiên, thân thiện, gần gũi như con người.',
          },
          {
            role: 'user',
            content: imageUrl
              ? [
                  {
                    type: 'text',
                    text: userMessage || 'Phân tích giúp mình bức ảnh này',
                  },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ]
              : [{ type: 'text', text: userMessage }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const completion = await response.json();

    return (
      completion.choices?.[0]?.message?.content ||
      'Xin lỗi, tôi chưa hiểu rõ. Bạn có thể nói lại tự nhiên hơn không?'
    );
  } catch (err) {
    console.error('API error:', err);
    return 'Xin lỗi, hiện tại AI của Công Anh đang gặp sự cố.';
  }
}

// 🔹 Hàm detectIntent
export async function detectIntent(
  userMessage: string
): Promise<'sales' | 'support' | 'care' | 'other'> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    const response = await fetch('https://v98store.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `
              Bạn là bộ phân loại intent cho hệ thống CSKH.
              Nhiệm vụ: phân loại câu khách hàng vào 1 trong 4 nhóm:
              - "sales": hỏi mua hàng, tư vấn sản phẩm, giá cả
              - "support": bảo hành, sửa chữa, lỗi kỹ thuật
              - "care": khiếu nại, phản hồi dịch vụ, chăm sóc khách hàng
              - "other": không thuộc các nhóm trên
              Chỉ trả về đúng 1 từ trong [sales, support, care, other].
            `,
          },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const completion = await response.json();

    const intent =
      completion.choices?.[0]?.message?.content?.trim().toLowerCase() ||
      'other';

    if (['sales', 'support', 'care'].includes(intent)) {
      return intent as 'sales' | 'support' | 'care';
    }
    return 'other';
  } catch (err) {
    console.error('API error:', err);
    return 'other';
  }
}

export async function getUserName(sender_psid: string, FB_PAGE_TOKEN: string) {
  const url = `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_TOKEN}`;

  const response = await fetch(url);
  const data = await response.json();
  console.log(data);
  return data;
}
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const res = await axios.get(
    `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
  );
  const filePath = res.data.result.file_path;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
