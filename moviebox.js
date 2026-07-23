// كود بحث وتحميل افلام ومسلسلات من moviebox 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const API_BASE = 'https://engez.a7a.online/api/v1';
const DEFAULT_IMAGE = 'https://i.postimg.cc/4YhmK9BP/upload-1784848590246.jpg';

async function searchMovie(query) {
    try {
        const params = new URLSearchParams();
        params.append('action', 'بحث');
        params.append('q', query);

        const response = await axios.get(`${API_BASE}/download/moviebox?${params.toString()}`, {
            timeout: 30000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل البحث');
        }

        return response.data;
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال');
    }
}

async function getEpisodes(subjectId, subjectType) {
    try {
        const params = new URLSearchParams();
        params.append('action', 'حلقات');
        params.append('subjectId', subjectId);
        params.append('subjectType', subjectType);

        const response = await axios.get(`${API_BASE}/download/moviebox?${params.toString()}`, {
            timeout: 30000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل جلب الحلقات');
        }

        return response.data;
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال');
    }
}

async function downloadEpisode(subjectId, subjectType, episode) {
    try {
        const params = new URLSearchParams();
        params.append('action', 'تحميل');
        params.append('subjectId', subjectId);
        params.append('subjectType', subjectType);
        params.append('episode', episode);

        const response = await axios.get(`${API_BASE}/download/moviebox?${params.toString()}`, {
            timeout: 30000
        });

        if (!response.data?.success || !response.data?.url) {
            throw new Error(response.data?.error || 'فشل التحميل');
        }

        return response.data;
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال');
    }
}

function formatDuration(seconds) {
    if (!seconds) return '0 د';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} د`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours}س ${remaining}د`;
}

const sendList = async (m, conn, { body, footer, buttonText, sections }) => {
    try {
        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        footer: { text: footer || '🎬 MOVIEBOX' },
                        nativeFlowMessage: {
                            buttons: [{
                                name: 'single_select',
                                buttonParamsJson: JSON.stringify({
                                    title: buttonText,
                                    sections
                                })
                            }]
                        }
                    }
                }
            }
        }, { userJid: conn.user.jid, quoted: m });
        await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    } catch (e) {
        console.error('sendList error:', e);
        await m.reply(body);
    }
};

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            '❌ *يرجى إدخال اسم الفيلم أو المسلسل*\n\n' +
            '📌 *مثال:*\n' +
            `• ${usedPrefix}فيلم علي كلاي`
        );
    }

    await m.react('⏳');

    try {
        if (command === 'فيلم' || command === 'movie') {
            const searchResult = await searchMovie(text);
            const results = searchResult.results || [];

            if (results.length === 0) {
                throw new Error('لا توجد نتائج');
            }

            const sections = [{
                title: '🎬 النتائج',
                rows: results.slice(0, 10).map(item => ({
                    title: item.title.substring(0, 30),
                    description: `⭐ ${item.rating || 'N/A'} | ${item.type || 'غير معروف'}`,
                    id: `${usedPrefix}حلقات ${item.id}|${item.typeId}|${encodeURIComponent(item.title)}`
                }))
            }];

            await sendList(m, conn, {
                body: `🔍 *نتائج البحث عن:* ${text}\n📊 *عدد النتائج:* ${results.length}\n\n👇 اختر الفيلم أو المسلسل:`,
                footer: '🎬 MOVIEBOX',
                buttonText: '📋 اختر عنوان',
                sections
            });

            await m.react('✅');
        }

        if (command === 'حلقات') {
            const [subjectId, subjectType, rawTitle] = text.split('|');
            const title = decodeURIComponent(rawTitle);

            const episodesData = await getEpisodes(subjectId, subjectType);
            const episodes = episodesData.results || [];

            if (episodes.length === 0) {
                throw new Error('لا توجد حلقات');
            }

            const sections = [{
                title: `📺 ${title}`,
                rows: episodes.slice(0, 20).map(ep => ({
                    title: `الحلقة ${ep.episode}`,
                    description: `⏱ ${formatDuration(ep.duration)}`,
                    id: `${usedPrefix}تحميل ${subjectId}|${subjectType}|${ep.episode}|${encodeURIComponent(title)}`
                }))
            }];

            await sendList(m, conn, {
                body: `📺 *${title}*\n📊 *عدد الحلقات:* ${episodes.length}\n\n👇 اختر الحلقة:`,
                footer: '🎬 MOVIEBOX',
                buttonText: '📋 اختر حلقة',
                sections
            });

            await m.react('✅');
        }

        if (command === 'تحميل') {
            const [subjectId, subjectType, episode, rawTitle] = text.split('|');
            const title = decodeURIComponent(rawTitle);

            await m.reply(`⏳ جاري تحميل ${title} - الحلقة ${episode}...`);

            const downloadData = await downloadEpisode(subjectId, subjectType, episode);

            if (downloadData.url) {
                await conn.sendMessage(m.chat, {
                    video: { url: downloadData.url },
                    caption: `✅ *تم التحميل*\n📺 ${title}\n📌 الحلقة ${episode}`
                }, { quoted: m });

                await m.react('✅');
            } else {
                throw new Error('فشل الحصول على رابط التحميل');
            }
        }

    } catch (error) {
        await m.react('❌');
        return m.reply(`❌ *خطأ:* ${error.message}`);
    }
};

handler.command = ['فيلم', 'movie', 'حلقات', 'تحميل'];

export default handler;
