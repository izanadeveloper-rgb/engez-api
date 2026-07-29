import axios from 'axios'
import crypto from 'crypto'
import https from 'https'
import JSZip from 'jszip'

const API_BASE = 'https://engez.a7a.online/api/v1'

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest()
}

function toB64Url(buffer) {
    return Buffer.from(buffer)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

function isWebP(buffer) {
    return buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
}

function isAnimatedWebP(buffer) {
    if (!isWebP(buffer)) return false

    let offset = 12

    while (offset < buffer.length - 8) {
        const chunk = buffer.toString('ascii', offset, offset + 4)
        const size = buffer.readUInt32LE(offset + 4)

        if (chunk === 'VP8X' && (buffer[offset + 8] & 0x02)) return true
        if (chunk === 'ANIM' || chunk === 'ANMF') return true

        offset += 8 + size + (size % 2)
    }

    return false
}

async function imageToWebp(buffer) {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp first: npm i sharp')

    return await sharpMod.default(buffer)
        .resize(512, 512, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer()
}

async function makeTrayWebp(buffer) {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp first: npm i sharp')

    return await sharpMod.default(buffer)
        .resize(252, 252, { fit: 'cover' })
        .webp()
        .toBuffer()
}

async function makeBlankTrayWebp() {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp first: npm i sharp')

    return await sharpMod.default({
        create: {
            width: 252,
            height: 252,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    }).webp().toBuffer()
}

async function makeThumbnailJpeg(buffer) {
    const sharpMod = await import('sharp').catch(() => null)
    if (!sharpMod?.default) throw new Error('Install sharp first: npm i sharp')

    return await sharpMod.default(buffer)
        .resize(252, 252, { fit: 'cover' })
        .jpeg()
        .toBuffer()
}

async function uploadToServer(conn, buffer, { hkdf, mediaPath, mediaKey = crypto.randomBytes(32) }) {
    const expanded = Buffer.from(
        crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(hkdf), 112),
    )

    const iv = expanded.subarray(0, 16)
    const cipherKey = expanded.subarray(16, 48)
    const macKey = expanded.subarray(48, 80)

    const cipher = crypto.createCipheriv('aes-256-cbc', cipherKey, iv)
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])

    const mac = crypto
        .createHmac('sha256', macKey)
        .update(iv)
        .update(encrypted)
        .digest()
        .subarray(0, 10)

    const encBuffer = Buffer.concat([encrypted, mac])

    const fileSha256 = sha256(buffer)
    const fileEncSha256 = sha256(encBuffer)

    const iq = await conn.query({
        tag: 'iq',
        attrs: {
            id: conn.generateMessageTag?.() ?? Date.now().toString(),
            to: 's.whatsapp.net',
            type: 'set',
            xmlns: 'w:m',
        },
        content: [{ tag: 'media_conn', attrs: {} }],
    })

    const mediaConn = iq.content?.find(v => v.tag === 'media_conn')
    if (!mediaConn) throw new Error('media_conn not found')

    const auth = mediaConn.attrs?.auth
    if (!auth) throw new Error('media auth not found')

    const hosts = (mediaConn.content || [])
        .filter(v => v.tag === 'host')
        .map(v => v.attrs?.hostname)
        .filter(Boolean)

    if (!hosts.length) throw new Error('upload hosts not found')

    const token = encodeURIComponent(
        fileEncSha256.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    )

    let lastError

    for (const host of hosts) {
        try {
            const json = await new Promise((resolve, reject) => {
                const url = new URL(
                    `https://${host}${mediaPath}/${token}?auth=${encodeURIComponent(auth)}&token=${token}`
                )

                const req = https.request(
                    {
                        hostname: url.hostname,
                        port: 443,
                        path: url.pathname + url.search,
                        method: 'POST',
                        headers: {
                            Origin: 'https://web.whatsapp.com',
                            Referer: 'https://web.whatsapp.com/',
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': encBuffer.length,
                        },
                    },
                    (res) => {
                        let body = ''
                        res.on('data', c => body += c)
                        res.on('end', () => {
                            if (res.statusCode < 200 || res.statusCode >= 300) {
                                return reject(new Error(`Upload failed ${res.statusCode}: ${body}`))
                            }
                            try {
                                resolve(JSON.parse(body))
                            } catch {
                                reject(new Error(`Invalid JSON response: ${body}`))
                            }
                        })
                    }
                )

                req.on('error', reject)
                req.write(encBuffer)
                req.end()
            })

            const directPath = json.direct_path ?? json.directPath ?? json.url ?? json.path
            if (!directPath) throw new Error('directPath not found')

            return {
                mediaKey,
                fileLength: buffer.length,
                fileSha256,
                fileEncSha256,
                directPath,
                ...json,
            }
        } catch (e) {
            lastError = e
        }
    }

    throw lastError ?? new Error('All upload hosts failed')
}

