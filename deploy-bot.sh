#!/data/data/com.termux/files/usr/bin/bash
set -e

read -p "1. Supabase Project Ref (masalan abcdefghijkl): " REF
read -p "2. Supabase Access Token (sbp_...): " SBP_TOKEN
read -p "3. Telegram Bot Token: " TG_TOKEN

cd ~/4-SON-TEXNIKUM-DAVOMAT-FINAL/backend/supabase/functions/telegram-bot

curl -s -X POST "https://api.supabase.com/v1/projects/$REF/secrets" \
  -H "Authorization: Bearer $SBP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "[{\"name\":\"TELEGRAM_BOT_TOKEN\",\"value\":\"$TG_TOKEN\"}]" > /dev/null

python3 -c "
import zipfile
with zipfile.ZipFile('$HOME/tg-bot.zip', 'w') as z:
    z.write('index.ts', 'index.ts')
"

RES=$(curl -s -X POST "https://api.supabase.com/v1/projects/$REF/functions/deploy?slug=telegram-bot&verify_jwt=false" \
  -H "Authorization: Bearer $SBP_TOKEN" \
  -F 'metadata={"entrypoint_path":"index.ts","verify_jwt":false}' \
  -F 'file=@$HOME/tg-bot.zip;type=application/zip')

echo "Deploy javobi: $RES"

WH=$(curl -s "https://api.telegram.org/bot$TG_TOKEN/setWebhook?url=https://$REF.supabase.co/functions/v1/telegram-bot")
echo "Webhook javobi: $WH"
