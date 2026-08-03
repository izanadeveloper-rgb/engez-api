// كود بحث وتحميل مانجا صفحات
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import sharp from 'sharp'
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'
const BOT_FOOTER = '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•'

async function searchManga(query) {
    const params = new URLSearchParams()
    params.append('q', query)

    const response = await axios.get(`${API_BASE}/anime/manga-1?${params.toString()}`, {
        timeout: 30000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل البحث')
    return response.data.results || []
}

async function getChapters(slug) {
    const params = new URLSearchParams()
    params.append('action', 'فصول')
    params.append('slug', slug)

    const response = await axios.get(`${API_BASE}/anime/manga-1?${params.toString()}`, {
        timeout: 30000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل جلب الفصول')
    return response.data
}

// نجيب روابط كل صور الفصل مرة واحدة بس (الاستدعاء ده خفيف، مجرد قائمة روابط).
// التحميل الفعلي للصورة (تنزيل + تحويل) بيحصل لصورة واحدة بس عند الطلب في downloadSinglePage.
async function getChapterImageUrls(slug, chapter) {
    const params = new URLSearchParams()
    params.append('action', 'صور')
    params.append('slug', slug)
    params.append('chapter', chapter)

    const response = await axios.get(`${API_BASE}/anime/manga-1?${params.toString()}`, {
        timeout: 60000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل جلب الصور')
    return response.data.images || []
}

async function downloadSinglePage(url, pageNumber) {
    try {
        const origin = new URL(url).origin

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'ar,en;q=0.9',
                'Referer': origin,
                'Connection': 'keep-alive'
            }
        })

        if (response.status !== 200 && response.status !== 206) {
            const bodyPreview = Buffer.isBuffer(response.data)
                ? response.data.toString('utf8', 0, 200)
                : String(response.data).slice(0, 200)
            throw new Error(`HTTP ${response.status} | ${bodyPreview.replace(/\s+/g, ' ').trim()}`)
        }

        const contentType = response.headers['content-type'] || ''
        if (!contentType.startsWith('image/')) {
            const bodyPreview = Buffer.isBuffer(response.data)
                ? response.data.toString('utf8', 0, 200)
                : String(response.data).slice(0, 200)
            throw new Error(`Content-Type: ${contentType || 'غير محدد'} | ${bodyPreview.replace(/\s+/g, ' ').trim()}`)
        }

        const rawBuffer = Buffer.from(response.data)
        const jpgBuffer = await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer()
        return jpgBuffer
    } catch (e) {
        console.error(`[صفحة ${pageNumber}] فشل التحميل: ${e.message}\nURL: ${url}`)
        throw new Error(`فشل تحميل الصفحة ${pageNumber}: ${e.message}`)
    }
}

async function sendMangaPage(m, conn, { slug, chapter, pageNumber }) {
    const images = await getChapterImageUrls(slug, chapter)
    const totalPages = images.length
    if (totalPages === 0) throw new Error('لا توجد صور في هذا الفصل')

    if (pageNumber < 1 || pageNumber > totalPages) {
        throw new Error(`رقم الصفحة غير صحيح (المتاح من 1 إلى ${totalPages})`)
    }

    const jpgBuffer = await downloadSinglePage(images[pageNumber - 1], pageNumber)

    const mediaMessage = await prepareWAMessageMedia({
        image: jpgBuffer
    }, { upload: conn.waUploadToServer })

    const hasNext = pageNumber < totalPages
    const buttons = []
    if (hasNext) {
        buttons.push({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: '➡️ الصفحة التالية',
                id: `.صفحة ${slug} ${chapter} ${pageNumber + 1}`
            })
        })
    }

    const footerText = hasNext
        ? `${BOT_FOOTER}\nالصفحة ${pageNumber}/${totalPages}`
        : `${BOT_FOOTER}\n✅ آخر صفحة في الفصل (${pageNumber}/${totalPages})`

    const interactiveContent = {
        body: proto.Message.InteractiveMessage.Body.fromObject({
            text: `📖 *${slug} - الفصل ${chapter}*\n📄 الصفحة ${pageNumber} من ${totalPages}`
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footerText }),
        header: {
            title: '',
            subtitle: '',
            hasMediaAttachment: true,
            imageMessage: mediaMessage.imageMessage
        },
        nativeFlowMessage: {
            buttons,
            messageParamsJson: ''
        }
    }

    const waMessage = generateWAMessageFromContent(m.chat, {
        viewOnceMessage: { message: { interactiveMessage: interactiveContent } }
    }, {
        userJid: conn.user.jid,
        quoted: m
    })

    await conn.relayMessage(m.chat, waMessage.message, { messageId: waMessage.key.id })
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `${BOT_FOOTER}\n\n` +
            '📚 *مانجا - بحث وقراءة*\n\n' +
            '📌 *الأوامر:*\n' +
            `• ${usedPrefix}مانجا <اسم> - بحث عن مانجا\n` +
            `• ${usedPrefix}فصول <slug> - عرض فصول المانجا\n` +
            `• ${usedPrefix}تحميل-فصل <slug> <رقم الفصل> - بدء قراءة الفصل صفحة بصفحة\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}مانجا bluelock`
        )
    }

    if (command === 'مانجا' || command === 'manga') {
        await m.react('🔍')
        try {
            const results = await searchManga(text)
            if (results.length === 0) throw new Error('لا توجد نتائج')

            const sections = [{
                title: '📚 النتائج',
                rows: results.slice(0, 10).map(item => ({
                    title: item.title.substring(0, 40),
                    description: `📌 ${item.type || 'مانجا'} | ${item.status || 'N/A'}`,
                    id: `${usedPrefix}فصول ${item.slug}`
                }))
            }]

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: proto.Message.InteractiveMessage.Body.fromObject({ text: `🔍 *نتائج البحث عن:* ${text}\n📊 *عدد النتائج:* ${results.length}\n\n👇 اختر المانجا:` }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: BOT_FOOTER }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                                buttons: [{
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '📋 اختر مانجا',
                                        sections
                                    })
                                }]
                            })
                        }
                    }
                }
            }, { userJid: conn.user.jid, quoted: m })

            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${e.message}`)
        }
        return
    }

    if (command === 'فصول' || command === 'chapters') {
        const slug = text.trim()
        await m.react('⏳')
        try {
            const data = await getChapters(slug)
            if (!data.chapters || data.chapters.length === 0) throw new Error('لا توجد فصول')

            const rows = data.chapters.map(ch => ({
                title: `الفصل ${ch.number}`,
                description: `📄 ${ch.title || 'N/A'}`,
                id: `${usedPrefix}تحميل-فصل ${slug} ${ch.number}`
            }))

            const sections = [{
                title: `📖 ${slug} (${data.total || data.chapters.length} فصل)`,
                rows: rows
            }]

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📖 *${slug}*\n📊 *عدد الفصول:* ${data.total || data.chapters.length}\n\n👇 اختر الفصل للقراءة:` }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: BOT_FOOTER }),
                            header: proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                                buttons: [{
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '📋 اختر فصل',
                                        sections
                                    })
                                }]
                            })
                        }
                    }
                }
            }, { userJid: conn.user.jid, quoted: m })

            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${e.message}`)
        }
        return
    }

    if (command === 'تحميل-فصل' || command === 'download-chapter') {
        const parts = text.split(' ')
        if (parts.length < 2) {
            return m.reply('❌ *يرجى إدخال اسم المانجا ورقم الفصل*\nمثال: `.تحميل-فصل blue-lock 1`')
        }
        const slug = parts[0]
        const chapter = parts[1]

        await m.react('⏳')
        try {
            await sendMangaPage(m, conn, { slug, chapter, pageNumber: 1 })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${e.message}`)
        }
        return
    }

    if (command === 'صفحة' || command === 'page') {
        const parts = text.split(' ')
        if (parts.length < 3) {
            return m.reply('❌ *صيغة غير صحيحة*\nمثال: `.صفحة blue-lock 1 2`')
        }
        const slug = parts[0]
        const chapter = parts[1]
        const pageNumber = parseInt(parts[2], 10)

        if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            return m.reply('❌ *رقم الصفحة غير صحيح*')
        }

        await m.react('⏳')
        try {
            await sendMangaPage(m, conn, { slug, chapter, pageNumber })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${e.message}`)
        }
        return
    }
}

handler.command = ['مانجا', 'manga', 'فصول', 'chapters', 'تحميل-فصل', 'download-chapter', 'صفحة', 'page']
handler.help = ['مانجا <بحث>', 'فصول <slug>', 'تحميل-فصل <slug> <رقم>']
handler.tags = ['reading']

export default handler
