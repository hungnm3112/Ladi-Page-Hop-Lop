# PLAN MASTER – Ladi Page "Hẹn Ước Thanh Xuân"
> Phân tích UI/UX **từ ảnh chụp màn hình thực tế** của trang Ladi mẫu
> Trường THPT Yên Dũng Số 2 · Niên Khóa 2003–2006

---

## 1. DESIGN TOKENS (Màu sắc & Typography chính xác)

### 1.1 Color Palette
```
Nền đen hero / footer:   #1A1A1A
Nền kem sáng (chính):    #FAF8F5   ← hầu hết các section sáng
Nền trắng thuần:         #FFFFFF   ← Thư viện ảnh, một vài section
Gold chính (accent):     #C9A96E   ← section-label, underline, icon, border
Cam-đỏ CTA button:       #FF6B35   ← button "ĐĂNG KÝ THAM GIA" primary
Chữ đậm chính:           #1A1A1A
Chữ phụ / muted:         #6a7282   ← subtitle, date, class label
Cam thông báo bullet:    #FF6B35   ← bullet dot thông báo, link accent
Đường kẻ vàng ngắn:      #C9A96E  height 2px, width ~60px (underline title)
```

### 1.2 Typography
```
Font Heading: "Cormorant Garamond" (serif)
  weights: 400 (body italic), 600 (title), 700 (bold title)
  Dùng cho: H1, H2, H3, countdown numbers lớn, quote text, số thống kê

Font Body: "Inter" (sans-serif)
  Dùng cho: paragraph, nav, label uppercase, button text, meta text

letter-spacing body: 0.01em
```

### 1.3 Typography Scale (thực tế từ screenshots)
```
Section label:   Inter, 11–12px, uppercase, tracking-wider, color #C9A96E
Section title:   Cormorant Garamond, ~48–56px desktop / ~32px mobile
Section subtitle: Inter, 14px, color #6a7282
Body paragraph:  Inter, 15–16px, line-height 1.7, color #1A1A1A
Card label:      Inter, 11px, uppercase, tracking-wider, color #C9A96E
Card value:      Cormorant Garamond, 22–26px, bold, color #1A1A1A
Timeline time:   Inter/CG, color #C9A96E, bold
Big stat number: Cormorant Garamond, ~80px, color #1A1A1A
```

### 1.4 Section Title Pattern (NHẤT QUÁN XUYÊN SUỐT)
```
┌─────────────────────────────────────────────┐
│  SECTION LABEL   ← uppercase, 12px, #C9A96E │
│  Section Title   ← CG serif, 48px, #1A1A1A  │
│  ──────          ← gold line 2px × 60px      │
│  Subtitle text   ← Inter, 14px, #6a7282      │
└─────────────────────────────────────────────┘
```

### 1.5 Effects & Transitions
```
Hover image:     scale(1.05), duration 0.5s, ease-in-out
Shadow cards:    box-shadow: 0 1px 4px rgba(0,0,0,0.08)
Backdrop blur:   backdrop-filter: blur(8px)  (countdown boxes, nếu có)
Scroll reveal:   opacity 0→1, translateY 20px→0, duration 0.7s, staggered
Transition:      transition-all 0.15s ease-in-out (default)
Fixed CTA btn:   box-shadow: 0 4px 12px rgba(201,169,110,0.4)
```

---

## 2. GLOBAL ELEMENTS (Có mặt trên mọi trang)

### 2.1 TOP NAVIGATION (sticky, luôn hiển thị)
```
Background: white (#FFFFFF), border-bottom 1px solid #e5e7eb, box-shadow nhẹ
Height: ~56px

[Left]  Logo nhỏ (32px) + "HẸN ƯỚC THANH XUÂN" — Inter uppercase, tracking-wider

[Center nav links]
  GIỚI THIỆU | LỊCH TRÌNH | ĐÃ ĐĂNG KÝ | THƯ VIỆN ẢNH | LƯU BÚT | LIÊN HỆ
  → Inter, 13px, uppercase, tracking-wider, color #1A1A1A
  → hover: color #C9A96E
  → active section: color #C9A96E

[Right buttons]
  "ỦNG HỘ"  — outlined button, border #C9A96E, text #C9A96E, rounded
  "ĐĂNG KÝ" — filled button, bg #C9A96E, text white, rounded
```

