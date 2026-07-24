// كود عدسة بينتريست 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'
const DEC = '*※⋅ ━━ ╼╃⊰🍷⊱╄╾ ━━ ⋅※*'
const BOT = '❄️ 𝑹𝑨𝑮𝑵𝑨 𝑩𝑶𝑻 ❄️'

// رفع الملف إلى Uguu
async function uploadToUguu(buffer, ext) {
    const form = new FormData()
    form.append('files[]', buffer, `file.${ext}`)

    try {
        const response = await axios.post('https://uguu.se/upload.php', form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000
        })

        if (!response.data?.files?.[0]?.url) {
            throw new Error('فشل في رفع الملف')
        }

        return response.data.files[0].url
    } catch (error) {
        throw new Error(`فشل رفع الملف: ${error.message}`)
    }
}

// دالة البحث في Pinterest Lens
async function searchPinterestLens(imageUrl) {
    try {
        const params = new URLSearchParams()
        params.append('imageUrl', imageUrl)

        const response = await axios.get(`${API_BASE}/tools/pinlens?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل البحث')
        }

        return response.data.results || []
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

// دالة تنسيق الأرقام
function formatNumber(num) {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}

const handler = async (m, { conn }) => {
    // التحقق من وجود صورة
    const q = m.quoted
    if (!q || !q.mimetype || !q.mimetype.startsWith('image/')) {
        return m.reply(`${DEC}\n${BOT}\n${DEC}\n❌ يرجى الرد على *صورة* للبحث عن مشابهاتها.`)
    }

    await m.react('⏳')

    try {
        // تحميل الصورة
        const buffer = await q.download()
        if (!buffer || buffer.length === 0) {
            throw new Error('فشل تحميل الصورة')
        }

        await m.react('📤')

        // استخراج نوع الملف
        const fileInfo = await fileTypeFromBuffer(buffer)
        const ext = fileInfo?.ext || 'jpg'

        // رفع الصورة إلى Uguu
        const imageUrl = await uploadToUguu(buffer, ext)
        if (!imageUrl) {
            throw new Error('فشل رفع الصورة')
        }

        await m.react('🔍')

        // البحث في Pinterest
        const results = await searchPinterestLens(imageUrl)

        if (!results || results.length === 0) {
            await m.react('❌')
            return m.reply(`${DEC}\n${BOT}\n${DEC}\n❌ لم يتم العثور على نتائج مشابهة.`)
        }

        // بناء الكاروسيل
        async function createImageMessage(url) {
            try {
                const media = await prepareWAMessageMedia(
                    { image: { url } },
                    { upload: conn.waUploadToServer }
                )
                return media.imageMessage
            } catch (e) {
                return null
            }
        }

        let cards = []
        const displayResults = results.slice(0, 10)

        for (let i = 0; i < displayResults.length; i++) {
            const item = displayResults[i]
            const image = item.image
            if (!image) continue

            const pinnerName = item.pinner?.full_name || item.pinner?.username || 'غير معروف'
            const boardName = item.board?.name || 'غير معروفة'
            const title = item.title || 'بدون عنوان'
            const description = item.description?.trim() || ''
            const createdAt = item.createdAt || 'غير متوفر'
            const saves = item.stats?.saves || 0
            const comments = item.stats?.comments || 0
            const likes = item.stats?.likes || 0

            const caption = `${DEC}
${BOT}
${DEC}
📌 *النتيجة ${i + 1}*
${title !== 'بدون عنوان' ? `📝 *العنوان:* ${title}\n` : ''}👤 *المستخدم:* ${pinnerName}
📂 *اللوحة:* ${boardName}
💾 *الحفظات:* ${formatNumber(saves)}
❤️ *الإعجابات:* ${formatNumber(likes)}
💬 *التعليقات:* ${formatNumber(comments)}
🕒 *التاريخ:* ${createdAt}
${description ? `📄 *الوصف:* ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}` : ''}
${DEC}`.trim()

            const pinLink = item.url || `https://www.pinterest.com/pin/${item.id}/`

            try {
                const imageMessage = await createImageMessage(image)
                if (!imageMessage) continue

                cards.push({
                    body: proto.Message.InteractiveMessage.Body.fromObject({ text: caption }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                        title: '',
                        hasMediaAttachment: true,
                        imageMessage
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [{
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: '📌 افتح في Pinterest',
                                url: pinLink
                            })
                        }]
                    })
                })
            } catch (cardErr) {
                console.error('❌ فشل بناء كارد:', cardErr.message)
            }
        }

        if (cards.length === 0) {
            await m.react('❌')
            return m.reply(`${DEC}\n${BOT}\n${DEC}\n❌ فشل بناء نتائج البحث.`)
        }

        const finalMessage = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        header: proto.Message.InteractiveMessage.Header.create({
                            hasMediaAttachment: false
                        }),
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `${DEC}\n${BOT}\n${DEC}\n📸 *أفضل ${cards.length} نتيجة من Pinterest Lens*`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: BOT
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                            cards
                        })
                    })
                }
            }
        }, { quoted: m })

        await m.react('✅')
        await conn.relayMessage(m.chat, finalMessage.message, { messageId: finalMessage.key.id })

    } catch (err) {
        console.error('❌ خطأ:', err)
        await m.react('❌')
        await m.reply(`${DEC}\n${BOT}\n${DEC}\n❌ ${err.message || 'حدث خطأ، حاول مجدداً.'}`)
    }
}

handler.help = ['بينتر-بحث', 'عدسة']
handler.tags = ['search']
handler.command = /^(lens|عدسة|عدسه)$/i

export default handler
