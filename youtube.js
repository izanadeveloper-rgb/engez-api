// كود تحميل يوتيوب
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import axios from 'axios'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { spawn } from 'child_process'
import { pipeline } from 'stream/promises'

const NEW_API_BASE = 'https://engez.a7a.online/api/v1/download/ytdl'
const OLD_API_BASE = 'https://engez.a7a.online/api/v1/download/youtube'
const SELECT_SEPARATOR = '|'

const DOWNLOAD_TIMEOUT_MS = 120 * 1000
const TITLE_TIMEOUT_MS = 8 * 1000

const VIDEO_QUALITIES = ['144', '240', '360', '480', '720', '1080', '1440', '2160']
const AUDIO_QUALITIES = ['128', '320']

function addProtocol(url) {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function extractTargetUrl(input) {
  try {
    const normalized = addProtocol(input)
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./i, '').replace(/^m\./i, '')

    if (host === 'engez.a7a.online' && (parsed.pathname.includes('/api/v1/download/youtube') || parsed.pathname.includes('/api/v1/download/ytdl'))) {
      const innerUrl = parsed.searchParams.get('url')
      if (innerUrl) return decodeURIComponent(innerUrl)
    }
  } catch {}

  return input
}

function isYouTubeUrl(input) {
  try {
    const normalized = addProtocol(input)
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./i, '').replace(/^m\./i, '')

    return (
      host === 'youtu.be' ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com')
    )
  } catch {
    return false
  }
}

function buildNewApiUrl(url, type, quality) {
  const params = new URLSearchParams({ url })
  if (type) params.set('type', type)
  if (quality) params.set('quality', quality)
  return `${NEW_API_BASE}?${params.toString()}`
}

function buildOldApiUrl(url, type, quality) {
  const params = new URLSearchParams({ url })
  if (type) params.set('type', type)
  if (quality) params.set('quality', quality)
  return `${OLD_API_BASE}?${params.toString()}`
}

async function fetchTitleSafely(url) {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const { data } = await axios.get(oembedUrl, { timeout: TITLE_TIMEOUT_MS })
    return data?.title || null
  } catch (e) {
    console.error('fetchTitleSafely error:', e?.message || e)
    return null
  }
}

// New API: type is 'video' | 'audio'. Returns response.* on success.
async function fetchFromNewApi(url, type, quality) {
  const { data } = await axios.get(buildNewApiUrl(url, type, quality), {
    timeout: DOWNLOAD_TIMEOUT_MS
  })

  if (!data || data.success !== true || !data.response) {
    throw new Error(data?.error || 'تعذر تحميل هذا الاختيار من المصدر الرئيسي')
  }

  const r = data.response
  return {
    title: r.title || null,
    thumbnail: r.thumbnail || null,
    download_url: r.download_url,
    type: r.type === 'audio' ? 'audio' : 'mp4',
    requested_quality: r.requested_quality || quality || null,
    file_size_bytes: r.file_size_bytes || null,
    source_used: 'new'
  }
}

// Old API: type is 'video' | 'audio' (or 'mp4'/'mp3' depending on caller). Returns data.* on success.
async function fetchFromOldApi(url, type, quality) {
  const { data } = await axios.get(buildOldApiUrl(url, type, quality), {
    timeout: DOWNLOAD_TIMEOUT_MS
  })

  if (!data || data.success !== true) {
    throw new Error(data?.error || 'تعذر تحميل هذا الاختيار من المصدر الاحتياطي')
  }

  const d = data.data
  return {
    title: d.title || null,
    thumbnail: d.thumbnail || null,
    download_url: d.download_url,
    type: d.type === 'mp3' || d.type === 'audio' ? 'audio' : 'mp4',
    requested_quality: d.requested_quality || quality || null,
    file_size_bytes: d.file_size_bytes || null,
    source_used: 'old',
    is_fallback: true
  }
}

// Tries the new API first; falls back to the old API on any failure.
// `type` here is 'video' | 'audio' | null(auto). Quality is passed through as-is to both APIs,
// since the new API supports the same video/audio quality values as the old one.
async function fetchDownload(url, type, quality) {
  try {
    return await fetchFromNewApi(url, type, quality)
  } catch (e) {
    console.error('new API failed, falling back to old API:', e?.message || e)
    return await fetchFromOldApi(url, type, quality)
  }
}