### 2.2 FIXED CTA BUTTON (Bottom-right, luôn hiển thị)
```
"ĐĂNG KÝ NGAY"
Position: fixed, bottom: 24px, right: 24px, z-index: 999
Style: bg #C9A96E (gold), text white, Inter, 13px, uppercase
       padding: 12px 20px, rounded, box-shadow
```

---

## 3. CÁC SECTIONS (Thứ tự đúng từ trên xuống)

---

### SECTION 1 — HERO

**Background:** `#1A1A1A` (đen)
**Height:** 100vh (full viewport)

**Layout:**
```
[Logo]
  → Kích thước ~200×200px, có viền trắng hoặc bg trắng nhẹ
  → filter: drop-shadow(0 25px 25px rgba(0,0,0,0.25))

[Ornament dots vòng tròn]
  → Các chấm nhỏ màu #C9A96E, xếp thành hình elipse xung quanh logo
  → CSS: radial dots hoặc SVG circle

[Label nhỏ]
  → "HẸN ƯỚC THANH XUÂN"
  → Inter, 13px, uppercase, tracking-wider, color #C9A96E

[H1 — 2 dòng khác nhau]
  Dòng 1: "Kỷ Niệm 20 Năm"
    → Cormorant Garamond BOLD, ~64–72px, color WHITE
  Dòng 2: "Ngày Ra Trường"
    → Cormorant Garamond ITALIC, ~64–72px, color #C9A96E (vàng gold)

[School info]
  → "Trường THPT Yên Dũng Số 2" — Inter, 16px, white, normal weight
  → "NIÊN KHÓA 2003 – 2006" — Inter, 12px, uppercase, tracking-wider,
     color rgba(255,255,255,0.6)

[Body text mô tả]
  → 1–2 câu ngắn, Inter, 15px, color rgba(255,255,255,0.75), max-width 480px, centered
  → VD: "Sau 20 năm, đây là dịp để bạn bè, thầy cô gặp lại nhau..."

[2 CTA Buttons — ngang nhau]
  Button 1: "ĐĂNG KÝ THAM GIA"
    → bg #C9A96E (hoặc #FF6B35), text white/dark, Inter, uppercase
    → padding: 14px 32px, rounded
  Button 2: "XEM LỊCH TRÌNH ®"
    → transparent bg, border white hoặc gold, text white
    → padding: 14px 32px, rounded

[Dots ornament nhỏ dưới 2 button]
  → 3–5 chấm tròn nhỏ màu #C9A96E

[COUNTDOWN — cuối hero]
  → 4 số lớn nằm ngang, không có box riêng
  → Layout: 107  ·  19  ·  54  ·  49
              NGÀY   GIỜ  PHÚT  GIÂY
  → Số: Cormorant Garamond, ~56px, color #C9A96E (vàng)
  → Label: Inter, 10px, uppercase, tracking-wider, color rgba(255,255,255,0.5)
  → Phân cách bằng dấu chấm nhỏ hoặc không có dấu phân cách
```

---

### SECTION 2 — THƯ NGỎ (Giới thiệu)

**Background:** `#FAF8F5` (kem)
**ID:** `gioi-thieu`

