// كود تحميل من انستا 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';

const API_BASE = 'https://engez.a7a.online/api/v1';

async function downloadInstagram(url) {
    const sources = ['yt5s', 'indown'];
    let lastError = null;

    for (const source of sources) {
        try {
            const params = new URLSearchParams();
            params.append('url', url);
            params.append('source', source);

            const response = await axios.get(`${API_BASE}/download/instagram?${params.toString()}`, {
                timeout: 30000
            });

            if (response.data?.success && response.data?.result?.length > 0) {
                const video = response.data.result.find(item => item.type === 'video');
                if (video?.url) {
                    return {
                        success: true,
                        source: source,
                        videoUrl: video.url
                    };
                }
            }
        } catch (error) {
            lastError = error.message;
            continue;
        }
    }

    throw new Error(`فشل التحميل: ${lastError}`);
}

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply('❌ *يرجى إدخال رابط انستغرام*\nمثال: .انستا https://www.instagram.com/p/xxx/');
    }

    if (!text.includes('instagram.com')) {
        return m.reply('❌ *رابط غير صحيح*');
    }

    await m.react('⏳');

    try {
        const result = await downloadInstagram(text);
        
        if (result.videoUrl) {
            await conn.sendMessage(m.chat, {
                video: { url: result.videoUrl },
                caption: `✅ تم التحميل\n📥 المصدر: ${result.source}`
            }, { quoted: m });
            
            await m.react('✅');
        }

    } catch (error) {
        await m.react('❌');
        return m.reply(`❌ ${error.message}`);
    }
};

handler.command = ['انستا', 'insta', 'instagram'];

export default handler;
