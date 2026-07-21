// كود توليد اغاني suno 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios';
import { generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";

const IMAGE_URL = "https://files.catbox.moe/4cyr44.jpg";
const SONO_API = 'https://engez.a7a.online/api/v1/ai/ai/sono'; // ✅ تم تصحيح المسار

const genres = ["pop","rock","sad","rap","trap","lofi","arabic","chill","romantic","dance"];
const voices = [
  { label: "ذكر", value: 1 },
  { label: "أنثى", value: 2 },
  { label: "محايد", value: 0 }
];

async function callSonoAPI(params) {
  try {
    const response = await axios.get(SONO_API, {
      params: {
        prompt: params.prompt,
        musicStyle: params.musicStyle,
        genderType: params.genderType
      },
      timeout: 120000
    });

    if (response.data.success && response.data.response.success) {
      return response.data.response.results;
    } else {
      throw new Error(response.data.error || 'فشل في توليد الأغنية');
    }
  } catch (error) {
    console.error('Sono API error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(`فشل الاتصال بـ API السونو: ${error.message}`);
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {

  if (command === "سونو") {
    if (!text) return m.reply(`💬 اكتب وصف الأغنية...\nمثال:\n${usedPrefix}سونو أغنية حزينة عن الفراق`);

    const media = await prepareWAMessageMedia({ image: { url: IMAGE_URL } }, { upload: conn.waUploadToServer });

    const rows = genres.map(g => ({
      title: g,
      id: `${usedPrefix}سونو-صوت ${encodeURIComponent(text)}|${g}`
    }));

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
            body: { text: `🎵 *الوصف:*\n"${text}"\n\nاختر نوع الموسيقى:` },
            footer: { text: "🎵 سونو - AI MUSIC" },
            nativeFlowMessage: {
              buttons: [{
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "أنواع الموسيقى",
                  sections: [{ title: "Genre List", rows }]
                })
              }]
            }
          }
        }
      }
    }, { userJid: conn.user.jid, quoted: m });

    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  }

  if (command === "سونو-صوت") {
    const [encodedDesc, genre] = text.split("|");
    const desc = decodeURIComponent(encodedDesc);

    const media = await prepareWAMessageMedia({ image: { url: IMAGE_URL } }, { upload: conn.waUploadToServer });

    const rows = voices.map(v => ({
      title: v.label,
      id: `${usedPrefix}سونو-توليد ${encodedDesc}|${genre}|${v.value}`
    }));

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
            body: { text: `🎵 *الوصف:*\n${desc}\n📌 النوع: ${genre}\n\nاختر نوع الصوت:` },
            footer: { text: "🎵 سونو - AI MUSIC" },
            nativeFlowMessage: {
              buttons: [{
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "نوع الصوت",
                  sections: [{ title: "Voices", rows }]
                })
              }]
            }
          }
        }
      }
    }, { userJid: conn.user.jid, quoted: m });

    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  }

  if (command === "سونو-توليد") {
    const [encodedDesc, genre, genderType] = text.split("|");
    const desc = decodeURIComponent(encodedDesc);

    await m.reply("⏳ جاري توليد الأغنية... الرجاء الانتظار.");

    try {
      const results = await callSonoAPI({
        prompt: desc,
        musicStyle: genre,
        genderType: parseInt(genderType)
      });

      if (!results || !results.length) return m.reply("❌ لم يتم إنشاء أغنية.");

      for (const song of results) {
        if (song.cover_image)
          await conn.sendMessage(m.chat, { image: { url: song.cover_image }, caption: "🎨 *غلاف الأغنية*" }, { quoted: m });

        await conn.sendMessage(m.chat, {
          audio: { url: song.music_file },
          mimetype: "audio/mpeg",
          fileName: "song.mp3"
        }, { quoted: m });

        if (song.lyrics)
          await conn.sendMessage(m.chat, { text: `📝 *الكلمات:*\n\n${song.lyrics}` }, { quoted: m });
      }

    } catch (e) {
      console.error(e);
      m.reply("❌ حدث خطأ أثناء التوليد: " + e.message);
    }
  }
};

handler.command = ["سونو", "سونو-صوت", "سونو-توليد"];
handler.tags = ["music"];
handler.help = ["سونو <وصف>"];
handler.description = "توليد أغاني بالذكاء الاصطناعي";

export default handler;