async function downloadToFile(fileUrl, filePath) {
  const response = await axios.get(fileUrl, {
    responseType: 'stream',
    timeout: 120000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })

  await pipeline(response.data, createWriteStream(filePath))
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) =&gt; {
    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''

    ff.stderr.on('data', (chunk) =&gt; {
      err += chunk.toString()
    })

    ff.on('error', reject)

    ff.on('close', (code) =&gt; {
      if (code === 0) return resolve()
      reject(new Error(`ffmpeg exited with code ${code}\n${err}`))
    })
  })
}

async function repairVideoWithFfmpeg(inputPath, outputPath) {
  try {
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-fflags', '+genpts',
      '-movflags', '+faststart',
      '-map', '0:v:0?',
      '-map', '0:a:0?',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-pix_fmt', 'yuv420p',
      outputPath
    ])
    return outputPath
  } catch (e) {
    console.error('repairVideoWithFfmpeg re-encode failed:', e?.message || e)

    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath
    ])

    return outputPath
  }
}

async function convertAudioWithFfmpeg(inputPath, outputPath) {
  try {
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      outputPath
    ])
    return outputPath
  } catch (e) {
    console.error('convertAudioWithFfmpeg failed:', e?.message || e)
    await runFfmpeg([
      '-y',
      '-i', inputPath,
      '-vn',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPath
    ])
    return outputPath
  }
}

async function prepareMediaFile(payload) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ytdl-'))
  const id = crypto.randomBytes(6).toString('hex')

  const srcPath = path.join(tmpDir, `source-${id}.bin`)
  const videoPath = path.join(tmpDir, `video-${id}.mp4`)
  const audioPath = path.join(tmpDir, `audio-${id}.mp3`)

  await downloadToFile(payload.download_url, srcPath)

  if (payload.type === 'mp4') {
    try {
      await repairVideoWithFfmpeg(srcPath, videoPath)
      return { filePath: videoPath, tmpDir, mimetype: 'video/mp4' }
    } catch (e) {
      console.error('video ffmpeg failed, sending original file:', e?.message || e)
      return { filePath: srcPath, tmpDir, mimetype: 'video/mp4' }
    }
  }

  try {
    await convertAudioWithFfmpeg(srcPath, audioPath)
    return { filePath: audioPath, tmpDir, mimetype: 'audio/mpeg' }
  } catch (e) {
    console.error('audio ffmpeg failed, sending original file:', e?.message || e)
    return { filePath: srcPath, tmpDir, mimetype: 'audio/mpeg' }
  }
}

async function sendDownloadedMedia(conn, chat, payload, quoted) {
  const isVideo = payload.type === 'mp4'
  const fallbackNote = payload.is_fallback ? '\nملحوظة: تم استخدام مصدر بديل' : ''
  const title = payload.title || 'بدون عنوان'

  let prepared
  try {
    prepared = await prepareMediaFile(payload)
    const buffer = await fs.readFile(prepared.filePath)

    if (isVideo) {
      await conn.sendMessage(
        chat,
        {
          video: buffer,
          mimetype: 'video/mp4',
          caption: `تم التحميل بنجاح\nالعنوان: ${title}\nالجودة: ${payload.requested_quality || 'auto'}\nالمصدر: ${payload.source_used || 'unknown'}${fallbackNote}`
        },
        { quoted }
      )
    } else {
      await conn.sendMessage(
        chat,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false
        },
        { quoted }
      )

      await conn.sendMessage(
        chat,
        {
          text: `تم التحميل بنجاح\nالعنوان: ${title}\nالجودة: ${payload.requested_quality || 'auto'}\nالمصدر: ${payload.source_used || 'unknown'}${fallbackNote}`
        },
        { quoted }
      )
    }
  } catch (e) {
    console.error('sendDownloadedMedia error:', e)
    const status = e?.response?.status
    const statusText = e?.response?.statusText
    const reason = status
      ? `الخادم رفض الطلب (${status}${statusText ? ' - ' + statusText : ''})`
      : (e?.code || e?.message || 'سبب غير معروف')

    await conn.sendMessage(
      chat,
      {
        text: `فشل تحميل الملف.\n\nالسبب: ${reason}\n\nحاول تختار جودة تانية أو أرسل الرابط من جديد.`
      },
      { quoted }
    )
  } finally {
    if (prepared?.tmpDir) {
      await fs.rm(prepared.tmpDir, { recursive: true, force: true }).catch(() =&gt; {})
    }
  }
}

