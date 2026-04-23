const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const DATA_FILE = path.join(__dirname, '../data/content.json')
const GALLERY_DIR = path.join(__dirname, '../public/images/gallery')
const IMAGES_DIR = path.join(__dirname, '../public/images')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

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
  const galleryFiles = [
    ...order.filter(f => allFiles.includes(f)),
    ...allFiles.filter(f => !order.includes(f))
  ].map(f => ({ filename: f, url: `/images/gallery/${f}` }))
  const registeredClassText = getRegisteredClassOptions(content.registered).join('\n')
  const contentJson = JSON.stringify(content).replace(/</g, '\\u003c')
  const galleryFilesJson = JSON.stringify(galleryFiles).replace(/</g, '\\u003c')
  res.render('admin', { content, galleryFiles, registeredClassText, contentJson, galleryFilesJson })
})

// ── Save content ──────────────────────────────────────
router.post('/save', requireAdmin, (req, res) => {
  try {
    const content = getContent()
    const { section, ...fields } = req.body
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

router.use((err, req, res, next) => {
  if (!err) return next()

  if (res.headersSent) return next(err)

  return res.status(400).json({
    ok: false,
    message: err.message || 'Yeu cau khong hop le.'
  })
})

module.exports = router
