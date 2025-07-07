const { Telegraf, Markup } = require('telegraf');
const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const uri = process.env.MONGODB_URI;
const adminId = parseInt(process.env.ADMIN_ID);

let users;

MongoClient.connect(uri).then(client => {
  const db = client.db("nirvana_bot");
  users = db.collection("users");
  console.log("✅ Connected to MongoDB");
}).catch(err => console.error("❌ MongoDB Error:", err));

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || "NoUsername";

  if (userId === adminId) {
    ctx.reply("שלום מנהל", Markup.keyboard([
      ['📋 רשימת משתמשים', '📤 שלח הודעה לכולם'],
      ['📁 ייצוא מאגר']
    ]).resize());
    return;
  }

  const existing = await users.findOne({ userId });
  if (!existing) {
    await users.insertOne({ userId, username, phone: '', address: '', registeredAt: new Date() });
  }

  ctx.reply(
    '📦 אנא רשום את מספר הטלפון + הכתובת שלך בהודעה אחת (לא חובה):',
    Markup.removeKeyboard()
  );
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  if (userId === adminId) {
    if (text === '📋 רשימת משתמשים') {
      const all = await users.find().toArray();
      const msg = all.map(u => `• @${u.username} (${u.userId})`).join('\n') || 'אין משתמשים רשומים.';
      return ctx.reply(msg);
    }

    if (text === '📁 ייצוא מאגר') {
      const all = await users.find().toArray();
      const csv = 'Username,UserID,Phone,Address\n' + all.map(u => `@${u.username},${u.userId},${u.phone},${u.address}`).join('\n');
      fs.writeFileSync('users.csv', csv);
      return ctx.replyWithDocument({ source: 'users.csv', filename: 'nirvana_users.csv' });
    }

    if (text === '📤 שלח הודעה לכולם') {
      ctx.reply('📨 כתוב את ההודעה שברצונך לשלוח לכולם:');
      bot.once('text', async (msgCtx) => {
        const messageToSend = msgCtx.message.text;
        const all = await users.find().toArray();
        for (let u of all) {
          try {
            await bot.telegram.sendMessage(u.userId, messageToSend);
          } catch (err) {
            console.log(`❌ לא נשלח אל ${u.userId}`);
          }
        }
        msgCtx.reply('✅ ההודעה נשלחה לכולם.');
      });
      return;
    }
    return;
  }

  await users.updateOne(
    { userId },
    { $set: { phone: text.split(' ')[0] || '', address: text.split(' ').slice(1).join(' ') || '' } }
  );

  ctx.reply('✅ תודה! אתה עכשיו בגיבוי של *נירוונה*.

נא לא לסגור את השיחה עם הבוט הזה,
כדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו 💬', {
    parse_mode: 'Markdown'
  });
});

bot.launch().then(() => console.log("🚀 Bot is live"));