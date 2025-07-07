import logging
import json
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, ContextTypes, filters

BOT_OWNER_ID = 1062138577
USERS_FILE = "users.json"

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

def load_users():
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)

users = load_users()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = str(user.id)
    full_name = user.full_name
    username = user.username if user.username else "אין"

    is_new_user = False

    if user_id not in users:
        users[user_id] = {
            "full_name": full_name,
            "username": username,
            "details": ""
        }
        save_users(users)
        is_new_user = True

    if user.id == BOT_OWNER_ID:
        buttons = [["כמה משתמשים רשומים", "רשימת משתמשים"], ["פרטי משתמשים", "שלח הודעה לכולם"]]
        markup = ReplyKeyboardMarkup(buttons, resize_keyboard=True)
        await update.message.reply_text(
            "שלום מנהל, בחר פעולה:",
            reply_markup=markup
        )
    else:
        await update.message.reply_text(
            "אנא שלח בהודעה אחת את הפרטים הבאים (לא חובה):\n\n"
            "1. מספר הפלאפון של ההזמנה\n"
            "2. הכתובת שאתה מזמין אליה בדרך כלל\n\n"
            "לדוגמה:\n050-1234567, רחוב הרצל 10 תל אביב\n\n"
            "(אפשר גם לדלג – אתה עדיין תיכנס לרשימת הלקוחות)"
        )

    if is_new_user:
        notify_msg = (
            f"משתמש חדש נרשם:\n"
            f"שם: {full_name}\n"
            f"יוזר: @{username}\n"
            f"ID: {user_id}\n"
            f"פרטים: (אין עדיין)"
        )
        await context.bot.send_message(chat_id=BOT_OWNER_ID, text=notify_msg)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    text = update.message.text
    user_id = str(user.id)

    if user.id == BOT_OWNER_ID:
        if text == "כמה משתמשים רשומים":
            await update.message.reply_text(f"כעת רשומים {len(users)} משתמשים בבוט.")
        elif text == "רשימת משתמשים":
            response = "רשימת המשתמשים:\n\n"
            for i, (uid, data) in enumerate(users.items(), 1):
                response += f"{i}. {data['full_name']} (@{data['username']})\n"
            response += f"\nסה\"כ: {len(users)} משתמשים"
            await update.message.reply_text(response)
        elif text == "פרטי משתמשים":
            response = "פרטי משתמשים:\n\n"
            for i, (uid, data) in enumerate(users.items(), 1):
                details = data['details'] if data['details'] else "אין פרטים"
                response += f"{i}. @{data['username']} | {details}\n"
            await update.message.reply_text(response)
        elif text == "שלח הודעה לכולם":
            context.user_data["broadcast_mode"] = True
            await update.message.reply_text("כתוב את ההודעה שברצונך לשלוח לכל המשתמשים:")
        elif context.user_data.get("broadcast_mode"):
            context.user_data["broadcast_mode"] = False
            success, failed = 0, 0
            for uid in users.keys():
                try:
                    await context.bot.send_message(chat_id=uid, text=text)
                    success += 1
                except Exception as e:
                    logging.error(f"Failed to send message to {uid}: {e}")
                    failed += 1
            await update.message.reply_text(f"ההודעה נשלחה\nהצלחה: {success} | כישלונות: {failed}")
    else:
        users[user_id]["details"] = text
        save_users(users)
        await update.message.reply_text(
            "תודה! אתה עכשיו בגיבוי של *נירוונה*.\n\n"
            "נא לא לסגור את השיחה עם הבוט הזה,\n"
            "כדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו",
            parse_mode="Markdown"
        )
        notify_msg = f"פרטים התקבלו מ-@{users[user_id]['username']}:\n{text}"
        await context.bot.send_message(chat_id=BOT_OWNER_ID, text=notify_msg)

if __name__ == '__main__':
    import asyncio
    async def main():
        app = ApplicationBuilder().token("8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk").build()
        app.add_handler(CommandHandler("start", start))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
        await app.run_polling()
    asyncio.run(main())
