const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { exec } = require('child_process');

// CONFIGURATION (put your values here)
const BOT_TOKEN = '8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk';
const ADMIN_ID = 1062138577; // your telegram ID
const GITHUB_TOKEN = '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';
const GITHUB_USERNAME = 'niro1009';
const GITHUB_EMAIL = 'tlvnirvana@atomicmail.io';
const REPO_NAME = 'Nirii'; // repo name on GitHub

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Load users
let users = [];
try {
  const data = fs.readFileSync('users.json');
  users = JSON.parse(data);
} catch (e) {
  users = [];
}

function saveUsers() {
  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
  backupToGitHub();
}

function backupToGitHub() {
  exec('git config --global user.email "' + GITHUB_EMAIL + '"');
  exec('git config --global user.name "' + GITHUB_USERNAME + '"');
  exec('git add users.json');
  exec('git commit -m "Auto backup users.json" || echo "No changes"');
  exec(
    `git push https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/${REPO_NAME}.git`
  );
}

function isUserExist(id) {
  return users.some((u) => u.id === id);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const user = {
    id: msg.from.id,
    username: msg.from.username || '',
    first_name: msg.from.first_name || '',
    date: new Date().toISOString()
  };

  if (!isUserExist(user.id)) {
    users.push(user);
    saveUsers();
  }

  if (user.id === ADMIN_ID) {
    bot.sendMessage(chatId, 'שלום מנהל!');
  } else {
    bot.sendMessage(chatId, '✅ תודה! אתה עכשיו בגיבוי של *נירוונה*.

נא לא לסגור את השיחה עם הבוט הזה, כדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו 💬', { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/users/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;
  bot.sendMessage(msg.chat.id, `📊 מספר משתמשים בבוט: ${users.length}`);
});

bot.onText(/\/send (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;
  const text = match[1];
  users.forEach((u) => {
    bot.sendMessage(u.id, text).catch(() => {});
  });
});
