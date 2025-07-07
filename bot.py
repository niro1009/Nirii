from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler, filters,
    ContextTypes, ConversationHandler
)
import json
import os
import asyncio

# קובץ לאחסון משתמשים
users_file = "users.json"
admin_id = 1062138577  # החלף למזהה שלך אם נדרש

# אם הקובץ לא קיים - צור אותו
if not os.path.exists(users_file):
    with open(users_file, "w", encoding="utf-8") as f:
        json.dump({}, f)

ASK_INFO = 1

# התחלה לכל משתמש
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = str(user.id)

    if user_id == str(admin_id):
        buttons = [["📋 רשימת אנשים", "📨 שלח הודעה לכולם"]]
        reply_markup = ReplyKeyboardMarkup(buttons, resize_keyboard=True)
        await update.message.reply_text("שלום מנהל, השתמש בכפתורים שלמטה ⬇️", reply_markup=reply_markup)
        return

    with open(users_file, "r", encoding="utf-8") as f:
        users = json.load(f)

    if user_id not in users:
        users[user_id] = {
            "username": user.username or "אין",
            "full_name": user.full_name or "אין",
            "info": None
        }
        with open(users_file, "w", encoding="utf-8") as f:
            json.dump(users, f, ensure_ascii=False, indent=2)

        # שלח הודעה למנהל
        await context.bot.send_message(
            chat_id=admin_id,
            text=f"👤 משתמש חדש עשה START:\n"
                 f"ID: {user_id}\n"
                 f"@{user.username or '---'}\n"
                 f"{user.full_name or '---'}"
        )

        await update.message.reply_text(
            "כדי להצטרף לגיבוי של נירוונה,\n"
            "אנא כתוב את המספר פלאפון והכתובת שאתה מזמין בדרך כלל\n"
            "(לא חובה, אבל יעזור לנו לתת שירות טוב יותר)"
        )
        return ASK_INFO
    else:
        await update.message.reply_text("אתה כבר רשום בגיבוי של נירוונה ✅")

# שמירת פרטי משתמש
async def receive_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    info = update.message.text.strip()

    with open(users_file, "r", encoding="utf-8") as f:
        users = json.load(f)

    users[user_id]["info"] = info
    with open(users_file, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

    await update.message.reply_text(
        "✅ תודה! אתה עכשיו בגיבוי של *נירוונה*.\n"
        "נא לא לסגור את השיחה עם הבוט הזה,\n"
        "כדי שתוכל לקבל עדכונים ומידע חשוב דרך הבוט שלנו 💬",
        parse_mode="Markdown"
    )
    return ConversationHandler.END

# ביטול
async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("בוט הופסק.")
    return ConversationHandler.END

# הודעה לכל המשתמשים
async def send_to_all(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)
    if user_id != str(admin_id):
        return

    await update.message.reply_text("✍️ כתוב את ההודעה שברצונך לשלוח לכל המשתמשים:")
    context.user_data["awaiting_broadcast"] = True

# טיפול בהודעה מנהלית
async def handle_admin_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if context.user_data.get("awaiting_broadcast"):
        message = update.message.text
        context.user_data["awaiting_broadcast"] = False

        with open(users_file, "r", encoding="utf-8") as f:
            users = json.load(f)

        count = 0
        for uid in users.keys():
            try:
                await context.bot.send_message(chat_id=int(uid), text=message)
                count += 1
            except Exception as e:
                print(f"Failed to send message to {uid}: {e}")

        await update.message.reply_text(f"ההודעה נשלחה ל-{count} משתמשים ✅")
        return

    # כפתור צפייה ברשימה
    if update.message.text == "📋 רשימת אנשים":
        with open(users_file, "r", encoding="utf-8") as f:
            users = json.load(f)

        count = len(users)
        msg = f"📊 כמות משתמשים רשומים בבוט: {count}"
        await update.message.reply_text(msg)

    elif update.message.text == "📨 שלח הודעה לכולם":
        await send_to_all(update, context)

async def main():
    app = ApplicationBuilder().token("8104059957:AAGvG8WUATsPzO5VZkIGBQRxTBiyz0GdCIk").build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={ASK_INFO: [MessageHandler(filters.TEXT & ~filters.COMMAND, receive_info)]},
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(conv_handler)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_admin_message))

    await app.run_polling()

if __name__ == "__main__":
    # השתמש בלולאת האירועים הקיימת
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