**Layout:**
```
[Section title block — dạng chuẩn]
  "THƯ NGỎ" — label
  "Lời Mời Từ Trái Tim" — H2
  ── gold line ──
  "Gửi tới tất cả các bạn cựu học sinh niên khóa 2003 – 2006" — subtitle

[Nội dung thư — có left border gold]
  → max-width ~740px, mx-auto
  → border-left: 3px solid #C9A96E (accent line bên trái)
  → padding-left: 24px
  → Multi-paragraph, Inter, 15–16px, line-height 1.8, color #1A1A1A
  → Kết thúc bằng chữ ký: "– Ban Tổ Chức –" (Cormorant Garamond italic, right-aligned)

[4 Info Cards — nằm ngang phía dưới]
  → Grid 4 cột (responsive: 2×2 → 4×1)
  → Mỗi card: bg white, border 1px solid #e5e7eb, rounded-xl, padding ~20px
  → Không có shadow đậm (subtle only)
  Card 1: 📅  THỜI GIAN   / Ngày 09/08/2026
  Card 2: 📍  ĐỊA ĐIỂM   / Trường THPT Yên Dũng Số 2
  Card 3: 👥  ĐỐI TƯỢNG  / Cựu HS niên khóa 03-06
  Card 4: 📞  LIÊN HỆ    / 0981 388 562
  → Icon: 28–32px (emoji hoặc SVG)
  → Label: Inter, 11px, uppercase, #C9A96E
  → Value: Cormorant Garamond, 18–20px, bold, #1A1A1A
```

---

### SECTION 3 — LỊCH TRÌNH

**Background:** `#FFFFFF` hoặc `#FAF8F5`
**ID:** `lich-trinh`

**Layout:**
```
[Section title block]
  "LỊCH TRÌNH"
  "Chương Trình Sự Kiện"
  ── gold line ──
  "Hai ngày tràn đầy cảm xúc và kỷ niệm"

[Activity Icons Row — 5 icons nằm ngang, centered]
  → Mỗi icon: bordered box ~80×80px, rounded, bg white, border gray-200
  → Icon emoji lớn + tên nhỏ bên dưới, uppercase, 11px, #C9A96E
  ⚽ BÓNG ĐÁ | 💪 KÉO CƠ | 🏓 PICKLEBALL | 🔥 LỬA TRẠI | 🎵 VĂN NGHỆ

[Timeline — chia theo ngày]
  ┌─ NGÀY 1 badge (bg #1A1A1A, text white, rounded-sm, px-3 py-1)
  │  "Chiều & Tối 08/08/2026" — Inter, 14px, gray
  │  ─────────────────────── (divider line)
  │
  │  [Mỗi mục lịch trình]
  │  13:00  •  Đón Tiếp & Tập Trung
  │  14:00     Check-in, gặp gỡ bạn bè
  │  └──────────────────────────────────
  │  Time:     Inter/CG, #C9A96E, ~15px, min-width 80px
  │  Dot:      • màu #C9A96E
  │  Title:    Inter bold, 16px, #1A1A1A
  │  Subtitle: Inter, 14px, #6a7282
  │  Divider:  line kẻ ngang, 1px, #e5e7eb
  │
  ├─ NGÀY 2 badge (tương tự)
  └─ ...

  Các mục lịch trình:
  NGÀY 1:
    13:00–14:00  Đón Tiếp & Tập Trung
    14:00–17:00  Giao Lưu Thể Thao (Bóng đá, kéo co, pickleball)
    17:00–18:30  Nghỉ Ngơi & Ăn Tối
    19:00–22:00  Đốt Lửa Trại & Văn Nghệ
  NGÀY 2:
    07:30–08:00  Đón Tiếp & Đăng Ký
    ...
```

---

### SECTION 4 — ĐÃ ĐĂNG KÝ THAM GIA

**Background:** `#FAF8F5`
**ID:** `da-dang-ky`

