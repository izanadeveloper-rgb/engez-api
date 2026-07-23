// كود بحث تيكتوك يدعم فيديو ويوزر وصور وداتا 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys';

const API_BASE = 'https://engez.a7a.online/api/v1';

const TT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    'Referer': 'https://www.tiktok.com/',
    'Accept': '*/*',
    'Accept-Encoding': 'identity;q=1, *;q=0',
    'Range': 'bytes=0-'
};

// دالة تنزيل ملف من CDN تيك توك كـ buffer (بدل ما نبعت الرابط مباشر لبايليز)
async function fetchTikTokBuffer(url) {
    try {
        const response = await axios.get(url, {
            headers: TT_HEADERS,
            responseType: 'arraybuffer',
            timeout: 60000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
        });

        const buffer = Buffer.from(response.data);

        if (!buffer || buffer.length < 1024) {
            throw new Error('الملف الراجع من CDN فارغ أو تالف');
        }

        return buffer;
    } catch (error) {
        if (error.response) {
            throw new Error(`انتهت صلاحية رابط الفيديو أو تم رفضه من تيك توك (${error.response.status})`);
        }
        if (error.code === 'ECONNABORTED') {
            throw new Error('انتهت مهلة تحميل الفيديو من CDN تيك توك');
        }
        throw new Error(`فشل تحميل الفيديو من CDN: ${error.message}`);
    }
}

// دالة البحث في تيك توك
async function searchTikTok(query, type = 'all') {
    try {
        const params = new URLSearchParams();
        params.append('q', query);
        if (type !== 'all') params.append('type', type);

        const response = await axios.get(`${API_BASE}/search/tiktok?${params.toString()}`, {
            timeout: 30000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل البحث في تيك توك');
        }

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`خطأ من السيرفر: ${error.response.status}`);
        }
        throw new Error(error.message || 'فشل الاتصال بخدمة البحث');
    }
}

// دالة تحميل فيديو من تيك توك
async function downloadTikTok(url, action = 'video') {
    try {
        const params = new URLSearchParams();
        params.append('url', url);
        if (action !== 'video') params.append('action', action);

        const response = await axios.get(`${API_BASE}/download/tiktok?${params.toString()}`, {
            timeout: 60000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل تحميل الفيديو');
        }

        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`خطأ من السيرفر: ${error.response.status}`);
        }
        throw new Error(error.message || 'فشل الاتصال بخدمة التحميل');
    }
}

// دوال مساعدة
function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(ms) {
    if (!ms) return '0';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
}

const FOOTER = "◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•";
const DEFAULT_THUMB = "https://i.postimg.cc/w1Ln04gV/upload-1775306108949.jpg";

// دالة لإنشاء صورة للكاروسيل
async function createImage(url, conn) {
    try {
        const _media_ = await prepareWAMessageMedia({
            image: { url: url || DEFAULT_THUMB }
        }, {
            upload: conn.waUploadToServer
        });
        return _media_.imageMessage;
    } catch (e) {
        console.error("❌ فشل تحميل صورة:", e.message);
        const _media_ = await prepareWAMessageMedia({
            image: { url: DEFAULT_THUMB }
        }, {
            upload: conn.waUploadToServer
        });
        return _media_.imageMessage;
    }
}

// دالة لإنشاء كارت فيديو محمّل فعليًا للكاروسيل (بدل صورة غلاف + زرار تحميل)
// بترجع { type: 'video', message } أو { type: 'image', message } (fallback لو فشل تحميل الفيديو)
async function createVideoCardMedia(videoUrl, coverUrl, conn) {
    try {
        const buffer = await fetchTikTokBuffer(videoUrl);
        const _media_ = await prepareWAMessageMedia({
            video: buffer
        }, {
            upload: conn.waUploadToServer
        });
        return { type: 'video', message: _media_.videoMessage };
    } catch (e) {
        console.error('❌ فشل تحميل فيديو للكاروسيل، استخدام صورة الغلاف:', e.message);
        const image = await createImage(coverUrl, conn);
        return { type: 'image', message: image };
    }
}

// إرسال فيديو تيك توك: تحميل كامل عبر axios ثم إرسال الـ buffer، بدون أي fallback لستريم بايليز
async function sendTikTokVideo(conn, chat, videoUrl, caption, quoted) {
    const buffer = await fetchTikTokBuffer(videoUrl);
    await conn.sendMessage(chat, {
        video: buffer,
        caption
    }, { quoted });
}

