const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const xlsx = require('xlsx')

const DATA_FILE = path.join(__dirname, '../data/content.json')
const GALLERY_DIR = path.join(__dirname, '../public/images/gallery')
const IMAGES_DIR = path.join(__dirname, '../public/images')
const FONTS_DIR = path.join(__dirname, '../public/fonts')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const DONATE_STATUS_PENDING = 'Đăng ký ủng hộ'
const DONATE_STATUS_RECEIVED = 'Đã nhận chuyển khoản'
const SCHEDULE_ACTIVITY_ICON_OPTIONS = [
  { value: 'fa-solid fa-futbol', label: 'Bóng đá' },
  { value: 'fa-solid fa-people-pulling', label: 'Kéo co / kéo cờ' },
  { value: 'fa-solid fa-table-tennis-paddle-ball', label: 'Pickleball / tennis' },
  { value: 'fa-solid fa-fire', label: 'Lửa trại' },
  { value: 'fa-solid fa-music', label: 'Văn nghệ / âm nhạc' },
  { value: 'fa-solid fa-microphone-lines', label: 'MC / phát biểu' },
  { value: 'fa-solid fa-camera', label: 'Chụp ảnh' },
  { value: 'fa-solid fa-school', label: 'Trường lớp' },
  { value: 'fa-solid fa-utensils', label: 'Ăn uống' },
  { value: 'fa-solid fa-champagne-glasses', label: 'Tiệc / liên hoan' },
  { value: 'fa-solid fa-handshake', label: 'Hội ngộ / giao lưu' },
  { value: 'fa-solid fa-star', label: 'Khác' }
]

