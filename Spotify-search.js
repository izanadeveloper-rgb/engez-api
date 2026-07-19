// كود بحث وتحميل من سبوتيفاي 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from "axios";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

const API = "http://engez.a7a.online/api/v1";

const handlerSearch = async (m, { conn, text, usedPrefix }) => {
  if (!text) return m.reply(`أرسل اسم الأغنية\nمثال: ${usedPrefix}سبوتيفاي 7liwa`);

  await m.react("🔍");

  try {
    const { data } = await axios.get(`${API}/search/spotify`, { params: { q: text } });
    const results = data?.response?.results;
    if (!data.success || !results?.length) {
      await m.react("❌");
      return m.reply("ما لقيت نتائج");
    }

    const list = results.slice(0, 10);

    const buttons = [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "عرض النتائج",
          sections: [
            {
              title: text,
              rows: list.map((t, i) => ({
                title: `${i + 1}. ${t.name}`,
                description: `${t.artist} - ${t.duration}`,
                id: `${usedPrefix}spdl ${t.url}`,
              })),
            },
          ],
        }),
      },
    ];

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: proto.Message.InteractiveMessage.Body.create({ text: `نتائج البحث عن: ${text}` }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons }),
            }),
          },
        },
      },
      {}
    );

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    await m.react("✅");
  } catch (e) {
    await m.react("❌");
    await m.reply(e.message);
  }
};

const handlerDl = async (m, { conn, text, usedPrefix }) => {
  if (!text || !text.includes("spotify.com"))
    return m.reply(`أرسل رابط Spotify\nمثال: ${usedPrefix}spdl https://open.spotify.com/track/xxx`);

  await m.react("⏳");

  try {
    const { data } = await axios.get(`${API}/download/spotify`, { params: { url: text.trim() } });
    const info = data?.response;
    if (!data.success || !info?.downloadUrl) throw new Error("فشل التحميل");

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: info.downloadUrl },
        mimetype: "audio/mpeg",
        fileName: `${info.title}.mp3`,
        caption: `${info.title}\n${info.author}\n${info.duration}`,
      },
      { quoted: m }
    );
    await m.react("✅");
  } catch (e) {
    await m.react("❌");
    await m.reply(e.message);
  }
};

var handler = async (m, { conn, text, usedPrefix, command }) => {
  if (command === "سبوتيفاي" || command === "spsearch") return handlerSearch(m, { conn, text, usedPrefix });
  return handlerDl(m, { conn, text, usedPrefix });
};

handler.help = ["سبوتيفاي <بحث>", "spdl <رابط>"];
handler.tags = ["downloader"];
handler.command = /^(سبوتيفاي|spsearch|spdl|spotifydl)$/i;

export default handler;
