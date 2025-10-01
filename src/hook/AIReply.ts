import OpenAI from 'openai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import TelegramBot from 'node-telegram-bot-api';
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // nhớ đã load dotenv.config()
});

export async function getAIReply(userMessage: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // 👈 dùng model bạn muốn
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant for customer support.',
        },
        { role: 'user', content: userMessage },
      ],
    });

    return completion.choices[0].message?.content || 'Xin lỗi, tôi chưa hiểu.';
  } catch (err) {
    console.error('OpenAI API error:', err);
    return 'Xin lỗi, hiện tại AI đang gặp sự cố.';
  }
}
export async function getUserName(sender_psid: string, FB_PAGE_TOKEN: string) {
  const url = `https://graph.facebook.com/${sender_psid}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_TOKEN}`;

  const response = await fetch(url);
  const data = await response.json();
  console.log(data);
  return data; // { first_name: "A", last_name: "B", profile_pic: "..." }
}
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
