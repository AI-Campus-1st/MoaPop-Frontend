# =============================================================
# MoaPop 프론트엔드 컨테이너 이미지
# 1단계(build): Node로 화면을 빌드한다. VITE_* 값은 빌드할 때 화면 코드에 들어간다(빌드 인자로 받음).
# 2단계(serve): 빌드 결과(dist)만 nginx에 담아 80번 포트로 보낸다. 소스·node_modules·.env는 들어가지 않는다.
# 사용: docker-compose.yml이 이 파일로 이미지를 만든다(README의 Docker 절 참고).
# 키: 공개 키(Publishable/anon)만 받는다. 서버 키(service_role)는 절대 넘기지 않는다.
# =============================================================

# ---------- 1단계: 빌드 ----------
FROM node:22-slim AS build
WORKDIR /app

# 의존성 목록만 먼저 복사해 설치한다(소스만 바뀌면 이 단계는 캐시를 재사용해 빨라진다)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Supabase 연결 정보(공개 값). docker compose가 .env.local의 값을 넘겨준다
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# ---------- 2단계: 정적 파일 서버 ----------
FROM nginx:1.27-alpine

# 화면 안에서 처리하는 주소(/stock/..., /my 등)를 새로고침해도 404가 나지 않도록,
# 실제 파일이 없으면 index.html을 돌려준다. 빌드된 파일(/assets)은 오래 캐시한다(파일명에 해시가 붙음)
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }' \
  '}' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
