// كود بحث وتحميل مانجا من مانجا ميلو
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'
import sharp from 'sharp'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function searchManga(query) {
    const params = new URLSearchParams()
    params.append('action', 'بحث')
    params.append('q', query)

    const response = await axios.get(`${API_BASE}/anime/manga?${params.toString()}`, {
        timeout: 30000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل البحث')
    return response.data.results || []
}

async function getChapters(mangaId) {
    const params = new URLSearchParams()
    params.append('action', 'فصول')
    params.append('mangaId', mangaId)

    const response = await axios.get(`${API_BASE}/anime/manga?${params.toString()}`, {
        timeout: 30000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل جلب الفصول')
    return response.data
}

async function getChapterImages(mangaId, chapterId) {
    const params = new URLSearchParams()
    params.append('action', 'صور')
    params.append('mangaId', mangaId)
    params.append('chapterId', chapterId)

    const response = await axios.get(`${API_BASE}/anime/manga?${params.toString()}`, {
        timeout: 60000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل جلب الصور')
    return response.data.images || []
}

async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'ar,en;q=0.9',
                'Referer': 'https://mangamello.com/',
                'Connection': 'keep-alive'
            }
        })
        return Buffer.from(response.data)
    } catch (e) {
        console.error(`فشل تحميل الصورة: ${e.message}`)
        return null
    }
}

async function convertToJpg(buffer) {
    try {
        return await sharp(buffer)
            .jpeg({ quality: 90 })
            .toBuffer()
    } catch (e) {
        return buffer
    }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•\n\n' +
            '📚 *مانجا - بحث وقراءة*\n\n' +
            '📌 *الأوامر:*\n' +
            `• ${usedPrefix}مانجا <اسم> - بحث عن مانجا\n` +
            `• ${usedPrefix}فصول <id> - عرض فصول المانجا\n` +
            `• ${usedPrefix}تحميل-فصل <mangaId> <chapterId> - تحميل فصل كـ صور\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}مانجا engineer`
        )
    }

    async function createImage(buffer) {
        const _media_ = await prepareWAMessageMedia({
            image: buffer
        }, {
            upload: conn.waUploadToServer
        });
        return _media_.imageMessage;
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
                    description: item.summary?.slice(0, 60) || '...',
                    id: `${usedPrefix}فصول ${item.id}`
                }))
            }]

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: proto.Message.InteractiveMessage.Body.fromObject({ text: `🔍 *نتائج البحث عن:* ${text}\n📊 *عدد النتائج:* ${results.length}\n\n👇 اختر المانجا:` }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•' }),
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
            }, {})

            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${e.message}`)
        }
        return
    }

    if (command === 'فصول' || command === 'chapters') {
        const mangaId = text.trim()
        await m.react('⏳')
        try {
            const data = await getChapters(mangaId)
            if (!data.chapters || data.chapters.length === 0) throw new Error('لا توجد فصول')

            const rows = data.chapters.map(ch => ({
                title: `الفصل ${ch.title}`,
                description: `📄 ${ch.order || 'N/A'}`,
                id: `${usedPrefix}تحميل-فصل ${mangaId} ${ch.id}`
            }))

            const sections = [{
                title: `📖 ${data.title || 'مانجا'} (${data.total || data.chapters.length} فصل)`,
                rows: rows
            }]

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📖 *${data.title || 'مانجا'}*\n📊 *عدد الفصول:* ${data.total || data.chapters.length}\n\n👇 اختر الفصل:` }),
                            footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•' }),
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
            }, {})

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
            return m.reply('❌ *يرجى إدخال معرف المانجا ورقم الفصل*\nمثال: `.تحميل-فصل 420 677116`')
        }
        const mangaId = parts[0]
        const chapterId = parts[1]

        await m.react('⏳')
        await m.reply('📥 *جـاري تحميـل صفحـات الفصـل...*')

        try {
            const images = await getChapterImages(mangaId, chapterId)
            if (images.length === 0) throw new Error('لا توجد صور في هذا الفصل')

            let cards = []
            let count = 1

            for (const imgUrl of images) {
                const imgBuffer = await downloadImage(imgUrl)
                if (!imgBuffer) continue

                const jpgBuffer = await convertToJpg(imgBuffer)

                cards.push({
                    body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📖 *الفصل:* ${chapterId}\n📄 *الصفحة:* ${count}/${images.length}` }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•' }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({ title: `📷 الصفحة ${count}`, hasMediaAttachment: true, imageMessage: await createImage(jpgBuffer) }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] })
                })
                count++
            }

            if (cards.length === 0) throw new Error('فشل تحميل الصور')

            const finalMessage = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            body: proto.Message.InteractiveMessage.Body.create({
                                text: `📖 *الفصل ${chapterId}*\n📊 *عدد الصفحات:* ${images.length}`
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•'
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
            }, {})

            await conn.relayMessage(m.chat, finalMessage.message, { messageId: finalMessage.key.id })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${e.message}`)
        }
        return
    }
}

handler.command = ['مانجا', 'manga', 'فصول', 'chapters', 'تحميل-فصل', 'download-chapter']
handler.help = ['مانجا <بحث>', 'فصول <id>', 'تحميل-فصل <id> <رقم>']
handler.tags = ['reading']

export default handler