// ============= الأمر الرئيسي =============
const handler = async (m, { conn, text, command }) => {
    if (!text) {
        return m.reply(
            '❌ *يرجى إدخال نص البحث أو رابط الفيديو*\n\n' +
            '📌 *الأوامر المتاحة:*\n' +
            '• `.تيكو [اسم]` - بحث والحصول على 3 فيديوهات ككاروسيل\n' +
            '• `.تيك-يوزر [اسم]` - بحث عن مستخدمين ككاروسيل\n' +
            '• `.تيك-معلومات [رابط]` - جميع المعلومات'
        );
    }

    await m.react('⏳');

    try {
        const isUrl = text.includes('tiktok.com') || text.includes('vt.tiktok');

        if (isUrl) {
            // ====== معالجة الروابط ======

            // تيك-معلومات (الأمر الوحيد اللي بيشتغل على رابط)
            if (command === 'تيك-معلومات' || command === 'tik-info') {
                const data = await downloadTikTok(text, 'video');

                let infoText = '📥 *معلومات التحميل*\n\n';
                if (data.info) {
                    const info = data.info;
                    infoText += `🎬 *الوصف:* ${info.desc?.slice(0, 100) || 'بدون وصف'}\n`;
                    if (info.author) {
                        infoText += `👤 *القناة:* @${info.author.username || 'مجهول'}\n`;
                    }
                    infoText += `⏱️ *المدة:* ${formatDuration(info.duration)} ثانية\n`;
                    infoText += `❤️ *إعجابات:* ${formatNumber(info.likes)}\n`;
                    infoText += `💬 *تعليقات:* ${formatNumber(info.comments)}\n`;
                    infoText += `🔄 *مشاركات:* ${formatNumber(info.shares)}\n`;
                    infoText += `👁️ *مشاهدات:* ${formatNumber(info.plays)}\n\n`;
                }

                if (data.videoUrl) {
                    infoText += `🎥 *رابط الفيديو:*\n${data.videoUrl}\n\n`;
                }
                if (data.audioUrl) {
                    infoText += `🎵 *رابط الصوت:*\n${data.audioUrl}\n\n`;
                }
                if (data.author) {
                    infoText += `👤 *معلومات المؤلف:*\n`;
                    infoText += `   📛 ${data.author.nickname || data.author.username}\n`;
                    infoText += `   👥 ${formatNumber(data.author.followers)} متابع\n`;
                    infoText += `   📝 ${data.author.bio?.slice(0, 60) || 'لا يوجد وصف'}\n`;
                }
                if (data.music) {
                    infoText += `\n🎵 *معلومات الموسيقى:*\n`;
                    infoText += `   🎵 ${data.music.title || 'بدون عنوان'}\n`;
                    infoText += `   👤 ${data.music.author || 'مجهول'}\n`;
                    infoText += `   ⏱️ ${formatDuration(data.music.duration)} ثانية\n`;
                }

                await m.reply(infoText);

                if (data.videoUrl) {
                    await sendTikTokVideo(
                        conn,
                        m.chat,
                        data.videoUrl,
                        `🎬 ${data.info?.desc?.slice(0, 100) || 'فيديو تيك توك'}`,
                        m
                    );
                }
                await m.react('✅');
                return;
            }

            throw new Error('هذا الأمر لا يعمل مع الروابط، استخدم .تيك-معلومات [رابط]');

        } else {
            // ====== معالجة البحث ======

            // تيك-يوزر
            if (command === 'تيك-يوزر' || command === 'tik-users') {
                const data = await searchTikTok(text, 'users');
                const users = data.results || data.users || [];

                if (users.length === 0) {
                    throw new Error('لم يتم العثور على مستخدمين');
                }

                // بناء كاروسيل المستخدمين
                let cards = [];
                for (const user of users.slice(0, 10)) {
                    try {
                        const card = {
                            body: proto.Message.InteractiveMessage.Body.fromObject({
                                text:
                                    `👤 *الاسم:* ${user.nickname || user.username}\n` +
                                    `🆔 *المعرف:* @${user.username}\n` +
                                    `👥 *المتابعين:* ${formatNumber(user.followers)}\n` +
                                    `📝 *النبذة:* ${user.bio?.slice(0, 60) || 'لا يوجد وصف'}`
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({
                                text: FOOTER
                            }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({
                                title: `👤 @${user.username}`,
                                hasMediaAttachment: true,
                                imageMessage: await createImage(user.avatar || DEFAULT_THUMB, conn)
                            }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                                buttons: [
                                    {
                                        name: "cta_url",
                                        buttonParamsJson: JSON.stringify({
                                            display_text: "📎 عرض البروفايل",
                                            url: user.profileUrl || `https://www.tiktok.com/@${user.username}`
                                        })
                                    }
                                ]
                            })
                        };
                        cards.push(card);
                    } catch (e) {
                        console.error('❌ خطأ في بناء كارد المستخدم:', e.message);
                    }
                }

                if (cards.length === 0) {
                    throw new Error('فشل في بناء نتائج البحث');
                }

                const finalMessage = generateWAMessageFromContent(m.chat, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: {
                                body: proto.Message.InteractiveMessage.Body.create({
                                    text: `🔍 *نتائج البحث عن مستخدمين: ${text}*`
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
                return;
            }

            // تيكو - بحث وتحميل 3 فيديوهات ككاروسيل
            const data = await searchTikTok(text, 'videos');
            const videos = data.results || data.videos || [];

            if (videos.length === 0) {
                throw new Error('لم يتم العثور على فيديوهات. جرب كلمة بحث مختلفة.');
            }

            // بناء كاروسيل بـ3 كروت فيديو محمّلين فعليًا جوه الكاروسيل
            let cards = [];
            let count = 1;
            const displayVideos = videos.slice(0, 3);

            for (const video of displayVideos) {
                try {
                    const media = await createVideoCardMedia(video.videoUrl, video.cover || DEFAULT_THUMB, conn);

                    const headerFields = {
                        title: `🎬 فيديو ${count++}`,
                        hasMediaAttachment: true
                    };
                    if (media.type === 'video') {
                        headerFields.videoMessage = media.message;
                    } else {
                        headerFields.imageMessage = media.message;
                    }

                    const buttons = [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📎 فتح على TikTok",
                                url: video.postUrl
                            })
                        }
                    ];
                    // لو فشل تحميل الفيديو وترجعنا لصورة الغلاف، نضيف زرار تحميل يدوي كـ fallback
                    if (media.type === 'image') {
                        buttons.unshift({
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🎬 تحميل",
                                id: `.تيك ${video.postUrl}`
                            })
                        });
                    }

                    const card = {
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text:
                                `🎬 *${video.desc?.slice(0, 80) || 'بدون وصف'}*\n` +
                                `👤 @${video.author?.nickname || 'مجهول'}\n` +
                                `❤️ ${formatNumber(video.likes)} | 💬 ${formatNumber(video.comments)} | 🔄 ${formatNumber(video.shares)}\n` +
                                `▶️ ${formatDuration(video.duration)} | 👁️ ${formatNumber(video.plays)}`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: FOOTER
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject(headerFields),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons
                        })
                    };
                    cards.push(card);
                } catch (e) {
                    console.error('❌ خطأ في بناء كارد الفيديو:', e.message);
                }
            }

            if (cards.length === 0) {
                throw new Error('فشل في بناء نتائج البحث');
            }

            const finalMessage = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: `🔍 *نتائج البحث عن: ${text}*`
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
        }

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        await m.react('❌');

        let errorMsg = `❌ *خطأ:* ${error.message}`;

        // نصائح للمستخدم
        if (error.message.includes('فشل البحث')) {
            errorMsg += '\n\n💡 *نصائح:*\n';
            errorMsg += '• تأكد من صحة كلمة البحث\n';
            errorMsg += '• حاول استخدام كلمات بحث مختلفة\n';
            errorMsg += '• تأكد من اتصالك بالإنترنت';
        } else if (error.message.includes('فشل التحميل')) {
            errorMsg += '\n\n💡 *نصائح:*\n';
            errorMsg += '• تأكد من صحة الرابط\n';
            errorMsg += '• حاول استخدام رابط فيديو من تيك توك\n';
            errorMsg += '• تأكد من أن الفيديو غير محذوف';
        }

        return m.reply(errorMsg);
    }
};

// تعريف الأوامر
handler.command = [
    'تيكو', 'tikco',
    'تيك-يوزر', 'tik-users',
    'تيك-معلومات', 'tik-info'
];

handler.help = [
    'تيكو [بحث] - بحث والحصول على 3 فيديوهات ككاروسيل',
    'تيك-يوزر [اسم] - بحث عن مستخدمين ككاروسيل',
    'تيك-معلومات [رابط] - جميع المعلومات'
];

handler.tags = ['download', 'search'];
handler.limit = true;

export default handler;
