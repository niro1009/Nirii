const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Replace with your bot token
const token = '8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk';
const adminId = 1062138577;

const bot = new TelegramBot(token);

const USERS_FILE = 'users.json';
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function sendAdminMenu(chatId) {
    bot.sendMessage(chatId, 'תפריט ניהול:', {
        reply_markup: {
            keyboard: [
                ['📊 מספר המשתמשים', '📋 רשימת משתמשים'],
                ['📤 שלח הודעה לכולם']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from.username || '';
    const name = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');

    if (chatId === adminId.toString()) {
        sendAdminMenu(chatId);
        return;
    }

    if (!users[chatId]) {
        users[chatId] = { username, name, info: null };
        saveUsers();
        bot.sendMessage(adminId, `👤 משתמש חדש עשה START:\nID: ${chatId}\n@${username}\n${name}`);
        bot.sendMessage(chatId, 'כדי להצטרף לגיבוי של נירוונה,\nאנא כתוב את המספר פלאפון והכתובת שאתה מזמין בדרך כלל\n(לא חובה, אבל יעזור לנו לתת שירות טוב יותר)');
    } else {
        bot.sendMessage(chatId, '�?אתה כבר רשום בגיבוי של נירוונה');
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text.trim();

    if (text === '/start') return;

    if (chatId === adminId.toString()) {
        if (text === '📊 מספר המשתמשים') {
            const count = Object.keys(users).length;
            bot.sendMessage(chatId, `📊 מספר משתמשים בבוט: ${count}`);
        } else if (text === '📋 רשימת משתמשים') {
            const list = Object.entries(users).map(
                ([id, user]) => `${user.name} (@${user.username || '---'}) - ID: ${id}`
            ).join('\n');
            bot.sendMessage(chatId, list || 'אין משתמשים רשומים עדיין.');
        } else if (text === '📤 שלח הודעה לכולם') {
            bot.sendMessage(chatId, 'שלח את ההודעה שאתה רוצה לשלוח לכולם:');
            bot.once('message', async (msg2) => {
                const message = msg2.text;
                for (const uid in users) {
                    if (uid !== adminId.toString()) {
                        try {
                            await bot.sendMessage(uid, message);
                        } catch (err) {}
                    }
                }
                bot.sendMessage(chatId, '�?ההודעה נשלחה לכל המשתמשים.');
            });
        }
        return;
    }

    if (users[chatId] && users[chatId].info === null) {
        users[chatId].info = text;
        saveUsers();
        bot.sendMessage(chatId, '�?תודה! אתה עכשיו בגיבוי של *נירוונה*\n\nנא לא לסגור את השיחה עם הבוט הזה,\nכדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו 💬', { parse_mode: 'Markdown' });
    }
});

module.exports = bot;