**Layout:**
```
[Section title block]
  "DANH SÁCH"
  "Đã Đăng Ký Tham Gia"
  ── gold line ──
  "Xem ai đã đăng ký và rủ thêm bạn bè nhé! ♻ Tải lại"

[Tab switcher]
  [THỐNG KÊ] (active: bg #1A1A1A, text white)
  [DANH SÁCH CHI TIẾT] (inactive: bg transparent, border, text dark)
  → 2 tabs nằm ngang

[Tab: THỐNG KÊ]
  → Số lớn: "305" — Cormorant Garamond, ~80px, #1A1A1A, centered
  → Sub: "người đã đăng ký" — Inter, 14px, gray
  → Sub2: "15 / 15 lớp tham gia" — Inter, 13px, gold
  
  → Bar chart theo lớp (horizontal bars):
    A1  ████████████████████████  28
    A2  ██████████████           21
    A3  ████████████████████████████████████████ 40
    ...
    → Label lớp: Inter, 13px, left
    → Bar: bg #1A1A1A (đen), height ~12px, border-radius 2px
    → Số: Inter, 13px, right

[Tab: DANH SÁCH CHI TIẾT]
  → Table hoặc card list: Tên, Lớp, Ngày đăng ký
```

---

### SECTION 5 — THƯ VIỆN ẢNH (Gallery)

**Background:** `#FFFFFF`
**ID:** `thu-vien-anh`

**⚠ QUAN TRỌNG: Không phải masonry grid — đây là SLIDESHOW/CAROUSEL**

**Layout:**
```
[Section title block]
  "ALBUM ẢNH"
  "Thư Viện Kỷ Niệm"
  ── gold line ──
  "Ngày Ấy – Bây Giờ"

[Carousel/Slideshow chính]
  → Hiển thị 1 slide lớn, width ~600px, centered (hoặc full-width)
  → Mỗi slide = 2 ảnh song song (Ngày Ấy bên trái nhỏ + Bây Giờ bên phải lớn)
    hoặc 1 ảnh full-width
  → Caption bottom-left: "A4 - 0306" bold + "Hương Tuyết – Lớp A4" gray
  → Counter bottom-right: "21 / 44" — Inter, 13px, white trên overlay
  → Navigation arrows: < > ở hai bên (absolute positioned)
  → Dots navigation: dưới slide, dot vàng = active, gray = inactive
  → Transition: slide hoặc fade

[Upload button]
  → "← GỬI ẢNH KỶ NIỆM CỦA BẠN →"
  → Style: full-width, dashed border 1px solid #C9A96E
  → Inter, 13px, uppercase, text #C9A96E
  → Padding: 16px, rounded
  → Hover: bg #FAF8F5
```

---

### SECTION 6 — SỔ LƯU BÚT ONLINE

**Background:** `#FAF8F5`
**ID:** `luu-but`

**Layout:**
```
[Section title block]
  "LƯU BÚT"
  "Sổ Lưu Bút Online"
  ── gold line ──
  "Để lại vài dòng nhắn gửi tới bạn bè và thầy cô"

[CTA Button]
  → "GỬI LỜI NHẮN" — bg #1A1A1A, text white, Inter, uppercase
  → padding: 12px 28px, rounded

[Quote Cards Grid — masonry 3 cột]
  → gap-4, responsive: 1→2→3 cột
  
  Mỗi card:
  → bg white, border 1px solid #e5e7eb, rounded-xl, padding 20px
  → Quote text: Cormorant Garamond italic, 15–16px, #1A1A1A, có dấu "..."
  → Separator: "——" — 2 gạch ngang, màu #C9A96E, margin: 12px 0
  → Name: Inter bold, 14px, #1A1A1A
  → Class: Inter, 13px, #6a7282 (VD: "Lớp A8")
  
  Card được highlight (1 card):
  → border 1px solid #C9A96E (border vàng nổi bật)
```

---

### SECTION 7 — THÔNG BÁO TỪ BAN TỔ CHỨC

**Background:** `#FAF8F5` (rất nhạt, gần trắng)
**ID:** `thong-bao`

