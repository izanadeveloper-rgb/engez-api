// كود عزل موسيقي عن الصوت او الفيديو
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const API_BASE = 'https://engez.a7a.online/api/v1';

// رفع الملف إلى Uguu
async function uploadToUguu(buffer, ext) {
    const form = new FormData();
    form.append('files[]', buffer, `file.${ext}`);

    try {
        const response = await axios.post('https://uguu.se/upload.php', form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000
        });

        if (!response.data?.files?.[0]?.url) {
            throw new Error('فشل في رفع الملف');
        }

        return response.data.files[0].url;
    } catch (error) {
        throw new Error(`فشل رفع الملف: ${error.message}`);
    }
}

async function removeVocal(url) {
    try {
        const params = new URLSearchParams();
        params.append('url', url);

        const response = await axios.get(`${API_BASE}/tools/vocal-remover?${params.toString()}`, {
            timeout: 60000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل في فصل الصوت');
        }

        return response.data.response;
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال');
    }
}

const handler = async (m, { conn, text }) => {
    // التحقق من وجود ملف مرفق أو رابط
    const mediaMsg = (m.mimetype ? m : null) || (m.quoted?.mimetype ? m.quoted : null);
    const isUrl = text?.match(/https?:\/\/\S+/);

    if (!mediaMsg && !isUrl) {
        return m.reply(
            '❌ *يرجى إرسال ملف صوت/فيديو أو رابط*\n\n' +
            '📌 *طرق الاستخدام:*\n' +
            '• أرسل ملف مع الأمر: `.فصل-صوت`\n' +
            '• أو استخدم رابط: `.فصل-صوت https://example.com/video.mp4`'
        );
    }

    await m.react('⏳');

    try {
        let fileUrl = null;

        // معالجة الملف المرفق
        if (mediaMsg) {
            await m.react('📤');
            
            const mediaBuffer = await mediaMsg.download();
            if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
                throw new Error('فشل تحميل الملف');
            }

            const fileInfo = await fileTypeFromBuffer(mediaBuffer);
            const ext = fileInfo?.ext || 'bin';

            await m.react('⬆️');
            fileUrl = await uploadToUguu(mediaBuffer, ext);
            
            if (!fileUrl) {
                throw new Error('فشل رفع الملف');
            }
        } else if (isUrl) {
            fileUrl = text.match(/https?:\/\/\S+/)[0];
        }

        await m.react('🔊');
        
        const result = await removeVocal(fileUrl);

        if (!result.vocal && !result.music) {
            throw new Error('لم يتم العثور على صوت');
        }

        let message = '🎵 *تم فصل الصوت بنجاح*\n\n';
        if (result.vocal) {
            message += `🎤 *الصوت:* ${result.vocal}\n`;
        }
        if (result.music) {
            message += `🎶 *الموسيقى:* ${result.music}\n`;
        }

        await m.reply(message);

        if (result.vocal) {
            await conn.sendMessage(m.chat, {
                audio: { url: result.vocal },
                mimetype: 'audio/mpeg',
                fileName: 'vocal.mp3'
            }, { quoted: m });
        }

        if (result.music) {
            await conn.sendMessage(m.chat, {
                audio: { url: result.music },
                mimetype: 'audio/mpeg',
                fileName: 'music.mp3'
            }, { quoted: m });
        }

        await m.react('✅');

    } catch (error) {
        await m.react('❌');
        return m.reply(`❌ *خطأ:* ${error.message}`);
    }
};

handler.command = ['فصل-صوت', 'vocal-remover', 'فصل'];

export default handler;
