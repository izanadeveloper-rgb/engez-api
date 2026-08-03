// كود بحث وتحميل مانجا يرسل بشكل كاروسيل
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

async function getChapterImages(slug, chapter) {
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

async function downloadImage(url, index) {
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
            const reason = `[صورة ${index + 1}] HTTP ${response.status} | ${bodyPreview.replace(/\s+/g, ' ').trim()}`
            console.error(`${reason}\nURL: ${url}`)
            return { buffer: null, error: reason }
        }

        const contentType = response.headers['content-type'] || ''
        if (!contentType.startsWith('image/')) {
            const bodyPreview = Buffer.isBuffer(response.data)
                ? response.data.toString('utf8', 0, 200)
                : String(response.data).slice(0, 200)
            const reason = `[صورة ${index + 1}] Content-Type: ${contentType || 'غير محدد'} | ${bodyPreview.replace(/\s+/g, ' ').trim()}`
            console.error(`${reason}\nURL: ${url}`)
            return { buffer: null, error: reason }
        }

        const rawBuffer = Buffer.from(response.data)

        try {
            const jpgBuffer = await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer()
            return { buffer: jpgBuffer, error: null }
        } catch (convErr) {
            const reason = `[صورة ${index + 1}] فشل تحويل الصورة إلى JPG: ${convErr.message}`
            console.error(reason)
            return { buffer: null, error: reason }
        }
    } catch (e) {
        const status = e.response?.status
        const detail = e.response?.data
            ? (Buffer.isBuffer(e.response.data) ? e.response.data.toString('utf8', 0, 200) : String(e.response.data).slice(0, 200))
            : e.message
        const reason = `[صورة ${index + 1}] استثناء (status: ${status ?? 'N/A'}) | ${detail.replace(/\s+/g, ' ').trim()}`
        console.error(`${reason}\nURL: ${url}`)
        return { buffer: null, error: reason }
    }
}

function withTimeout(promise, ms, timeoutMessage) {
    let timer
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), ms)
    })
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer))
}

async function downloadAllImages(images, onProgress) {
    const BATCH_SIZE = 8
    const results = new Array(images.length)

    for (let start = 0; start < images.length; start += BATCH_SIZE) {
        const batch = images.slice(start, start + BATCH_SIZE)
        const batchResults = await Promise.all(
            batch.map((imgUrl, offset) => downloadImage(imgUrl, start + offset))
        )
        batchResults.forEach((res, offset) => {
            results[start + offset] = res
        })
        const done = Math.min(start + BATCH_SIZE, images.length)
        console.log(`تم معالجة ${done}/${images.length} صورة`)
        if (onProgress) {
            try {
                await onProgress(done, images.length)
            } catch {}
        }
    }

    return results
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `${BOT_FOOTER}\n\n` +
            '📚 *مانجا - بحث وقراءة*\n\n' +
            '📌 *الأوامر:*\n' +
            `• ${usedPrefix}مانجا <اسم> - بحث عن مانجا\n` +
            `• ${usedPrefix}فصول <slug> - عرض فصول المانجا\n` +
            `• ${usedPrefix}تحميل-فصل <slug> <رقم الفصل> - تحميل فصل كصور\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}مانجا bluelock`
        )
    }

    async function createImage(buffer) {
        const _media_ = await prepareWAMessageMedia({
            image: buffer
        }, {
            upload: conn.waUploadToServer
        })
        return _media_.imageMessage
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
                            body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📖 *${slug}*\n📊 *عدد الفصول:* ${data.total || data.chapters.length}\n\n👇 اختر الفصل للتحميل:` }),
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
        await m.reply(`📥 *جـاري تحميـل صفحـات الفصـل ${chapter}...*`)

        try {
            const images = await getChapterImages(slug, chapter)
            if (images.length === 0) throw new Error('لا توجد صور في هذا الفصل')

            let lastReported = 0
            const downloadResults = await withTimeout(
                downloadAllImages(images, async (done, total) => {
                    if (done - lastReported >= 24 || done === total) {
                        lastReported = done
                        await m.reply(`⏳ تم تحميل ${done}/${total} صورة...`).catch(() => {})
                    }
                }),
                180000,
                'انتهت المهلة (3 دقائق) قبل اكتمال تحميل الفصل. جرب فصل أصغر أو حاول مرة أخرى.'
            )

            const errors = []
            let failed = 0
            const validImages = []
            for (let i = 0; i < downloadResults.length; i++) {
                const { buffer, error } = downloadResults[i]
                if (buffer) {
                    validImages.push(buffer)
                } else {
                    failed++
                    if (errors.length < 3) errors.push(error)
                }
            }

            if (validImages.length === 0) {
                const err = new Error(`لم يتم تحميل أي صورة (${failed} صورة فشلت)`)
                err.debugDetails = errors
                throw err
            }

            let cards = []
            let count = 1
            for (const jpgBuffer of validImages) {
                const imageMessage = await createImage(jpgBuffer)
                cards.push({
                    body: proto.Message.InteractiveMessage.Body.fromObject({ text: `📖 *الفصل:* ${chapter}\n📄 *الصفحة:* ${count}/${validImages.length}` }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: BOT_FOOTER }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({ title: `📷 الصفحة ${count}`, hasMediaAttachment: true, imageMessage }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: [] })
                })
                count++
            }

            let bodyText = `📖 *${slug} - الفصل ${chapter}*\n📊 *عدد الصفحات:* ${validImages.length}`
            if (failed > 0) {
                bodyText += `\n⚠️ فشل تحميل ${failed} صورة من أصل ${images.length}`
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
                                text: bodyText
                            }),
                            footer: proto.Message.InteractiveMessage.Footer.create({
                                text: BOT_FOOTER
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
            }, { userJid: conn.user.jid, quoted: m })

            await conn.relayMessage(m.chat, finalMessage.message, { messageId: finalMessage.key.id })
            await m.react('✅')
        } catch (e) {
            await m.react('❌')
            let msg = `❌ *خطأ:* ${e.message}`
            if (e.debugDetails?.length) {
                msg += `\n\n🔍 *تفاصيل الديباج:*\n` + e.debugDetails.map(d => `• ${d}`).join('\n')
            }
            return m.reply(msg)
        }
        return
    }
}

handler.command = ['مانجا', 'manga', 'فصول', 'chapters', 'تحميل-فصل', 'download-chapter']
handler.help = ['مانجا <بحث>', 'فصول <slug>', 'تحميل-فصل <slug> <رقم>']
handler.tags = ['reading']

export default handler
