require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const client = new MongoClient(process.env.MONGODB_URI);
let usersCollection;

// Connect to MongoDB
async function connectDB() {
  await client.connect();
  const db = client.db("nirvana_bot");
  usersCollection = db.collection("users");
}
connectDB();

// Handle /start
bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id;
  const username = msg.from.username;
  const fullName = msg.from.first_name;

  await usersCollection.updateOne(
    { telegram_id: userId },
    {
      $set: {
        telegram_id: userId,
        username: username || null,
        full_name: fullName || null,
        joined_at: new Date()
      }
    },
    { upsert: true }
  );

  if (userId.toString() !== process.env.ADMIN_ID) {
    bot.sendMessage(userId, "✅ תודה שהצטרפת לבוט של נירוונה!");
  }
});

// Admin command to see how many users are saved
bot.onText(/\/users_count/, async (msg) => {
  if (msg.from.id.toString() !== process.env.ADMIN_ID) return;
  const count = await usersCollection.countDocuments();
  bot.sendMessage(msg.chat.id, `📊 מספר משתמשים בבוט: ${count}`);
});