// Multer: gallery upload
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, GALLERY_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`)
  }
})
const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Chỉ chấp nhận file ảnh'))
  }
})

// Multer: font upload
const FONT_ALLOWED_EXTS = ['.ttf', '.woff', '.woff2', '.otf']
const fontStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(FONTS_DIR)) fs.mkdirSync(FONTS_DIR, { recursive: true })
    cb(null, FONTS_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40)
    cb(null, `${base}_${Date.now()}${ext}`)
  }
})
const fontUpload = multer({
  storage: fontStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (FONT_ALLOWED_EXTS.includes(ext)) cb(null, true)
    else cb(new Error('Chỉ chấp nhận file font (.ttf, .woff, .woff2, .otf)'))
  }
})

// Multer: logo upload (overwrite logo.png)
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => cb(null, 'logo.png')
})
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Chỉ chấp nhận file ảnh'))
  }
})

function getContent() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function saveContent(data) {
  // Backup before save
  if (fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak')
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function getGalleryFiles() {
  if (!fs.existsSync(GALLERY_DIR)) return []
  return fs.readdirSync(GALLERY_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
}

function getGalleryCaptionMap(content, orderedFiles) {
  const captions = Array.isArray(content.gallery?.captions) ? content.gallery.captions : []
  const map = new Map()

  captions.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const filename = String(item.filename || orderedFiles[index] || '').trim()
    if (!filename) return
    map.set(filename, {
      title: String(item.title || item.label || '').trim(),
      subtitle: String(item.subtitle || '').trim()
    })
  })

  return map
}

function getRegisteredClassOptions(registered) {
  if (Array.isArray(registered?.classOptions) && registered.classOptions.length > 0) {
    return registered.classOptions
      .map(item => String(item || '').trim())
      .filter(Boolean)
  }

  if (Array.isArray(registered?.classes) && registered.classes.length > 0) {
    return registered.classes
      .map(item => String(item?.name || '').trim())
      .filter(Boolean)
  }

  return []
}

function parseClassOptionsText(text) {
  return Array.from(new Set(
    String(text || '')
      .split(/\r?\n|,/)
      .map(item => item.trim())
      .filter(Boolean)
  ))
}

function normalizeDonateStatus(status) {
  const value = String(status || '').trim()
  if (value === DONATE_STATUS_RECEIVED || value === 'Đã nhận') return DONATE_STATUS_RECEIVED
  return DONATE_STATUS_PENDING
}

function sanitizeScheduleIcon(icon) {
  const value = String(icon || '').trim().replace(/\s+/g, ' ')
  const found = SCHEDULE_ACTIVITY_ICON_OPTIONS.find(item => item.value === value)
  return found ? found.value : 'fa-solid fa-star'
}

function inferScheduleIcon(label) {
  const normalized = String(label || '').toLowerCase()
  if (normalized.includes('bóng') || normalized.includes('đá')) return 'fa-solid fa-futbol'
  if (normalized.includes('kéo co') || normalized.includes('kéo cờ')) return 'fa-solid fa-people-pulling'
  if (normalized.includes('pickleball') || normalized.includes('tennis')) return 'fa-solid fa-table-tennis-paddle-ball'
  if (normalized.includes('lửa trại') || normalized.includes('lửa')) return 'fa-solid fa-fire'
  if (normalized.includes('văn nghệ') || normalized.includes('karaoke') || normalized.includes('nhạc')) return 'fa-solid fa-music'
  if (normalized.includes('ẩm thực') || normalized.includes('ăn')) return 'fa-solid fa-utensils'
  if (normalized.includes('gặp mặt') || normalized.includes('hội ngộ')) return 'fa-solid fa-handshake'
  return 'fa-solid fa-star'
}

function normalizeScheduleActivities(schedule) {
  const rawActivities = Array.isArray(schedule?.activities) ? schedule.activities : []

  return rawActivities
    .map(item => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const label = String(item.label || '').trim()
        if (!label) return null
        return {
          icon: sanitizeScheduleIcon(item.icon),
          label
        }
      }

      const raw = String(item || '').trim()
      if (!raw) return null
      const label = raw.replace(/^[^\p{L}\p{N}]+/u, '').trim() || raw
      return {
        icon: inferScheduleIcon(label),
        label
      }
    })
    .filter(Boolean)
}

function requireAdmin(req, res, next) {
  return next()
}

// ── Auth ──────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin')
  res.render('login', { error: null })
})

router.post('/login', (req, res) => {
  const { password } = req.body
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true
    res.redirect('/admin')
  } else {
    res.render('login', { error: 'Mật khẩu không đúng. Vui lòng thử lại.' })
  }
})

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'))
})

// ── Dashboard ─────────────────────────────────────────
router.get('/', requireAdmin, (req, res) => {
  const content = getContent()
  const allFiles = getGalleryFiles()
  const order = content.gallery?.order || []
  const orderedFiles = [
    ...order.filter(f => allFiles.includes(f)),
    ...allFiles.filter(f => !order.includes(f))
  ]
  const galleryCaptionMap = getGalleryCaptionMap(content, orderedFiles)
  const galleryFiles = orderedFiles.map(f => {
    const caption = galleryCaptionMap.get(f) || {}
    return {
      filename: f,
      url: `/images/gallery/${f}`,
      title: caption.title || '',
      subtitle: caption.subtitle || ''
    }
  })
  const registeredClassText = getRegisteredClassOptions(content.registered).join('\n')
  const scheduleActivities = normalizeScheduleActivities(content.schedule)
  const scheduleActivityIconsJson = JSON.stringify(SCHEDULE_ACTIVITY_ICON_OPTIONS).replace(/</g, '\\u003c')
  const contentJson = JSON.stringify(content).replace(/</g, '\\u003c')
  const galleryFilesJson = JSON.stringify(galleryFiles).replace(/</g, '\\u003c')
  res.render('admin', { content, galleryFiles, registeredClassText, scheduleActivities, scheduleActivityIconsJson, contentJson, galleryFilesJson })
})

// ── Save content ──────────────────────────────────────
router.post('/save', requireAdmin, (req, res) => {
  try {
    const content = getContent()
    const { section, ...fields } = req.body
    if (section === 'appearance' && !content.appearance) content.appearance = {}
    if (!content[section]) return res.json({ ok: false, message: 'Section không hợp lệ' })
    Object.assign(content[section], fields)
    saveContent(content)
    res.json({ ok: true, message: 'Đã lưu thành công!' })
  } catch (err) {
    res.json({ ok: false, message: 'Lỗi lưu dữ liệu: ' + err.message })
  }
})

router.post('/registered-settings', requireAdmin, (req, res) => {
  try {
    const content = getContent()
    if (!content.registered) content.registered = {}

    const classOptions = parseClassOptionsText(req.body?.classOptionsText)
    if (classOptions.length === 0) {
      return res.json({ ok: false, message: 'Danh sách lớp không được để trống.' })
    }

    content.registered.label = String(req.body?.label || content.registered.label || 'DANH SÁCH').trim()
    content.registered.title = String(req.body?.title || content.registered.title || 'Đã Đăng Ký Tham Gia').trim()
    content.registered.subtitle = String(req.body?.subtitle || content.registered.subtitle || '').trim()
    content.registered.classOptions = classOptions
    content.registered.classes = classOptions.map(name => ({ name, count: 0 }))
    if (!Array.isArray(content.registered.attendees)) content.registered.attendees = []

    saveContent(content)
    return res.json({ ok: true, message: 'Đã lưu cấu hình danh sách lớp.' })
  } catch (error) {
    return res.json({ ok: false, message: 'Không thể lưu danh sách lớp: ' + error.message })
  }
})

// ── Attendees management ──────────────────────────────
router.post('/schedule-activities', requireAdmin, (req, res) => {
  try {
    const content = getContent()
    if (!content.schedule) content.schedule = {}

    const activities = Array.isArray(req.body?.activities) ? req.body.activities : []
    const normalizedActivities = activities
      .map(item => ({
        icon: sanitizeScheduleIcon(item?.icon),
        label: String(item?.label || '').trim().slice(0, 40)
      }))
      .filter(item => item.label)

    if (normalizedActivities.length === 0) {
      return res.json({ ok: false, message: 'Vui lòng thêm ít nhất 1 hoạt động cho chương trình.' })
    }

    content.schedule.activities = normalizedActivities
    saveContent(content)
    return res.json({ ok: true, message: 'Đã lưu danh sách hoạt động chương trình.' })
  } catch (error) {
    return res.json({ ok: false, message: 'Không thể lưu hoạt động chương trình: ' + error.message })
  }
})

router.post('/attendees/:id', requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    const name = String(req.body?.name || '').trim()
    const className = String(req.body?.className || '').trim()
    const phone = String(req.body?.phone || '').trim()
    const note = String(req.body?.note || '').trim()
    const status = String(req.body?.status || '').trim()

    if (!id) return res.json({ ok: false, message: 'ID không hợp lệ.' })
    if (!name || !className || !phone) {
      return res.json({ ok: false, message: 'Vui lòng nhập đủ họ tên, lớp và số điện thoại.' })
    }

    if (name.length > 80 || className.length > 20 || phone.length > 20 || note.length > 300 || status.length > 40) {
      return res.json({ ok: false, message: 'Thông tin đăng ký vượt quá giới hạn cho phép.' })
    }

    const content = getContent()
    if (!content.registered || !Array.isArray(content.registered.attendees)) {
      return res.json({ ok: false, message: 'Chưa có danh sách đăng ký.' })
    }

    const attendee = content.registered.attendees.find(item => String(item?.id || '') === id)
    if (!attendee) return res.json({ ok: false, message: 'Không tìm thấy người đăng ký.' })

    const classOptions = getRegisteredClassOptions(content.registered)
    if (classOptions.length > 0 && !classOptions.includes(className)) {
      return res.json({ ok: false, message: 'Lớp đã chọn không hợp lệ.' })
    }

    attendee.name = name
    attendee.className = className
    attendee.phone = phone
    attendee.note = note
    attendee.status = status || attendee.status || 'Chờ xác nhận'
    attendee.updatedAt = new Date().toISOString()

    saveContent(content)
    return res.json({ ok: true, message: 'Đã cập nhật người đăng ký.', attendee })
  } catch (err) {
    return res.json({ ok: false, message: 'Không thể cập nhật người đăng ký: ' + err.message })
  }
})

router.post('/attendees/:id/status', requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    const status = String(req.body?.status || '').trim()
    if (!id) return res.json({ ok: false, message: 'ID không hợp lệ.' })
    if (!status || status.length > 40) {
      return res.json({ ok: false, message: 'Trạng thái không hợp lệ.' })
    }

    const content = getContent()
    if (!content.registered || !Array.isArray(content.registered.attendees)) {
      return res.json({ ok: false, message: 'Chưa có danh sách đăng ký.' })
    }

    const attendee = content.registered.attendees.find(item => String(item?.id || '') === id)
    if (!attendee) return res.json({ ok: false, message: 'Không tìm thấy người đăng ký.' })

    attendee.status = status
    saveContent(content)
    return res.json({ ok: true, message: 'Đã cập nhật trạng thái.', attendee })
  } catch (err) {
    return res.json({ ok: false, message: 'Không thể cập nhật: ' + err.message })
  }
})

router.post('/donations/:id/status', requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    const status = normalizeDonateStatus(req.body?.status)
    if (!id) return res.json({ ok: false, message: 'ID không hợp lệ.' })

    const content = getContent()
    if (!content.donate || !Array.isArray(content.donate.entries)) {
      return res.json({ ok: false, message: 'Chưa có danh sách ủng hộ.' })
    }

    const entry = content.donate.entries.find(item => String(item?.id || '') === id)
    if (!entry) return res.json({ ok: false, message: 'Không tìm thấy khoản ủng hộ.' })

    entry.status = status
    saveContent(content)
    return res.json({ ok: true, message: 'Đã cập nhật trạng thái ủng hộ.', entry })
  } catch (err) {
    return res.json({ ok: false, message: 'Không thể cập nhật trạng thái ủng hộ: ' + err.message })
  }
})

router.post('/donations/:id', requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    const type = req.body?.type === 'organization' ? 'organization' : 'personal'
    const name = String(req.body?.name || '').trim()
    const className = String(req.body?.className || '').trim()
    const contactName = String(req.body?.contactName || '').trim()
    const organizationName = String(req.body?.organizationName || '').trim()
    const message = String(req.body?.message || '').trim()
    const anonymous = req.body?.anonymous === true || req.body?.anonymous === 'true' || req.body?.anonymous === 'on' || req.body?.anonymous === '1'
    const status = normalizeDonateStatus(req.body?.status)
    const amount = parseInt(String(req.body?.amount || '').replace(/[^\d]/g, ''), 10) || 0

    if (!id) return res.json({ ok: false, message: 'ID không hợp lệ.' })
    if (amount <= 0) {
      return res.json({ ok: false, message: 'Vui lòng nhập số tiền đóng góp hợp lệ.' })
    }
    if (amount > 1000000000) {
      return res.json({ ok: false, message: 'Số tiền đóng góp vượt quá giới hạn cho phép.' })
    }
    if (message.length > 300) {
      return res.json({ ok: false, message: 'Lời nhắn vượt quá giới hạn cho phép.' })
    }

    const content = getContent()
    if (!content.donate || !Array.isArray(content.donate.entries)) {
      return res.json({ ok: false, message: 'Chưa có danh sách ủng hộ.' })
    }

    const entry = content.donate.entries.find(item => String(item?.id || '') === id)
    if (!entry) return res.json({ ok: false, message: 'Không tìm thấy khoản ủng hộ.' })

    if (type === 'personal') {
      if (!name || !className) {
        return res.json({ ok: false, message: 'Vui lòng nhập tên cá nhân và lớp.' })
      }
      if (name.length > 80) {
        return res.json({ ok: false, message: 'Thông tin cá nhân vượt quá giới hạn cho phép.' })
      }
    } else {
      if (!contactName || !organizationName) {
        return res.json({ ok: false, message: 'Vui lòng nhập người liên hệ và tên công ty / tập thể.' })
      }
      if (contactName.length > 80 || organizationName.length > 120) {
        return res.json({ ok: false, message: 'Thông tin công ty / tập thể vượt quá giới hạn cho phép.' })
      }
    }

    if (className.length > 20) {
      return res.json({ ok: false, message: 'Tên lớp vượt quá giới hạn cho phép.' })
    }

    if (className) {
      const classOptions = getRegisteredClassOptions(content.registered)
      if (classOptions.length > 0 && !classOptions.includes(className)) {
        return res.json({ ok: false, message: 'Lớp đã chọn không hợp lệ.' })
      }
    }

    entry.type = type
    entry.name = type === 'personal' ? name : ''
    entry.className = className
    entry.contactName = type === 'organization' ? contactName : ''
    entry.organizationName = type === 'organization' ? organizationName : ''
    entry.amount = amount
    entry.message = message
    entry.anonymous = anonymous
    entry.status = status
    entry.updatedAt = new Date().toISOString()

    saveContent(content)
    return res.json({ ok: true, message: 'Đã cập nhật khoản ủng hộ.', entry })
  } catch (err) {
    return res.json({ ok: false, message: 'Không thể cập nhật khoản ủng hộ: ' + err.message })
  }
})

router.delete('/attendees/:id', requireAdmin, (req, res) => {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) return res.json({ ok: false, message: 'ID không hợp lệ.' })

    const content = getContent()
    if (!content.registered || !Array.isArray(content.registered.attendees)) {
      return res.json({ ok: false, message: 'Chưa có danh sách đăng ký.' })
    }

    const before = content.registered.attendees.length
    content.registered.attendees = content.registered.attendees.filter(item => String(item?.id || '') !== id)
    if (content.registered.attendees.length === before) {
      return res.json({ ok: false, message: 'Không tìm thấy người đăng ký.' })
    }

    saveContent(content)
    return res.json({ ok: true, message: 'Đã xóa người đăng ký.' })
  } catch (err) {
    return res.json({ ok: false, message: 'Không thể xóa: ' + err.message })
  }
})

router.post('/save-full-content', requireAdmin, (req, res) => {
  try {
    const nextContent = req.body?.content

    if (!nextContent || typeof nextContent !== 'object' || Array.isArray(nextContent)) {
      return res.json({ ok: false, message: 'Du lieu content khong hop le.' })
    }

    saveContent(nextContent)
    return res.json({ ok: true, message: 'Da luu toan bo noi dung content.json.' })
  } catch (error) {
    return res.json({ ok: false, message: 'Khong the luu content day du: ' + error.message })
  }
})

// ── Export Excel ──────────────────────────────────────
router.get('/export/attendees/excel', requireAdmin, (req, res) => {
  try {
    const content = getContent()
    if (!content.registered || !Array.isArray(content.registered.attendees)) {
      return res.status(400).send('Chưa có danh sách đăng ký.')
    }

    const attendees = content.registered.attendees
    
    const grouped = {}
    const allData = []

    attendees.forEach(item => {
      const className = item.className || 'Khác'
      const row = {
        'Họ tên': item.name || '',
        'Lớp': item.className || '',
        'Size áo': item.shirtSize || '',
        'SĐT': item.phone || '',
        'Ghi chú': item.note || '',
        'Trạng thái': item.status || 'Chờ xác nhận',
        'Ngày đăng ký': item.registeredAt || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '')
      }

      if (!grouped[className]) grouped[className] = []
      grouped[className].push(row)
      allData.push(row)
    })

    const wb = xlsx.utils.book_new()
    
    if (allData.length > 0) {
      const wsAll = xlsx.utils.json_to_sheet(allData)
      xlsx.utils.book_append_sheet(wb, wsAll, 'Tổng hợp')
    }

    for (const className in grouped) {
      const safeName = className.replace(/[?*\/\[\]\\]/g, '').slice(0, 31) || 'Sheet'
      const ws = xlsx.utils.json_to_sheet(grouped[className])
      xlsx.utils.book_append_sheet(wb, ws, safeName)
    }

    if (Object.keys(grouped).length === 0) {
      const ws = xlsx.utils.json_to_sheet([{ 'Thông báo': 'Chưa có người đăng ký nào' }])
      xlsx.utils.book_append_sheet(wb, ws, 'Danh sách')
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })
    
    res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_dang_ky.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return res.send(buffer)
  } catch (err) {
    console.error(err)
    return res.status(500).send('Không thể xuất file: ' + err.message)
  }
})

// ── Upload logo ───────────────────────────────────────
router.post('/upload-logo', requireAdmin, logoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.json({ ok: false, message: 'Không có file nào được upload' })
  res.json({ ok: true, url: `/images/logo.png?t=${Date.now()}` })
})

// ── Upload gallery images ─────────────────────────────
router.post('/upload-gallery', requireAdmin, galleryUpload.array('images', 30), (req, res) => {
  if (!req.files?.length) return res.json({ ok: false, message: 'Không có file nào được upload' })
  const content = getContent()
  const newFiles = req.files.map(f => f.filename)
  if (!content.gallery.order) content.gallery.order = []
  content.gallery.order = [...content.gallery.order, ...newFiles]
  saveContent(content)
  const urls = req.files.map(f => ({ filename: f.filename, url: `/images/gallery/${f.filename}` }))
  res.json({ ok: true, urls })
})

// ── Delete gallery image ──────────────────────────────
router.delete('/gallery/:filename', requireAdmin, (req, res) => {
  try {
    const filename = path.basename(req.params.filename) // prevent path traversal
    const filepath = path.join(GALLERY_DIR, filename)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    // Remove from order
    const content = getContent()
    content.gallery.order = (content.gallery.order || []).filter(f => f !== filename)
    content.gallery.captions = (content.gallery.captions || []).filter(item => {
      return path.basename(String(item?.filename || '')) !== filename
    })
    saveContent(content)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, message: err.message })
  }
})

// ── Save gallery order ────────────────────────────────
router.post('/gallery-order', requireAdmin, (req, res) => {
  try {
    const { order } = req.body
    if (!Array.isArray(order)) return res.json({ ok: false, message: 'Invalid order' })
    const content = getContent()
    content.gallery.order = order.map(f => path.basename(f)) // sanitize
    saveContent(content)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, message: err.message })
  }
})

router.post('/gallery-captions', requireAdmin, (req, res) => {
  try {
    const captions = Array.isArray(req.body?.captions) ? req.body.captions : []
    const content = getContent()
    const allFiles = new Set(getGalleryFiles())

    if (!content.gallery) content.gallery = {}

    content.gallery.captions = captions
      .map(item => ({
        filename: path.basename(String(item?.filename || '').trim()),
        title: String(item?.title || '').trim().slice(0, 80),
        subtitle: String(item?.subtitle || '').trim().slice(0, 160)
      }))
      .filter(item => item.filename && allFiles.has(item.filename) && (item.title || item.subtitle))

    saveContent(content)
    return res.json({ ok: true, message: 'Đã lưu nhãn ảnh gallery.' })
  } catch (err) {
    return res.json({ ok: false, message: err.message })
  }
})

// ── Upload custom font ────────────────────────────────
router.post('/upload-font', requireAdmin, fontUpload.single('font'), (req, res) => {
  if (!req.file) return res.json({ ok: false, message: 'Không có file font nào được upload' })
  const content = getContent()
  if (!content.appearance) content.appearance = {}
  const familyName = String(req.body?.fontFamily || '')
    .trim()
    .replace(/['"<>\\]/g, '')
    .slice(0, 60) || path.basename(req.file.originalname, path.extname(req.file.originalname))
  content.appearance.customFont = { family: familyName, filename: req.file.filename }
  saveContent(content)
  res.json({ ok: true, family: familyName, filename: req.file.filename })
})

// ── Delete custom font ────────────────────────────────
router.delete('/fonts/:filename', requireAdmin, (req, res) => {
  try {
    const filename = path.basename(req.params.filename)
    const filepath = path.join(FONTS_DIR, filename)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    const content = getContent()
    if (!content.appearance) content.appearance = {}
    if (content.appearance.customFont?.filename === filename) {
      delete content.appearance.customFont
    }
    saveContent(content)
    res.json({ ok: true })
  } catch (err) {
    res.json({ ok: false, message: err.message })
  }
})

router.use((err, req, res, next) => {
  if (!err) return next()

  if (res.headersSent) return next(err)

  return res.status(400).json({
    ok: false,
    message: err.message || 'Yeu cau khong hop le.'
  })
})

module.exports = router
