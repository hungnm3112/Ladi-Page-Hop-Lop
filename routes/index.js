const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')

const DATA_FILE = path.join(__dirname, '../data/content.json')
const GALLERY_DIR = path.join(__dirname, '../public/images/gallery')

function getContent() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function saveContent(content) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(content, null, 2), 'utf8')
}

function getGalleryImages(content) {
  if (!fs.existsSync(GALLERY_DIR)) return []
  const allFiles = fs.readdirSync(GALLERY_DIR)
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
  const order = content.gallery?.order || []
  const ordered = [
    ...order.filter(f => allFiles.includes(f)),
    ...allFiles.filter(f => !order.includes(f))
  ]
  const captions = Array.isArray(content.gallery?.captions) ? content.gallery.captions : []
  return ordered.map((filename, index) => ({
    src: `/images/gallery/${filename}`,
    filename,
    captionTitle: captions[index]?.title || captions[index]?.label || `Khoảnh khắc ${index + 1}`,
    captionSubtitle: captions[index]?.subtitle || ''
  }))
}

function formatEventDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return `${days[d.getDay()]}, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
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

function normalizeRegistered(content) {
  const registered = content.registered || {}
  const classOptions = getRegisteredClassOptions(registered)
  const attendees = Array.isArray(registered.attendees)
    ? registered.attendees
        .filter(item => item && item.name)
        .map(item => ({
          name: String(item.name).trim(),
          className: String(item.className || '').trim(),
          phone: String(item.phone || '').trim(),
          note: String(item.note || '').trim(),
          status: String(item.status || 'Chờ xác nhận').trim() || 'Chờ xác nhận',
          registeredAt: String(item.registeredAt || '').trim()
        }))
    : []

  const mergedClassMap = new Map()
  classOptions.forEach(name => mergedClassMap.set(name, 0))

  attendees.forEach(attendee => {
    const key = attendee.className || 'Khác'
    if (!mergedClassMap.has(key)) mergedClassMap.set(key, 0)
    mergedClassMap.set(key, (mergedClassMap.get(key) || 0) + 1)
  })

  const legacyClasses = Array.isArray(registered.classes) ? registered.classes : []
  legacyClasses.forEach(item => {
    const key = String(item?.name || '').trim()
    if (!key || !mergedClassMap.has(key) || attendees.length > 0) return
    mergedClassMap.set(key, Number(item.count) || 0)
  })

  const orderedKeys = [
    ...classOptions,
    ...Array.from(mergedClassMap.keys()).filter(name => !classOptions.includes(name))
  ]

  const normalizedClasses = orderedKeys.map(name => ({
    name,
    count: mergedClassMap.get(name) || 0
  }))

  const countsByClass = attendees.reduce((acc, attendee) => {
    const key = attendee.className || 'Khác'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const total = attendees.length > 0
    ? attendees.length
    : normalizedClasses.reduce((sum, item) => sum + item.count, 0)
  const denominator = classOptions.length || normalizedClasses.length || 0
  const activeClassCount = classOptions.length > 0
    ? classOptions.filter(name => (countsByClass[name] || 0) > 0).length
    : normalizedClasses.filter(item => item.count > 0).length
  const classCount = `${activeClassCount} / ${denominator} lớp tham gia`

  return {
    ...registered,
    total,
    classCount,
    classes: normalizedClasses,
    attendees,
    classOptions
  }
}

router.get('/', (req, res) => {
  const content = getContent()
  const galleryImages = getGalleryImages(content)
  const eventDateFormatted = formatEventDate(content.event?.date)
  const registeredSummary = normalizeRegistered(content)
  const previewMode = req.query.adminPreview === '1'
  res.render('index', { content, galleryImages, eventDateFormatted, registeredSummary, previewMode })
})

router.post('/guestbook', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const className = String(req.body?.className || '').trim()
    const message = String(req.body?.message || '').trim()

    if (!name || !message) {
      return res.status(400).json({ ok: false, message: 'Vui lòng nhập họ tên và lời nhắn.' })
    }

    if (name.length > 60 || className.length > 20 || message.length > 500) {
      return res.status(400).json({ ok: false, message: 'Nội dung vượt quá giới hạn cho phép.' })
    }

    const content = getContent()
    if (!content.guestbook) content.guestbook = {}
    if (!Array.isArray(content.guestbook.messages)) content.guestbook.messages = []

    const createdAt = new Date()
    const newMessage = {
      name,
      className,
      message,
      createdAt: createdAt.toISOString()
    }

    content.guestbook.messages.unshift(newMessage)
    content.guestbook.messages = content.guestbook.messages.slice(0, 60)
    saveContent(content)

    return res.json({
      ok: true,
      message: 'Đã gửi lời nhắn thành công.',
      item: {
        ...newMessage,
        createdAtLabel: createdAt.toLocaleDateString('vi-VN')
      }
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Không thể lưu lời nhắn lúc này.' })
  }
})

router.post('/register', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const className = String(req.body?.className || '').trim()
    const phone = String(req.body?.phone || '').trim()
    const note = String(req.body?.note || '').trim()

    if (!name || !className || !phone) {
      return res.status(400).json({ ok: false, message: 'Vui lòng nhập đủ họ tên, lớp và số điện thoại.' })
    }

    if (name.length > 80 || className.length > 20 || phone.length > 20 || note.length > 300) {
      return res.status(400).json({ ok: false, message: 'Thông tin đăng ký vượt quá giới hạn cho phép.' })
    }

    const content = getContent()
    if (!content.registered) content.registered = {}
    if (!Array.isArray(content.registered.attendees)) content.registered.attendees = []

    const classOptions = getRegisteredClassOptions(content.registered)
    if (classOptions.length > 0 && !classOptions.includes(className)) {
      return res.status(400).json({ ok: false, message: 'Lớp đã chọn không hợp lệ. Vui lòng tải lại trang.' })
    }

    const normalizedPhone = phone.replace(/\s+/g, '')
    const isDuplicate = content.registered.attendees.some(item => {
      return String(item?.phone || '').replace(/\s+/g, '') === normalizedPhone
    })

    if (isDuplicate) {
      return res.status(409).json({ ok: false, message: 'Số điện thoại này đã được đăng ký trước đó.' })
    }

    const now = new Date()
    const attendee = {
      id: `${now.getTime()}`,
      name,
      className,
      phone,
      note,
      status: 'Chờ xác nhận',
      registeredAt: now.toLocaleDateString('vi-VN'),
      createdAt: now.toISOString()
    }

    content.registered.attendees.unshift(attendee)
    saveContent(content)

    return res.json({ ok: true, message: 'Đăng ký thành công.', attendee })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Không thể lưu đăng ký lúc này.' })
  }
})

module.exports = router
