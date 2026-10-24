# ============================================================
#  HADIYA — صورة Docker للنشر على Render / Railway / Fly.io
#  البناء: docker build -t hadiya .
#  التشغيل: docker run -p 3100:3100 -v hadiya-data:/var/data --env-file .env hadiya
# ============================================================

FROM node:24-slim

# أدوات: شهادات CA (لـ RPC/HTTPS)، curl (healthcheck)، tini (إشارات)، gosu (إنزال الصلاحية)
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl tini gosu \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# طبقة التبعيات (تُخزَّن مؤقتًا)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# طبقة التطبيق
COPY . .

# مجلد البيانات + سكربت الدخول
RUN mkdir -p /var/data \
 && chmod +x /app/docker-entrypoint.sh \
 && chown -R node:node /app /var/data

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3100 \
    DATA_DIR=/var/data \
    DB_FILE=/var/data/hadba.sqlite

EXPOSE 3100
VOLUME ["/var/data"]

# فحص الصحة (Render يستخدمه)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

# tini المُبادر → تمرير الإشارات بشكل صحيح (إيقاف نظيف)
ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker-entrypoint.sh"]
