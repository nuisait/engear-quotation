#!/bin/bash
# ============================================================
# ENGEAR Quotation — Mac Deploy Script
# วิธีใช้: chmod +x deploy-mac.sh && ./deploy-mac.sh
# ============================================================

set -e

REPO_URL="https://github.com/nuisait/engear-quotation.git"
BRANCH="claude/fullstack-database-guide-UHTyj"
APP_DIR="$HOME/engear-quotation"
APP_NAME="engear-quotation"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}▸ $1${NC}"; }
success() { echo -e "${GREEN}✔ $1${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $1${NC}"; }
error()   { echo -e "${RED}✖ $1${NC}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   ENGEAR Quotation — Mac Installer   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── 1. Homebrew ──────────────────────────────────────────────
info "ตรวจสอบ Homebrew..."
if ! command -v brew &>/dev/null; then
  info "ติดตั้ง Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Apple Silicon path
  if [ -f "/opt/homebrew/bin/brew" ]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
  fi
else
  success "Homebrew พร้อมใช้งาน"
fi

# ── 2. Node.js ────────────────────────────────────────────────
info "ตรวจสอบ Node.js..."
if ! command -v node &>/dev/null; then
  info "ติดตั้ง Node.js (LTS)..."
  brew install node
else
  NODE_VER=$(node -v)
  success "Node.js $NODE_VER พร้อมใช้งาน"
fi

# ── 3. Git ────────────────────────────────────────────────────
info "ตรวจสอบ Git..."
if ! command -v git &>/dev/null; then
  info "ติดตั้ง Git..."
  brew install git
else
  success "Git พร้อมใช้งาน"
fi

# ── 4. pm2 ───────────────────────────────────────────────────
info "ตรวจสอบ pm2..."
if ! command -v pm2 &>/dev/null; then
  info "ติดตั้ง pm2..."
  npm install -g pm2
else
  success "pm2 พร้อมใช้งาน"
fi

# ── 5. Clone หรือ Pull โปรเจกต์ ───────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  info "พบโปรเจกต์แล้ว — ดึง code ล่าสุด..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
  success "อัปเดต code เรียบร้อย"
else
  info "โคลนโปรเจกต์ไปที่ $APP_DIR ..."
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  success "โคลนเรียบร้อย"
fi

cd "$APP_DIR"

# ── 6. npm install ────────────────────────────────────────────
info "ติดตั้ง dependencies..."
npm install --omit=dev
success "Dependencies พร้อมแล้ว"

# ── 7. สร้าง .env ─────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  warn ".env ไม่พบ — กรอกค่าต่อไปนี้:"
  echo ""

  read -p "  DATABASE_URL (postgresql://...): " DB_URL
  while [ -z "$DB_URL" ]; do
    warn "  DATABASE_URL ต้องระบุ"
    read -p "  DATABASE_URL: " DB_URL
  done

  read -p "  JWT_SECRET (กด Enter เพื่อสุ่มอัตโนมัติ): " JWT_SEC
  if [ -z "$JWT_SEC" ]; then
    JWT_SEC=$(openssl rand -hex 32)
    info "  สร้าง JWT_SECRET อัตโนมัติ"
  fi

  read -p "  PORT (กด Enter = 3000): " APP_PORT
  APP_PORT=${APP_PORT:-3000}

  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=${DB_URL}
JWT_SECRET=${JWT_SEC}
PORT=${APP_PORT}

# Email — กรอกเพิ่มเองถ้าต้องการส่งอีเมล
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=ENGEAR <your@gmail.com>
EOF
  success "สร้าง .env เรียบร้อย"
else
  success ".env มีอยู่แล้ว (ข้าม)"
fi

# ── 8. สร้าง ecosystem.config.js สำหรับ pm2 ──────────────────
cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'server.js',
    cwd: '$APP_DIR',
    instances: 1,
    autorestart: true,
    watch: false,
    env_file: '$APP_DIR/.env'
  }]
};
EOF

# ── 9. เริ่ม / รีสตาร์ท แอป ────────────────────────────────────
info "เริ่มต้นแอปด้วย pm2..."
pm2 stop "$APP_NAME" 2>/dev/null || true
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start "$APP_DIR/ecosystem.config.js"
pm2 save

# ── 10. ตั้ง pm2 auto-start เมื่อเปิดเครื่อง ─────────────────
info "ตั้ง pm2 ให้เริ่มอัตโนมัติเมื่อเปิดเครื่อง..."
PM2_STARTUP=$(pm2 startup 2>&1 | grep "sudo env PATH" || true)
if [ -n "$PM2_STARTUP" ]; then
  echo ""
  warn "รันคำสั่งนี้เพื่อให้ pm2 เริ่มอัตโนมัติ (ต้องใส่รหัสผ่าน Mac):"
  echo ""
  echo "  $PM2_STARTUP"
  echo ""
fi

# ── 11. สรุปผล ────────────────────────────────────────────────
PORT=$(grep -E "^PORT=" "$APP_DIR/.env" | cut -d= -f2 | tr -d ' ' || echo "3000")
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║            ✅  Deploy สำเร็จแล้ว              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
success "เปิดแอปที่: http://localhost:${PORT}"
echo ""
echo "  คำสั่งที่ใช้บ่อย:"
echo "  ┌─────────────────────────────────────────┐"
echo "  │  pm2 status          → ดูสถานะแอป       │"
echo "  │  pm2 logs $APP_NAME  → ดู logs           │"
echo "  │  pm2 restart $APP_NAME → รีสตาร์ท        │"
echo "  │  pm2 stop $APP_NAME  → หยุดแอป           │"
echo "  │  ./deploy-mac.sh     → อัปเดต code ใหม่  │"
echo "  └─────────────────────────────────────────┘"
echo ""
