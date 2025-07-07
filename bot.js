const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk';
const adminId = 1062138577;

const bot = new TelegramBot(token);
const USERS_FILE = 'users.json';
let users = {};

try {
    if (fs.existsSync(USERS_FILE)) {
        users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
} catch (err) {
    console.error("Error loading user data:", err.message);
    users = {};
}

function saveUsers() {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error("Error saving user data:", err.message);
    }
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
    }).catch(console.error);
}

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from.username ? '@' + msg.from.username : '---';
    const name = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');

    try {
        if (chatId === adminId.toString()) {
            sendAdminMenu(chatId);
            return;
        }

        if (!users[chatId]) {
            users[chatId] = { username, name, info: null };
            saveUsers();
            await bot.sendMessage(adminId, `👤 משתמש חדש עשה START:\nID: ${chatId}\n${username}\n${name}`);
            await bot.sendMessage(chatId, 'כדי להצטרף לגיבוי של נירוונה,\nאנא כתוב את המספר פלאפון והכתובת שאתה מזמין בדרך כלל\n(לא חובה, אבל יעזור לנו לתת שירות טוב יותר)');
        } else {
            await bot.sendMessage(chatId, '�?אתה כבר רשום בגיבוי של נירוונה');
        }
    } catch (err) {
        console.error("Start error:", err.message);
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text.trim();

    if (text === '/start') return;

    try {
        if (chatId === adminId.toString()) {
            if (text === '📊 מספר המשתמשים') {
                const count = Object.keys(users).length;
                await bot.sendMessage(chatId, `📊 מספר משתמשים בבוט: ${count}`);
            } else if (text === '📋 רשימת משתמשים') {
                const list = Object.entries(users).map(
                    ([id, user]) =>
                        `👤 *${user.name}*\n${user.username} | ID: \`${id}\`\n📍 ${user.info || 'אין מידע'}`
                ).join('\n\n');
                await bot.sendMessage(chatId, list || 'אין משתמשים רשומים עדיין.', { parse_mode: 'Markdown' });
            } else if (text === '📤 שלח הודעה לכולם') {
                await bot.sendMessage(chatId, 'שלח את ההודעה שאתה רוצה לשלוח לכולם:');
                bot.once('message', async (msg2) => {
                    const message = msg2.text;
                    let sent = 0;
                    for (const uid in users) {
                        if (uid !== adminId.toString()) {
                            try {
                                await bot.sendMessage(uid, message);
                                sent++;
                                await new Promise(res => setTimeout(res, 100));
                            } catch (err) {
                                console.log(`�?לא נשלח ל-${uid}:`, err.message);
                            }
                        }
                    }
                    await bot.sendMessage(chatId, `�?ההודעה נשלחה ל-${sent} משתמשים.`);
                });
            }
            return;
        }

        if (users[chatId] && users[chatId].info === null) {
            users[chatId].info = text;
            saveUsers();
            await bot.sendMessage(chatId, '�?תודה! אתה עכשיו בגיבוי של *נירוונה*\n\nנא לא לסגור את השיחה עם הבוט הזה,\nכדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו 💬', { parse_mode: 'Markdown' });
        }
    } catch (err) {
        console.error("Message handling error:", err.message);
    }
});

module.exports = bot;