**Layout:**
```
[Section title block]
  "THÔNG BÁO"
  "Tin Từ Ban Tổ Chức"
  ── gold line ──

[Danh sách thông báo]
  → List items, phân cách bằng border-bottom 1px solid #e5e7eb
  → Full-width, max-width ~800px, mx-auto
  
  Mỗi item thông báo:
  • Bullet dot: • màu #FF6B35 (cam-đỏ)
  • Title: Inter semibold, 15px
    - màu #FF6B35 nếu link (clickable)
    - màu #1A1A1A nếu plain text
  • Subtitle: Inter, 14px, #6a7282
  • Ngày đăng: Inter, 12px, #9ca3af, dưới cùng
  
  Alternating highlight:
  → Một số item có bg #FAF8F5 (highlight row)
  → Padding: 16px 0
  
  Ví dụ items:
  • Hạn chốt đăng ký: 01/08/2026 — Vui lòng đăng ký trước...   16/03/2026
  • Đồng phục kỷ niệm — BTC sẽ có áo đồng phục...               10/03/2026
  • Đóng góp cho chương trình — Các bạn có thể đóng góp...       05/03/2026
  • Gửi ảnh kỷ niệm — Hãy gửi ảnh thời học trò...               01/03/2026
```

---

### SECTION 8 — ĐỊA ĐIỂM & LIÊN HỆ

**Background:** `#FAF8F5`
**ID:** `lien-he`

**Layout:**
```
[Section title block]
  "ĐỊA ĐIỂM"
  "Địa Điểm & Liên Hệ"  ← Cormorant Garamond ITALIC
  ── gold line ──

[2 Columns layout]
  Cột trái (~45%):
    → Google Maps embed iframe
    → Rounded-xl, overflow hidden
    → height ~300px
    → Link "Mở trong Maps ↗" phía trên
    → Button "CHỈ ĐƯỜNG →" phía dưới map: bg #1A1A1A, text white
  
  Cột phải (~55%):
    → 4 info rows, mỗi row:
    → Icon 20px + Label uppercase 11px #C9A96E + Value text 15px
    → Divider: border-bottom giữa các rows
    
    📍 ĐỊA CHỈ    / Trường THPT Yên Dũng Số 2, Yên Dũng, Bắc Giang
    📞 ĐIỆN THOẠI / 0981 388 562 (Mr Tuyên A1 – Trưởng BTC)
    💬 NHÓM ZALO  / Nhóm "Hội Ngộ 20 Năm"
    🚗 GỬI XE     / Bãi gửi xe miễn phí tại trường
```

---

### SECTION 9 — FOOTER

**Background:** `#1A1A1A`
**Padding:** py-12

**Layout:**
```
→ Logo nhỏ centered (~60px)
→ "HẸN ƯỚC THANH XUÂN" — Cormorant Garamond italic, #C9A96E
→ Divider: thin gold line
→ Nav links nhỏ (giống top nav)
→ Copyright: Inter, 12px, rgba(255,255,255,0.4)
→ Link admin ẩn (cực nhỏ, opacity thấp)
```

---

## 4. SECTION TITLE ORNAMENT PATTERN

Tất cả sections (trừ Hero) đều dùng đúng pattern này:

```html
<div class="section-header">
  <p class="section-label">SECTION LABEL</p>  <!-- gold, uppercase, small -->
  <h2 class="section-title">Section Title</h2>  <!-- CG serif, large -->
  <div class="title-underline"></div>  <!-- gold line 2px × 60px -->
  <p class="section-subtitle">Subtitle text</p>  <!-- Inter, muted -->
</div>
```

```css
.section-label  { color: #C9A96E; font: 11px/1 Inter; letter-spacing: 0.1em; text-transform: uppercase; }
.section-title  { font: 700 48px/1.1 'Cormorant Garamond'; color: #1A1A1A; margin: 8px 0; }
.title-underline { width: 60px; height: 2px; background: #C9A96E; margin: 12px auto; }
.section-subtitle { font: 14px/1.5 Inter; color: #6a7282; }
```

