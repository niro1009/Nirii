require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
const bot = new TelegramBot(token, { polling: true });

const USERS_FILE = 'users.json';

function loadUsers() {
  if (fs.existsSync(USERS_FILE)) {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  }
  return [];
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

let users = loadUsers();

function isUserExists(id) {
  return users.some((u) => u.id === id);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username ? '@' + msg.from.username : msg.from.first_name;

  if (!isUserExists(userId)) {
    users.push({ id: userId, username, phone: null, address: null });
    saveUsers(users);
  }

  if (userId.toString() === adminId) {
    bot.sendMessage(chatId, "שלום מנהל 👑", {
      reply_markup: {
        keyboard: [
          ["📋 מספר משתמשים", "👥 רשימת משתמשים"],
          ["📢 שלח הודעה לכולם"]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    });
  } else {
    bot.sendMessage(chatId, "אנא שלח את כתובת ההזמנה שלך + מספר טלפון בהודעה אחת (לא חובה):");
  }
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!isUserExists(userId)) return;

  const user = users.find((u) => u.id === userId);

  if (userId.toString() !== adminId && (!user.phone || !user.address) && text !== "/start") {
    user.phone = text;
    user.address = text;
    saveUsers(users);
    bot.sendMessage(chatId, "✅ תודה! אתה עכשיו בגיבוי של *נירוונה*.

נא לא לסגור את השיחה עם הבוט הזה כדי לקבל עדכונים ומידע חשוב 💬", { parse_mode: "Markdown" });
    return;
  }

  if (userId.toString() === adminId) {
    if (text === "📋 מספר משתמשים") {
      bot.sendMessage(chatId, `📊 מספר משתמשים בבוט: ${users.length}`);
    } else if (text === "👥 רשימת משתמשים") {
      const list = users.map((u, i) => `${i + 1}. ${u.username} (${u.id})`).join("\n");
      bot.sendMessage(chatId, `👥 רשימת משתמשים:\n${list || "אין משתמשים עדיין."}`);
    } else if (text === "📢 שלח הודעה לכולם") {
      bot.sendMessage(chatId, "שלח את ההודעה שברצונך לשלוח לכל המשתמשים:");
      bot.once("message", (reply) => {
        users.forEach((u) => {
          if (u.id.toString() !== adminId) {
            bot.sendMessage(u.id, reply.text).catch(() => {});
          }
        });
        bot.sendMessage(chatId, "✅ ההודעה נשלחה לכולם!");
      });
    }
  }
});
