// tts elevenlab 165 صوت
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

// قائمة الأصوات الكاملة (1-165)
const VOICES = [
    { id: 1, name: 'Majed', name_ar: 'ماجد', gender: 'male' },
    { id: 2, name: 'Ghalia', name_ar: 'غالية', gender: 'female' },
    { id: 3, name: 'Aisha', name_ar: 'عائشة', gender: 'female' },
    { id: 4, name: 'Khalifa', name_ar: 'خليفة', gender: 'male' },
    { id: 5, name: 'fahad', name_ar: 'فهد', gender: 'male' },
    { id: 6, name: 'Hassan', name_ar: 'حسن', gender: 'male' },
    { id: 7, name: 'Rakan', name_ar: 'راكان', gender: 'male' },
    { id: 8, name: 'Hessa', name_ar: 'حصة', gender: 'female' },
    { id: 9, name: 'lama', name_ar: 'لمى', gender: 'female' },
    { id: 10, name: 'James', name_ar: 'جيمس', gender: 'male' },
    { id: 11, name: 'Mansour', name_ar: 'منصور', gender: 'male' },
    { id: 12, name: 'Jake', name_ar: 'جيك', gender: 'male' },
    { id: 13, name: 'Asma', name_ar: 'أسماء', gender: 'female' },
    { id: 14, name: 'Abdulaziz', name_ar: 'عبدالعزيز', gender: 'male' },
    { id: 15, name: 'Mattar', name_ar: 'مطر', gender: 'male' },
    { id: 16, name: 'Jad', name_ar: 'جاد', gender: 'male' },
    { id: 17, name: 'Tariq', name_ar: 'طارق', gender: 'male' },
    { id: 18, name: 'Hanan', name_ar: 'حنان', gender: 'female' },
    { id: 19, name: 'Moataz', name_ar: 'معتز', gender: 'male' },
    { id: 20, name: 'Alaa', name_ar: 'علاء', gender: 'male' },
    { id: 21, name: 'Turki', name_ar: 'تركي', gender: 'male' },
    { id: 22, name: 'Hamdan', name_ar: 'حمدان', gender: 'male' },
    { id: 23, name: 'Imad', name_ar: 'عماد', gender: 'male' },
    { id: 24, name: 'Fatima', name_ar: 'فاطمة', gender: 'female' },
    { id: 25, name: 'Mishari', name_ar: 'مشاري', gender: 'male' },
    { id: 26, name: 'Ruba', name_ar: 'ربى', gender: 'female' },
    { id: 27, name: 'Latifa', name_ar: 'لطيفة', gender: 'female' },
    { id: 28, name: 'Maha', name_ar: 'مها', gender: 'female' },
    { id: 29, name: 'Majid', name_ar: 'ماجد', gender: 'male' },
    { id: 30, name: 'Huda', name_ar: 'هدى', gender: 'female' },
    { id: 31, name: 'Turki', name_ar: 'تركي', gender: 'male' },
    { id: 32, name: 'Faisal', name_ar: 'فيصل', gender: 'male' },
    { id: 33, name: 'May', name_ar: 'مي', gender: 'female' },
    { id: 34, name: 'Salim', name_ar: 'سالم', gender: 'male' },
    { id: 35, name: 'Bushra', name_ar: 'بشرى', gender: 'female' },
    { id: 36, name: 'Alya', name_ar: 'عالية', gender: 'female' },
    { id: 37, name: 'Sultan', name_ar: 'سلطان', gender: 'male' },
    { id: 38, name: 'Dhahi', name_ar: 'ضاحي', gender: 'male' },
    { id: 39, name: 'Zahra', name_ar: 'زهراء', gender: 'female' },
    { id: 40, name: 'Mayssa', name_ar: 'ميساء', gender: 'female' },
    { id: 41, name: 'Faisal', name_ar: 'فيصل', gender: 'male' },
    { id: 42, name: 'Fares', name_ar: 'فارس', gender: 'male' },
    { id: 43, name: 'Ghanim', name_ar: 'غانم', gender: 'male' },
    { id: 44, name: 'Saher', name_ar: 'ساهر', gender: 'male' },
    { id: 45, name: 'Arwa', name_ar: 'أروى', gender: 'female' },
    { id: 46, name: 'Hala', name_ar: 'هالة', gender: 'female' },
    { id: 47, name: 'Ahmad', name_ar: 'أحمد', gender: 'male' },
    { id: 48, name: 'Aisha', name_ar: 'عائشة', gender: 'female' },
    { id: 49, name: 'Yousef', name_ar: 'يوسف', gender: 'male' },
    { id: 50, name: 'Aldana', name_ar: 'ألدانا', gender: 'female' },
    { id: 51, name: 'Dana', name_ar: 'دانا', gender: 'female' },
    { id: 52, name: 'Noura', name_ar: 'نورة', gender: 'female' },
    { id: 53, name: 'Lina', name_ar: 'لينا', gender: 'female' },
    { id: 54, name: 'Mishal', name_ar: 'مشعل', gender: 'male' },
    { id: 55, name: 'Latifa', name_ar: 'لطيفة', gender: 'female' },
    { id: 56, name: 'Rawdha', name_ar: 'روضة', gender: 'female' },
    { id: 57, name: 'Samir', name_ar: 'سمير', gender: 'male' },
    { id: 58, name: 'Salim', name_ar: 'سالم', gender: 'male' },
    { id: 59, name: 'Tamim', name_ar: 'تميم', gender: 'female' },
    { id: 60, name: 'Reem', name_ar: 'ريم', gender: 'female' },
    { id: 61, name: 'Nayef', name_ar: 'نايف', gender: 'male' },
    { id: 62, name: 'Bayan', name_ar: 'بيان', gender: 'female' },
    { id: 63, name: 'Nasser', name_ar: 'ناصر', gender: 'male' },
    { id: 64, name: 'Adel', name_ar: 'عادل', gender: 'male' },
    { id: 65, name: 'Fadi', name_ar: 'فادي', gender: 'male' },
    { id: 66, name: 'Bader', name_ar: 'بدر', gender: 'male' },
    { id: 67, name: 'Liam', name_ar: 'ليام', gender: 'male' },
    { id: 68, name: 'omar', name_ar: 'عمر', gender: 'male' },
    { id: 69, name: 'khalid', name_ar: 'خالد', gender: 'male' },
    { id: 70, name: 'fatima', name_ar: 'فاطمة', gender: 'female' },
    { id: 71, name: 'Sheikha', name_ar: 'شيخة', gender: 'female' },
    { id: 72, name: 'Talal', name_ar: 'طلال', gender: 'male' },
    { id: 73, name: 'Abdulla', name_ar: 'عبدالله', gender: 'male' },
    { id: 74, name: 'Suhail', name_ar: 'سهيل', gender: 'male' },
    { id: 75, name: 'Ahmed', name_ar: 'أحمد', gender: 'male' },
    { id: 76, name: 'Amna', name_ar: 'آمنة', gender: 'female' },
    { id: 77, name: 'Dalal', name_ar: 'دلال', gender: 'female' },
    { id: 78, name: 'Badr', name_ar: 'بدر', gender: 'male' },
    { id: 79, name: 'Bakheta', name_ar: 'بختة', gender: 'female' },
    { id: 80, name: 'Rema', name_ar: 'ريما', gender: 'female' },
    { id: 81, name: 'Dhabia', name_ar: 'ظبية', gender: 'female' },
    { id: 82, name: 'Salma', name_ar: 'سلمى', gender: 'female' },
    { id: 83, name: 'Mubarak', name_ar: 'مبارك', gender: 'male' },
    { id: 84, name: 'Nawal', name_ar: 'نوال', gender: 'female' },
    { id: 85, name: 'Wadeema', name_ar: 'وديمة', gender: 'female' },
    { id: 86, name: 'Wafa', name_ar: 'وفاء', gender: 'female' },
    { id: 87, name: 'Yousef', name_ar: 'يوسف', gender: 'male' },
    { id: 88, name: 'Rashid', name_ar: 'راشد', gender: 'male' },
    { id: 89, name: 'Manal', name_ar: 'منال', gender: 'female' },
    { id: 90, name: 'Nasser', name_ar: 'ناصر', gender: 'male' },
    { id: 91, name: 'Khalid', name_ar: 'خالد', gender: 'male' },
    { id: 92, name: 'Juma', name_ar: 'جمعة', gender: 'male' },
    { id: 93, name: 'Jassim', name_ar: 'جاسم', gender: 'male' },
    { id: 94, name: 'Buthaina', name_ar: 'بثينة', gender: 'female' },
    { id: 95, name: 'Nawaf', name_ar: 'نواف', gender: 'male' },
    { id: 96, name: 'Hazim', name_ar: 'حازم', gender: 'male' },
    { id: 97, name: 'Sara', name_ar: 'سارة', gender: 'female' },
    { id: 98, name: 'Waleed', name_ar: 'وليد', gender: 'male' },
    { id: 99, name: 'Rayyan', name_ar: 'ريان', gender: 'male' },
    { id: 100, name: 'Afra', name_ar: 'عفراء', gender: 'female' },
    { id: 101, name: 'Mansour', name_ar: 'منصور', gender: 'male' },
    { id: 102, name: 'Ali', name_ar: 'علي', gender: 'male' },
    { id: 103, name: 'Maitha', name_ar: 'ميثاء', gender: 'female' },
    { id: 104, name: 'Butti', name_ar: 'بطي', gender: 'male' },
    { id: 105, name: 'Zakiya', name_ar: 'ذكية', gender: 'female' },
    { id: 106, name: 'Shamma', name_ar: 'شمّا', gender: 'female' },
    { id: 107, name: 'Salama', name_ar: 'سلامة', gender: 'female' },
    { id: 108, name: 'Zayed', name_ar: 'زايد', gender: 'male' },
    { id: 109, name: 'Thuraya', name_ar: 'ثريا', gender: 'female' },
    { id: 110, name: 'Najla', name_ar: 'نجلاء', gender: 'female' },
    { id: 111, name: 'Fahad', name_ar: 'فهد', gender: 'male' },
    { id: 112, name: 'Ghada', name_ar: 'غادة', gender: 'female' },
    { id: 113, name: 'Layla', name_ar: 'ليلى', gender: 'female' },
    { id: 114, name: 'Reem', name_ar: 'ريم', gender: 'female' },
    { id: 115, name: 'Haitham', name_ar: 'هيثم', gender: 'male' },
    { id: 116, name: 'Hamad', name_ar: 'حمد', gender: 'male' },
    { id: 117, name: 'Adel', name_ar: 'عادل', gender: 'male' },
    { id: 118, name: 'Falah', name_ar: 'فلاح', gender: 'male' },
    { id: 119, name: 'Mohammed', name_ar: 'محمد', gender: 'male' },
    { id: 120, name: 'Saif', name_ar: 'سيف', gender: 'male' },
    { id: 121, name: 'Salem', name_ar: 'سالم', gender: 'male' },
    { id: 122, name: 'Abdulrahman', name_ar: 'عبدالرحمن', gender: 'male' },
    { id: 123, name: 'Hend', name_ar: 'هند', gender: 'female' },
    { id: 124, name: 'Humaid', name_ar: 'حميد', gender: 'male' },
    { id: 125, name: 'Hussain', name_ar: 'حسين', gender: 'male' },
    { id: 126, name: 'Jameela', name_ar: 'جميلة', gender: 'female' },
    { id: 127, name: 'Khadija', name_ar: 'خديجة', gender: 'female' },
    { id: 128, name: 'Mana', name_ar: 'مانا', gender: 'male' },
    { id: 129, name: 'Mariam', name_ar: 'مريم', gender: 'female' },
    { id: 130, name: 'Meera', name_ar: 'ميرا', gender: 'female' },
    { id: 131, name: 'Mohsen', name_ar: 'محسن', gender: 'male' },
    { id: 132, name: 'Moza', name_ar: 'موزة', gender: 'female' },
    { id: 133, name: 'Muna', name_ar: 'منى', gender: 'female' },
    { id: 134, name: 'Nada', name_ar: 'ندى', gender: 'female' },
    { id: 135, name: 'Nayef', name_ar: 'نايف', gender: 'male' },
    { id: 136, name: 'Noor', name_ar: 'نور', gender: 'female' },
    { id: 137, name: 'Nujoom', name_ar: 'نجوم', gender: 'female' },
    { id: 138, name: 'Obaid', name_ar: 'عبيد', gender: 'male' },
    { id: 139, name: 'Sultan', name_ar: 'سلطان', gender: 'male' },
    { id: 140, name: 'Omar', name_ar: 'عمر', gender: 'male' },
    { id: 141, name: 'Saeed', name_ar: 'سعيد', gender: 'male' },
    { id: 142, name: 'Shaima', name_ar: 'شيماء', gender: 'female' },
    { id: 143, name: 'Hamdan', name_ar: 'حمدان', gender: 'male' },
    { id: 144, name: 'Naina', name_ar: 'نينى', gender: 'female' },
    { id: 145, name: 'Maya', name_ar: 'مايا', gender: 'female' },
    { id: 146, name: 'Abdullah', name_ar: 'عبدالله', gender: 'male' },
    { id: 147, name: 'Mark', name_ar: 'مارك', gender: 'male' },
    { id: 148, name: 'Kevin', name_ar: 'كيفن', gender: 'male' },
    { id: 149, name: 'Mark', name_ar: 'مارك', gender: 'male' },
    { id: 150, name: 'aisha', name_ar: 'عائشة', gender: 'female' },
    { id: 151, name: 'hammad', name_ar: 'حمّاد', gender: 'male' },
    { id: 152, name: 'Eric', name_ar: 'اريك', gender: 'male' },
    { id: 153, name: 'Priya', name_ar: 'بريا', gender: 'female' },
    { id: 154, name: 'Rahul', name_ar: 'راهول', gender: 'male' },
    { id: 155, name: 'Sarah', name_ar: 'سارة', gender: 'female' },
    { id: 156, name: 'Dana', name_ar: 'دانا', gender: 'female' },
    { id: 157, name: 'Dana', name_ar: 'دانا', gender: 'female' },
    { id: 158, name: 'Alex', name_ar: 'أليكس', gender: 'male' },
    { id: 159, name: 'David', name_ar: 'ديفيد', gender: 'male' },
    { id: 160, name: 'saif', name_ar: 'سيف', gender: 'male' },
    { id: 161, name: 'Amira', name_ar: 'أميرة', gender: 'female' },
    { id: 162, name: 'hassan', name_ar: 'حسن', gender: 'male' },
    { id: 163, name: 'noura', name_ar: 'نورة', gender: 'female' },
    { id: 164, name: 'yousef', name_ar: 'يوسف', gender: 'male' },
    { id: 165, name: 'Arabic Poet', name_ar: 'الشاعر العربي', gender: 'male' }
]