---

## 5. INTERACTIVE FEATURES

```
1. Countdown timer — realtime, mỗi 1 giây
2. Carousel gallery — prev/next/dots, auto-play optional
3. Tab switcher (Thống kê / Danh sách)
4. Sticky nav — scroll highlight active section
5. Scroll-reveal — fade+slide mỗi section
6. Fixed CTA button — luôn visible
7. Lightbox (nếu click vào ảnh đơn lẻ)
8. Form gửi lưu bút (POST)
```

---

## 6. CẤU TRÚC PROJECT ĐƠN GIẢN (không thay đổi)

```
Ladi-Page-Hop-Lop/
├── server.js           ← Express + routes
├── package.json
├── .env
├── data/
│   └── content.json    ← Toàn bộ nội dung editable
├── public/
│   ├── css/style.css   ← Landing page
│   ├── css/admin.css
│   ├── js/admin.js
│   └── images/
│       ├── logo.png
│       └── gallery/
├── views/
│   ├── index.ejs       ← Landing page
│   ├── admin.ejs
│   └── login.ejs
└── routes/
    ├── index.js
    └── admin.js
```

---

## 7. CONTENT.JSON (Cập nhật đầy đủ)

```json
{
  "site": {
    "name": "Hẹn Ước Thanh Xuân",
    "navLinks": ["gioi-thieu", "lich-trinh", "da-dang-ky", "thu-vien-anh", "luu-but", "lien-he"]
  },
  "hero": {
    "logo": "/images/logo.png",
    "label": "HẸN ƯỚC THANH XUÂN",
    "titleLine1": "Kỷ Niệm 20 Năm",
    "titleLine2": "Ngày Ra Trường",
    "school": "Trường THPT Yên Dũng Số 2",
    "tagline": "NIÊN KHÓA 2003 – 2006",
    "description": "Sau 20 năm, đây là dịp để bạn bè, thầy cô gặp lại nhau. Cùng ôn lại kỷ niệm cũ và tạo thêm những kỷ niệm mới.",
    "ctaPrimaryText": "Đăng Ký Tham Gia",
    "ctaPrimaryUrl": "#dang-ky",
    "ctaSecondaryText": "Xem Lịch Trình",
    "ctaSecondaryUrl": "#lich-trinh"
  },
  "event": {
    "date": "2026-08-09",
    "time": "13:00",
    "venue": "Trường THPT Yên Dũng Số 2",
    "address": "Yên Dũng, Bắc Giang",
    "target": "Cựu HS niên khóa 03-06",
    "contact": "0981 388 562",
    "mapUrl": "https://maps.google.com/?q=THPT+Yen+Dung+So+2"
  },
  "intro": {
    "label": "THƯ NGỎ",
    "title": "Lời Mời Từ Trái Tim",
    "subtitle": "Gửi tới tất cả các bạn cựu học sinh niên khóa 2003 – 2006",
    "content": "Kính gửi các bạn học sinh cũ!\n\nĐã 20 năm trôi qua kể từ ngày chúng ta rời mái trường thân yêu...\n\n– Ban Tổ Chức –"
  },
  "schedule": {
    "label": "LỊCH TRÌNH",
    "title": "Chương Trình Sự Kiện",
    "subtitle": "Hai ngày tràn đầy cảm xúc và kỷ niệm",
    "activities": ["⚽ BÓNG ĐÁ", "💪 KÉO CƠ", "🏓 PICKLEBALL", "🔥 LỬA TRẠI", "🎵 VĂN NGHỆ"],
    "days": [
      {
        "label": "NGÀY 1",
        "date": "Chiều & Tối 08/08/2026",
        "items": [
          { "time": "13:00", "endTime": "14:00", "title": "Đón Tiếp & Tập Trung", "desc": "Check-in, gặp gỡ bạn bè" },
          { "time": "14:00", "endTime": "17:00", "title": "Giao Lưu Thể Thao", "desc": "Bóng đá, kéo co, pickleball" },
          { "time": "17:00", "endTime": "18:30", "title": "Nghỉ Ngơi & Ăn Tối", "desc": "Thư giãn và nạp năng lượng" },
          { "time": "19:00", "endTime": "22:00", "title": "Đốt Lửa Trại & Văn Nghệ", "desc": "Giao lưu văn nghệ bên lửa trại" }
        ]
      },
      {
        "label": "NGÀY 2",
        "date": "Sáng 09/08/2026",
        "items": [
          { "time": "07:30", "endTime": "08:00", "title": "Đón Tiếp & Đăng Ký", "desc": "" }
        ]
      }
    ]
  },
  "gallery": {
    "label": "ALBUM ẢNH",
    "title": "Thư Viện Kỷ Niệm",
    "subtitle": "Ngày Ấy – Bây Giờ",
    "order": []
  },
  "guestbook": {
    "label": "LƯU BÚT",
    "title": "Sổ Lưu Bút Online",
    "subtitle": "Để lại vài dòng nhắn gửi tới bạn bè và thầy cô",
    "messages": []
  },
  "announcements": {
    "label": "THÔNG BÁO",
    "title": "Tin Từ Ban Tổ Chức",
    "items": [
      { "title": "Hạn chốt đăng ký: 01/08/2026", "desc": "Vui lòng đăng ký trước ngày 01/08", "date": "16/03/2026" },
      { "title": "Đồng phục kỷ niệm", "desc": "BTC sẽ có áo đồng phục kỷ niệm 20 năm", "date": "10/03/2026" }
    ]
  },
  "contact": {
    "label": "ĐỊA ĐIỂM",
    "title": "Địa Điểm & Liên Hệ",
    "address": "Trường THPT Yên Dũng Số 2, Yên Dũng, Bắc Giang",
    "phone": "0981 388 562 (Mr Tuyên A1 – Trưởng BTC)",
    "zalo": "Nhóm Hội Ngộ 20 Năm",
    "parking": "Bãi gửi xe miễn phí tại trường",
    "mapUrl": "https://maps.google.com/maps?q=THPT+Yen+Dung+So+2"
  },
  "footer": {
    "text": "© 2026 Hẹn Ước Thanh Xuân · THPT Yên Dũng Số 2 · Niên Khóa 2003-2006"
  }
}
```

