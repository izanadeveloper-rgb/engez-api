// كود توليد صور يدعم موديلات راقية 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const API_BASE = 'https://engez.a7a.online/api/v1';

const MODELS = [
    { id: '1', name: 'Model 14' },
    { id: '2', name: 'Model 15' },
    { id: '3', name: 'Model 16' },
    { id: '4', name: 'MagicStudio' },
    { id: '5', name: 'FreeGen' },
    { id: '6', name: 'Flux (Realistic)' },
    { id: '7', name: 'Flux (Anime)' },
    { id: '8', name: 'Flux (Cinematic)' },
    { id: '9', name: 'Flux (Cyberpunk)' },
    { id: '10', name: 'Flux (Disney)' },
    { id: '11', name: 'Flux (No Style)' },
    { id: '12', name: 'Flux (Photographic)' },
    { id: '13', name: 'Flux (Cartoon)' },
    { id: '14', name: 'Flux (Manga)' },
    { id: '15', name: 'Flux (Digital Art)' },
    { id: '16', name: 'Flux (3D Model)' },
    { id: '17', name: 'Flux (Pixel Art)' }
];

async function generateImage(prompt, model) {
    try {
        const params = new URLSearchParams();
        params.append('prompt', prompt);
        params.append('model', model);

        const response = await axios.get(`${API_BASE}/ai/image-generator?${params.toString()}`, {
            timeout: 60000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل توليد الصورة');
        }

        return response.data.response;
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال');
    }
}

const sendList = async (m, conn, { body, footer, buttonText, sections }) => {
    try {
        const msg = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        footer: { text: footer || '❄️ 𝑹𝑨𝑮𝑵𝑨 𝑩𝑶𝑻 ❄️' },
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

// معالج الأمر الرئيسي
const handler = async (m, { conn, text, usedPrefix, command }) => {
    // استخراج رقم النموذج من الأمر (مثلاً تخيل15 -> 15)
    const modelMatch = command.match(/تخيل(\d+)/);
    if (modelMatch) {
        const modelId = modelMatch[1];
        if (!text) {
            return m.reply(
                '❌ *يرجى إدخال وصف الصورة*\n\n' +
                '📌 *مثال:*\n' +
                `• ${usedPrefix}${command} cat\n` +
                `• ${usedPrefix}${command} portrait of a girl`
            );
        }

        await m.react('⏳');

        try {
            await m.reply(`🎨 جاري توليد الصورة...\n📝 ${text}\n🆔 النموذج: ${modelId}`);

            const result = await generateImage(text, modelId);

            if (result?.url) {
                await conn.sendMessage(m.chat, {
                    image: { url: result.url },
                    caption: `🖼️ *تم توليد الصورة*\n📝 *الوصف:* ${text}\n🤖 *النموذج:* ${result.modelName || modelId}\n\n❄️ 𝑹𝑨𝑮𝑵𝑨 𝑩𝑶𝑻 ❄️`
                }, { quoted: m });

                await m.react('✅');
            } else {
                throw new Error('لم يتم العثور على الصورة');
            }

        } catch (error) {
            await m.react('❌');
            return m.reply(`❌ *خطأ:* ${error.message}`);
        }
        return;
    }

    // الأمر العادي (توليد) - يعرض قائمة النماذج
    if (!text) {
        return m.reply(
            '❌ *يرجى إدخال وصف الصورة*\n\n' +
            '📌 *الأوامر المتاحة:*\n' +
            `• ${usedPrefix}توليد cat - يعرض قائمة النماذج\n` +
            `• ${usedPrefix}تخيل15 cat - توليد مباشر بالنموذج 15`
        );
    }

    await m.react('⏳');

    try {
        // تقسيم النماذج إلى مجموعتين للعرض
        const sections = [{
            title: '🎨 الموديلات 1-9',
            rows: MODELS.slice(0, 9).map(model => ({
                title: model.name,
                description: `🆔 ${model.id}`,
                id: `${usedPrefix}تخيل${model.id} ${text}`
            }))
        }, {
            title: '🎨 الموديلات 10-17',
            rows: MODELS.slice(9).map(model => ({
                title: model.name,
                description: `🆔 ${model.id}`,
                id: `${usedPrefix}تخيل${model.id} ${text}`
            }))
        }];

        await sendList(m, conn, {
            body: `🖼️ *توليد صورة*\n📝 *الوصف:* ${text}\n\n👇 اختر النموذج المناسب:`,
            footer: '❄️ 𝑹𝑨𝑮𝑵𝑨 𝑩𝑶𝑻 ❄️',
            buttonText: '✨ اختر موديل',
            sections
        });

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        return m.reply(`❌ *خطأ:* ${error.message}`);
    }
};

handler.command = ['توليد', 'generate', 'تخيل', /^تخيل([1-9]|1[0-7])$/];

export default handler;
