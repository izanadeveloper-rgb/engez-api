// كود بحث ريلزات انستا
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys';

const API_BASE = 'https://engez.a7a.online/api/v1';

// دالة البحث في انستغرام
async function searchInstagram(query) {
    try {
        const params = new URLSearchParams();
        params.append('q', query);

        const response = await axios.get(`${API_BASE}/search/instagram?${params.toString()}`, {
            timeout: 30000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل البحث في انستغرام');
        }

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`خطأ من السيرفر: ${error.response.status}`);
        }
        throw new Error(error.message || 'فشل الاتصال بخدمة البحث');
    }
}

// دوال مساعدة
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

const FOOTER = "◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•";
const DEFAULT_THUMB = "https://i.postimg.cc/w1Ln04gV/upload-1775306108949.jpg";

// دالة لإنشاء فيديو للكاروسيل
async function createVideo(url, conn) {
    try {
        const _media_ = await prepareWAMessageMedia({
            video: { url: url }
        }, {
            upload: conn.waUploadToServer
        });
        return _media_.videoMessage;
    } catch (e) {
        console.error("❌ فشل تحميل فيديو:", e.message);
        return null;
    }
}

// ============= الأمر الرئيسي =============
const handler = async (m, { conn, text, command }) => {
    if (!text) {
        return m.reply(
            '❌ *يرجى إدخال نص البحث*\n\n' +
            '📌 *الأوامر المتاحة:*\n' +
            '• `.ريلات [اسم]` - بحث عن 3 ريلزات انستغرام'
        );
    }

    await m.react('⏳');

    try {
        // البحث في انستغرام
        const data = await searchInstagram(text);
        const results = data.results || [];
        
        if (results.length === 0) {
            throw new Error('لم يتم العثور على نتائج. جرب كلمة بحث مختلفة.');
        }

        // تصفية الفيديوهات فقط
        const videos = results.filter(item => item.mediaType === 'video' && item.videoUrl);
        
        if (videos.length === 0) {
            throw new Error('لم يتم العثور على ريلزات. جرب كلمة بحث مختلفة.');
        }

        // أخذ أول 3 فيديوهات
        const topVideos = videos.slice(0, 3);
        
        // بناء كاروسيل الفيديوهات
        let cards = [];
        let count = 1;

        for (const video of topVideos) {
            try {
                const videoMessage = await createVideo(video.videoUrl, conn);
                
                if (!videoMessage) {
                    continue;
                }

                const card = {
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                        text: 
                            `🎬 *${video.caption?.slice(0, 60) || 'ريلز انستغرام'}*\n` +
                            `👤 @${video.username || 'مجهول'}\n` +
                            `❤️ ${formatNumber(video.likes)} إعجاب`
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                        text: FOOTER
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                        title: `🎬 ريلز ${count++}`,
                        hasMediaAttachment: true,
                        videoMessage: videoMessage
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "📺 فتح على انستغرام",
                                    url: video.postUrl
                                })
                            }
                        ]
                    })
                };
                cards.push(card);
            } catch (e) {
                console.error('❌ خطأ في بناء كارد الفيديو:', e.message);
            }
        }

        if (cards.length === 0) {
            throw new Error('فشل في تحميل الفيديوهات');
        }

        // إرسال الكاروسيل
        const finalMessage = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: {
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `🔍 *نتائج البحث عن ريلزات: ${text}*`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: FOOTER
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            hasMediaAttachment: false
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                            cards
                        })
                    }
                }
            }
        }, {});

        await conn.relayMessage(m.chat, finalMessage.message, { messageId: finalMessage.key.id });
        await m.react('✅');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        await m.react('❌');
        return m.reply(`❌ *خطأ:* ${error.message}`);
    }
};

// تعريف الأوامر
handler.command = [
    'ريلات', 'reels', 'ريلز'
];

handler.help = [
    'ريلات [بحث] - بحث عن 3 ريلزات انستغرام'
];

handler.tags = ['download', 'search'];
handler.limit = true;

export default handler;
