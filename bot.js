const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// TODO: Replace with your bot token
const token = '8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk';
const adminId = 1062138577;

const bot = new TelegramBot(token, { polling: true });
const USERS_FILE = 'users.json';

// Load or initialize users
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

// Save users to file
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id.toString();
    const username = msg.from.username || '';
    const name = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');

    if (!users[chatId]) {
        users[chatId] = { username, name, info: null };
        saveUsers();

        // notify admin
        bot.sendMessage(adminId, `👤 משתמש חדש עשה START:\nID: ${chatId}\n@${username}\n${name}`);

        // ask for info
        if (chatId !== adminId.toString()) {
            bot.sendMessage(chatId, 'כדי להצטרף לגיבוי של נירוונה,\nאנא כתוב את המספר פלאפון והכתובת שאתה מזמין בדרך כלל\n(לא חובה, אבל יעזור לנו לתת שירות טוב יותר)');
        }
    } else {
        bot.sendMessage(chatId, '�?אתה כבר רשום בגיבוי של נירוונה');
    }

    // מנהל
    if (chatId === adminId.toString()) {
        bot.sendMessage(chatId, 'שלום מנהל. כתוב "רשימה" לצפייה במשתמשים או "הודעה" לשליחת הודעה לכולם.');
    }
});

// קבלת הודעה רגילה
bot.on('message', (msg) => {
    const chatId = msg.chat.id.toString();

    if (msg.text === '/start') return;

    // מנהל
    if (chatId === adminId.toString()) {
        if (msg.text.toLowerCase() === 'רשימה') {
            const count = Object.keys(users).length;
            bot.sendMessage(chatId, `📊 מספר משתמשים בבוט: ${count}`);
        } else if (msg.text.toLowerCase().startsWith('הודעה ')) {
            const message = msg.text.slice(7).trim();
            let sent = 0;

            for (const uid in users) {
                if (uid !== adminId.toString()) {
                    bot.sendMessage(uid, message).then(() => sent++);
                }
            }

            bot.sendMessage(chatId, `ההודעה נשלחה ✅`);
        }
        return;
    }

    // משתמש מוסיף פרטים
    if (users[chatId] && users[chatId].info === null) {
        users[chatId].info = msg.text;
        saveUsers();

        bot.sendMessage(chatId, '�?תודה! אתה עכשיו בגיבוי של *נירוונה*\n\nנא לא לסגור את השיחה עם הבוט הזה,\nכדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו 💬', { parse_mode: 'Markdown' });
    }
});