async function sendCustomStickerPack(conn, m, pack, meta = {}) {
    const zip = new JSZip()
    const stickersMetadata = []

    for (const item of pack) {
        const fileName = `${toB64Url(sha256(item.buffer))}.${item.ext}`
        zip.file(fileName, item.buffer)

        stickersMetadata.push({
            fileName,
            isAnimated: item.isAnimated,
            emojis: [''],
            accessibilityLabel: '',
            isLottie: item.isLottie,
            mimetype: item.mimetype,
        })
    }

    const trayIconFileName = 'tray_icon.webp'
    const traySource = pack.find(v => !v.isLottie)?.buffer
    const trayBuffer = traySource ? await makeTrayWebp(traySource) : await makeBlankTrayWebp()

    zip.file(trayIconFileName, trayBuffer)

    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })

    const packUpload = await uploadToServer(conn, archive, {
        hkdf: 'WhatsApp Sticker Pack Keys',
        mediaPath: '/mms/sticker-pack',
    })

    const thumbnailBuffer = await makeThumbnailJpeg(trayBuffer)

    const thumbUpload = await uploadToServer(conn, thumbnailBuffer, {
        hkdf: 'WhatsApp Sticker Pack Thumbnail Keys',
        mediaPath: '/mms/thumbnail-sticker-pack',
        mediaKey: packUpload.mediaKey,
    })

    await conn.relayMessage(
        m.chat,
        {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32),
            },
            stickerPackMessage: {
                stickerPackId: 'Pack_' + crypto.randomBytes(8).toString('hex'),
                name: meta.name || 'Sticker Pack',
                publisher: meta.publisher || 'bot',
                packDescription: meta.description || 'Sticker pack created automatically',
                stickers: stickersMetadata,
                fileLength: packUpload.fileLength,
                fileSha256: packUpload.fileSha256,
                fileEncSha256: packUpload.fileEncSha256,
                mediaKey: packUpload.mediaKey,
                directPath: packUpload.directPath,
                mediaKeyTimestamp: Math.floor(Date.now() / 1000),
                stickerPackSize: packUpload.fileLength,
                stickerPackOrigin: 2,
                trayIconFileName,
                thumbnailDirectPath: thumbUpload.directPath,
                thumbnailSha256: thumbUpload.fileSha256,
                thumbnailEncSha256: thumbUpload.fileEncSha256,
                thumbnailHeight: 252,
                thumbnailWidth: 252,
                imageDataHash: thumbUpload.fileSha256.toString('base64'),
            },
        },
        { quoted: m }
    )
}

// ============= البحث عن صور باستخدام API الجديد =============

async function searchPins(query) {
    try {
        const params = new URLSearchParams({ q: query })
        const response = await axios.get(`${API_BASE}/search/pinimg?${params.toString()}`, {
            timeout: 30000
        })
        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل البحث')
        }
        return response.data.results || []
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

// ============= الهاندلر =============

const handler = async (m, { conn, text, command }) => {
    if (!text) {
        return m.reply(
            '📦 *حزمة ملصقات من Pinterest*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.حزمة قطط`\n' +
            '• `.باك غوجو`\n\n' +
            '📌 *مثال:*\n' +
            '`.حزمة انمي`'
        )
    }

    await conn.sendMessage(m.chat, { react: { text: '📦', key: m.key } })

    try {
        // البحث عن الصور
        const results = await searchPins(text)

        if (!results.length) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            return m.reply(`❌ ما لقيت نتائج لـ *${text}*`)
        }

        // استخراج روابط الصور
        const urls = [...new Set(
            results
                .map(v => v.image)
                .filter(Boolean)
        )]

        if (urls.length < 5) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            return m.reply('❌ النتائج قليلة جداً، جرب كلمة بحث أخرى')
        }

        // اختيار 30 صورة عشوائية
        const chosen = urls
            .sort(() => Math.random() - 0.5)
            .slice(0, 30)

        const pack = []

        for (const url of chosen) {
            try {
                const imgRes = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                })

                let buffer = Buffer.from(imgRes.data)

                if (isWebP(buffer)) {
                    if (buffer.length > 0) {
                        pack.push({
                            buffer,
                            ext: 'webp',
                            mimetype: 'image/webp',
                            isAnimated: isAnimatedWebP(buffer),
                            isLottie: false,
                        })
                    }
                } else {
                    buffer = await imageToWebp(buffer)

                    pack.push({
                        buffer,
                        ext: 'webp',
                        mimetype: 'image/webp',
                        isAnimated: false,
                        isLottie: false,
                    })
                }
            } catch (e) {
                console.error('Image download/convert failed:', e?.message || e)
            }
        }

        if (pack.length < 5) {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            return m.reply('❌ ما قدرت أجمع صور كفاية للحزمة')
        }

        await sendCustomStickerPack(conn, m, pack, {
            name: `${text.toUpperCase()} STICKERS`,
            publisher: 'izana',
            description: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•'
        })

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (error) {
        console.error(error)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return m.reply(`⚠️ حدث خطأ: ${error.message}`)
    }
}

handler.help = ['حزمة <بحث>']
handler.tags = ['sticker']
handler.command = /^(حزمة|pak|pack|باك|بك)$/i

export default handler
