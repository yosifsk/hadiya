#!/bin/sh
# ============================================================
#  HADIYA — نقطة الدخول
#  Render يركّب القرص الدائم (/var/data) ملكًا لـ root دائمًا،
#  فنضبط الملكية هنا ثم نُنزل الصلاحية إلى المستخدم node
#  (الحاوية تبدأ كـ root فقط لهذه اللحظة ثم يتغيّر المستخدم).
# ============================================================
set -e

DATA_DIR="${DATA_DIR:-/var/data}"
DB_FILE="${DB_FILE:-$DATA_DIR/hadba.sqlite}"

mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR" 2>/dev/null || true
chmod 750 "$DATA_DIR" 2>/dev/null || true

# تشغيل التطبيق بصلاحيات محدودة
exec gosu node node src/server.js