function buildQualityRows(usedPrefix, command, url) {
  const quickRow = [
    {
      header: 'سريع',
      title: 'تحميل سريع (افتراضي)',
      description: 'يسيب السيرفر يختار أسرع جودة ومصدر متاح',
      id: `${usedPrefix}${command} ${url}${SELECT_SEPARATOR}auto${SELECT_SEPARATOR}auto`
    }
  ]

  const videoRows = VIDEO_QUALITIES.map((q) =&gt; ({
    header: 'فيديو',
    title: `${q}p`,
    description: `تحميل فيديو بجودة ${q}p`,
    id: `${usedPrefix}${command} ${url}${SELECT_SEPARATOR}video${SELECT_SEPARATOR}${q}`
  }))

  const audioRows = AUDIO_QUALITIES.map((q) =&gt; ({
    header: 'صوت',
    title: `${q}kbps`,
    description: `تحميل صوت بجودة ${q}kbps`,
    id: `${usedPrefix}${command} ${url}${SELECT_SEPARATOR}audio${SELECT_SEPARATOR}${q}`
  }))

  return { quickRow, videoRows, audioRows }
}

async function sendQualityList(conn, chat, quoted, usedPrefix, command, url, title) {
  const { quickRow, videoRows, audioRows } = buildQualityRows(usedPrefix, command, url)
  const titleLine = title ? `\nالعنوان: ${title}` : ''

  const contentMsg = {
    contentText: `اختر طريقة التحميل:${titleLine}`,
    footerText: 'اختر من القايمة تحت للتحميل:',
    buttons: [
      {
        buttonId: `${usedPrefix}تحميل_قايمة`,
        buttonText: { displayText: 'قايمة الجودات' },
        type: 1,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: 'تحميل يوتيوب',
            sections: [
              {
                title: 'تحميل سريع',
                highlight_label: 'الأسرع',
                rows: quickRow
              },
              {
                title: 'جودات الفيديو',
                highlight_label: `${videoRows.length} خيار`,
                rows: videoRows
              },
              {
                title: 'جودات الصوت',
                highlight_label: `${audioRows.length} خيار`,
                rows: audioRows
              }
            ]
          })
        }
      }
    ],
    headerType: 1
  }

  const waMsg = generateWAMessageFromContent(chat, { buttonsMessage: contentMsg }, { quoted })
  await conn.relayMessage(chat, waMsg.message, { messageId: waMsg.key.id })
}

const handler = async (m, { conn, args, usedPrefix, command }) =&gt; {
  const rawInput = args.join(' ').trim()

  if (!rawInput) {
    return conn.sendMessage(
      m.chat,
      {
        text: `تحميل من يوتيوب\n\nأرسل الأمر مع الرابط:\n${usedPrefix}${command} &lt;رابط يوتيوب&gt;\n\nمثال:\n${usedPrefix}${command} https://www.youtube.com/watch?v=xxxx`
      },
      { quoted: m }
    )
  }

  const selectedInput = extractTargetUrl(rawInput)
  const parts = selectedInput.split(SELECT_SEPARATOR)
  const isSelection = parts.length === 3

  const url = isSelection ? parts[0].trim() : selectedInput
  const selectedType = isSelection ? parts[1].trim() : null
  const selectedQuality = isSelection ? parts[2].trim() : null
  const isAuto = selectedType === 'auto'

  if (!isYouTubeUrl(url)) {
    return conn.sendMessage(
      m.chat,
      { text: 'الرابط ده مش رابط يوتيوب صحيح.' },
      { quoted: m }
    )
  }

  try {
    if (isSelection) {
      await conn.sendMessage(
        m.chat,
        { text: 'جاري التحميل، ممكن ياخد شوية وقت حسب طول الفيديو والمصدر المتاح...' },
        { quoted: m }
      )

      const payload = await fetchDownload(url, isAuto ? null : selectedType, isAuto ? null : selectedQuality)
      await sendDownloadedMedia(conn, m.chat, payload, m)
      return
    }

    await conn.sendMessage(m.chat, { text: 'جاري البحث عن الفيديو...' }, { quoted: m })
    const title = await fetchTitleSafely(url)
    await sendQualityList(conn, m.chat, m, usedPrefix, command, url, title)
  } catch (e) {
    console.error('يوتيوب handler error:', e)
    const msg = e?.message || 'حدث خطأ غير متوقع'
    await conn.sendMessage(
      m.chat,
      { text: `${msg}\n\nتأكد من صحة الرابط وحاول مرة أخرى.` },
      { quoted: m }
    )
  }
}

handler.command = /^(يوتيوب|ytdl|يوت)$/i
handler.help = ['يوتيوب &lt;رابط&gt;']
handler.tags = ['downloader']

export default handler