// دالة توليد الصوت
async function generateVoice(text, voiceId) {
    try {
        const params = new URLSearchParams()
        params.append('text', text)
        params.append('voice', voiceId)

        const response = await axios.get(`${API_BASE}/tools/elevenlab?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل توليد الصوت')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

// دالة إرسال قائمة الأصوات
async function sendVoiceList(conn, chat, quoted, usedPrefix) {
    const sections = [{
        title: '🇸🇦 أصوات عربية (ذكر)',
        rows: VOICES.filter(v => v.gender === 'male' && v.name_ar).slice(0, 30).map(v => ({
            title: v.name_ar,
            description: `🎙️ ${v.name} | ID: ${v.id}`,
            id: `${usedPrefix}تحدث ${v.id}`
        }))
    }, {
        title: '🇸🇦 أصوات عربية (أنثى)',
        rows: VOICES.filter(v => v.gender === 'female' && v.name_ar).slice(0, 30).map(v => ({
            title: v.name_ar,
            description: `🎙️ ${v.name} | ID: ${v.id}`,
            id: `${usedPrefix}تحدث ${v.id}`
        }))
    }, {
        title: '🌍 أصوات أخرى',
        rows: VOICES.filter(v => !v.name_ar || v.gender === 'male').slice(60, 90).map(v => ({
            title: v.name || v.name_ar || 'غير معروف',
            description: `🎙️ ${v.gender === 'male' ? 'ذكر' : 'أنثى'} | ID: ${v.id}`,
            id: `${usedPrefix}تحدث ${v.id}`
        }))
    }]

    const msg = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: '🗣️ *اختر الصوت المناسب*\n\nاختر صوتاً لتوليد النص الصوتي:' },
                    footer: { text: '🎙️ ElevenLabs TTS' },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: '🎙️ اختر صوت',
                                sections
                            })
                        }]
                    }
                }
            }
        }
    }, { userJid: conn.user.jid, quoted })

    await conn.relayMessage(chat, msg.message, { messageId: msg.key.id })
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    // أمر عرض القائمة
    if (command === 'تحدث' && !text) {
        await sendVoiceList(conn, m.chat, m, usedPrefix)
        return
    }

    // أمر مساعد
    if (command === 'صوت-مساعدة') {
        return m.reply(
            '🗣️ *ElevenLabs TTS - الأوامر*\n\n' +
            '📌 *الاستخدام:*\n' +
            `• ${usedPrefix}تحدث - عرض قائمة الأصوات\n` +
            `• ${usedPrefix}تحدث 15 السلام عليكم - توليد صوت بالصوت رقم 15\n` +
            `• ${usedPrefix}ماجد مرحبا - توليد صوت باسم ماجد\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}تحدث 15 السلام عليكم\n` +
            `${usedPrefix}ماجد كيف حالك؟`
        )
    }

    // التحقق من وجود نص
    if (!text) {
        return m.reply(
            '❌ *يرجى إدخال النص*\n\n' +
            '📌 *الاستخدام:*\n' +
            `• ${usedPrefix}تحدث <رقم الصوت> <النص>\n` +
            `• ${usedPrefix}ماجد <النص>\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}تحدث 15 السلام عليكم\n` +
            `${usedPrefix}ماجد كيف حالك؟`
        )
    }

    await m.react('⏳')

    try {
        let voiceId = null
        let textToSpeak = text

        // محاولة استخراج رقم الصوت من بداية النص
        const match = text.match(/^(\d+)\s+(.+)/)
        if (match) {
            voiceId = match[1]
            textToSpeak = match[2]
        } else {
            // محاولة البحث عن الصوت بالاسم
            const voice = VOICES.find(v => v.name_ar === command || v.name.toLowerCase() === command.toLowerCase())
            if (voice) {
                voiceId = voice.id
            } else {
                // إذا لم يتم العثور على الصوت، استخدم الصوت الافتراضي (1)
                voiceId = 1
            }
        }

        // التحقق من صحة رقم الصوت
        if (!VOICES.some(v => v.id === parseInt(voiceId))) {
            throw new Error(`الصوت رقم ${voiceId} غير موجود`)
        }

        const result = await generateVoice(textToSpeak, voiceId)

        if (result?.url) {
            const voiceName = VOICES.find(v => v.id === parseInt(voiceId))?.name_ar || voiceId
            await conn.sendMessage(m.chat, {
                audio: { url: result.url },
                mimetype: 'audio/mpeg',
                fileName: `voice_${voiceName}_${Date.now()}.mp3`,
                caption: `🎙️ *تم توليد الصوت*\n🗣️ الصوت: ${voiceName}\n📝 النص: ${textToSpeak}`
            }, { quoted: m })

            await m.react('✅')
        } else {
            throw new Error('لم يتم العثور على رابط الصوت')
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['تحدث', 'صوت-مساعدة']
handler.help = ['تحدث <رقم/اسم> <نص>', 'صوت-مساعدة']
handler.tags = ['tts', 'ai']

export default handler