---

## 8. VIỆC CẦN LÀM (TODO — theo thứ tự ưu tiên)

- [x] **P0** Rewrite `views/index.ejs` — đúng 9 sections + nav sticky + fixed CTA
- [x] **P0** Rewrite `public/css/style.css` — màu #C9A96E/#FF6B35/#FAF8F5/#1A1A1A
- [x] **P0** Hero: H1 hai dòng (white bold + gold italic), countdown flat style
- [x] **P0** Section title pattern nhất quán (label + title + gold underline + subtitle)
- [x] **P1** Gallery: slideshow carousel thay vì masonry grid
- [x] **P1** Thêm section Lịch trình với activity icons + timeline
- [x] **P1** Thêm section Sổ lưu bút (quote cards)
- [x] **P1** Thêm section Thông báo (list items)
- [x] **P1** Thêm section Địa điểm & Liên hệ (map + info)
- [x] **P2** Scroll-reveal animation (Intersection Observer)
- [x] **P2** Sticky nav highlight active section
- [x] **P2** Tab switcher cho section Đã đăng ký
- [x] **P3** Cập nhật `data/content.json` với full structure mới
- [x] **P3** Cập nhật `routes/admin.js` cho các section mới
- [x] **P3** Cập nhật `views/admin.ejs` — thêm tabs cho tất cả sections

---

*Phân tích từ screenshots thực tế · Cập nhật: 2026-04-23*
