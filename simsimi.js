// plugins/simsimi.js
// كود شات مع سمسم الرسمي
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';

const handler = async (m, { conn, text, prefix, command }) => {
  // تحقق من وجود نص
  if (!text) {
    return m.reply(`❌ *استخدام الأمر:*\n${prefix + command} <النص>\n\n*مثال:*\n${prefix + command} كيف حالك؟`);
  }

  // رسالة انتظار
  await m.reply('⏳ *جاري التفكير...*');

  try {
    // إرسال الطلب إلى API - نفس اللي في مثالك
    const { data } = await axios.get('https://engez.a7a.online/api/v1/ai/ai/simsimi', {
      params: {
        action: 'تكلم',
        message: text
      },
      timeout: 15000
    });

    // التحقق من نجاح الطلب - نفس هيكل الرد في مثالك
    if (data.success && data.response?.reply) {
      // الرد بنفس التنسيق
      await m.reply(`🤖 *سمسم:* ${data.response.reply}`);
    } else {
      await m.reply('❌ *سمسم:* ما فهمت، حاول مرة أخرى 😅');
    }

  } catch (error) {
    console.error('SimSimi Error:', error);
    await m.reply('❌ *سمسم:* حدث خطأ، حاول مرة أخرى');
  }
};

handler.help = ['سمسم <نص>'];
handler.tags = ['fun'];
handler.command = /^(سمسم|simsimi)$/i;

export default handler;
