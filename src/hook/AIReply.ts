import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';
import fetch from 'node-fetch';
import TelegramBot from 'node-telegram-bot-api';
import { v2 as cloudinary } from 'cloudinary';
import { systemPrompt } from './prompt';
dotenv.config();

export async function getAIReply(
  userMessage: string,
  imageUrl?: string,
  conversationHistory?: any[]
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const formattedMessages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...(conversationHistory || []),
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
    ];
    const response = await fetch('https://v98store.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: formattedMessages,
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
): Promise<
  | 'view_product'
  | 'buy_product'
  | 'consult_product'
  | 'support'
  | 'care'
  | 'other'
> {
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
  Nhiệm vụ: phân loại câu khách hàng vào 1 trong 6 nhóm:
  - "view_product": khách muốn xem sản phẩm, danh sách, mẫu mã
  - "buy_product": khách muốn mua hàng, hỏi giá, hỏi size, hỏi cách đặt hàng .tư vấn chọn sản phẩm phù hợp, khách hỏi so sánh
  - "consult_product": 
  - "support": bảo hành, sửa chữa, lỗi kỹ thuật
  - "care": khiếu nại, phản hồi dịch vụ, chăm sóc khách hàng
  - "other": thuộc về buy_product
  Chỉ trả về đúng 1 từ trong [view_product, buy_product, consult_product, support, care, other].
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

    if (
      [
        'view_product',
        'buy_product',
        'consult_product',
        'support',
        'care',
      ].includes(intent)
    ) {
      return intent as
        | 'view_product'
        | 'buy_product'
        | 'consult_product'
        | 'support'
        | 'care';
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
  if (data.error) {
    return { first_name: `fb_user_${sender_psid}`, last_name: '' };
  }

  return data;
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    // 1️⃣ Lấy file_path từ Telegram
    const res = await axios.get(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`
    );

    if (!res.data.ok) {
      throw new Error('Failed to get Telegram file');
    }
    const filePath = res.data.result.file_path;
    const telegramFileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 2️⃣ Tải file từ Telegram về
    const fileResponse = await axios.get(telegramFileUrl, {
      responseType: 'arraybuffer',
    });

    // 3️⃣ Upload lên Cloudinary — để lưu vĩnh viễn
    const uploadResult: any = await new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'TelegramUploads',
          resource_type: 'auto', // ảnh, gif, webp, v.v.
        },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
      upload.end(Buffer.from(fileResponse.data));
    });

    // 4️⃣ Trả về link Cloudinary
    return uploadResult.secure_url;
  } catch (error: any) {
    console.error('❌ Error in getTelegramFileUrl:', error.message);
    throw error;
  }
}

export const sendTelegramDocument = async (
  chatId: string,
  fileUrl: string,
  fileName?: string
) => {
  try {
    const fileResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
    });

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append(
      'document',
      Buffer.from(fileResponse.data),
      fileName || 'file'
    );

    const res = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✅ Telegram document sent:', res.data);
    return res.data;
  } catch (err: any) {
    console.error(
      '❌ Error sending Telegram document:',
      err.response?.data || err.message
    );
    throw err;
  }
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
