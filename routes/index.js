const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const DATA_FILE = path.join(__dirname, '../data/content.json')
const GALLERY_DIR = path.join(__dirname, '../public/images/gallery')
const DONATE_DEFAULTS = {
  label: 'ỦNG HỘ',
  title: 'Đóng Góp Cho',
  titleAccent: 'Ngày Hội Ngộ',
  subtitle: 'Mỗi đóng góp đều ý nghĩa, góp phần tạo nên một ngày hội ngộ trọn vẹn và đáng nhớ.',
  ctaText: 'Đóng Góp Ngay',
  rankingLabel: 'BẢNG XẾP HẠNG',
  rankingTitle: 'Danh Sách Đóng Góp',
  rankingSubtitle: 'Theo lớp, cá nhân và công ty / tập thể',
  quickAmounts: [200000, 500000, 1000000, 2000000, 5000000, 10000000],
  entries: []
}
const DONATE_STATUS_PENDING = 'Đã ủng hộ'
const DONATE_STATUS_RECEIVED = 'Đã nhận'

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(GALLERY_DIR, { recursive: true })
    cb(null, GALLERY_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`)
  }
})

const galleryUpload = multer({
  storage: galleryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3
  },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.'))
  }
})

function normalizeDonateStatus(status) {
  const value = String(status || '').trim()
  return value === DONATE_STATUS_RECEIVED ? DONATE_STATUS_RECEIVED : DONATE_STATUS_PENDING
}

const SCHEDULE_ACTIVITY_ICON_OPTIONS = [
  'fa-solid fa-futbol',
  'fa-solid fa-people-pulling',
  'fa-solid fa-table-tennis-paddle-ball',
  'fa-solid fa-fire',
  'fa-solid fa-music',
  'fa-solid fa-microphone-lines',
  'fa-solid fa-camera',
  'fa-solid fa-school',
  'fa-solid fa-utensils',
  'fa-solid fa-champagne-glasses',
  'fa-solid fa-handshake',
  'fa-solid fa-star'
]

function getContent() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

function saveContent(content) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(content, null, 2), 'utf8')
}

function removeUploadedFiles(files) {
  if (!Array.isArray(files)) return
  files.forEach(file => {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path)
  })
}

function sanitizeScheduleIcon(icon) {
  const value = String(icon || '').trim().replace(/\s+/g, ' ')
  return SCHEDULE_ACTIVITY_ICON_OPTIONS.includes(value) ? value : 'fa-solid fa-star'
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
  const captionMap = new Map()
  captions.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const filename = String(item.filename || ordered[index] || '').trim()
    if (!filename) return
    captionMap.set(filename, {
      title: String(item.title || item.label || '').trim(),
      subtitle: String(item.subtitle || '').trim()
    })
  })
  return ordered.map((filename, index) => ({
    ...(captionMap.get(filename) || {}),
    src: `/images/gallery/${filename}`,
    filename,
    captionTitle: (captionMap.get(filename) || {}).title || `Khoảnh khắc ${index + 1}`,
    captionSubtitle: (captionMap.get(filename) || {}).subtitle || ''
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

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString('vi-VN')} VND`
}

function normalizeDonate(content) {
  const rawDonate = content.donate || {}
  const classOptions = getRegisteredClassOptions(content.registered)
  const quickAmounts = Array.isArray(rawDonate.quickAmounts) && rawDonate.quickAmounts.length > 0
    ? rawDonate.quickAmounts
        .map(item => Number(item) || 0)
        .filter(item => item > 0)
    : DONATE_DEFAULTS.quickAmounts.slice()

  const entries = Array.isArray(rawDonate.entries)
    ? rawDonate.entries
        .map(item => {
          const type = item?.type === 'organization' ? 'organization' : 'personal'
          const amount = parseInt(String(item?.amount || 0).replace(/[^\d]/g, ''), 10) || 0
          return {
            id: String(item?.id || '').trim(),
            type,
            name: String(item?.name || '').trim(),
            className: String(item?.className || '').trim(),
            contactName: String(item?.contactName || '').trim(),
            organizationName: String(item?.organizationName || '').trim(),
            amount,
            message: String(item?.message || '').trim(),
            anonymous: Boolean(item?.anonymous),
            status: normalizeDonateStatus(item?.status),
            createdAt: String(item?.createdAt || '').trim()
          }
        })
        .filter(item => item.amount > 0)
    : []
  const receivedEntries = entries.filter(item => item.status === DONATE_STATUS_RECEIVED)

  const classMap = new Map()
  classOptions.forEach((name, index) => {
    classMap.set(name, { name, amount: 0, donorCount: 0, order: index })
  })

  entries
    .filter(item => item.type === 'personal')
    .forEach(item => {
      const key = item.className || 'Khác'
      if (!classMap.has(key)) {
        classMap.set(key, { name: key, amount: 0, donorCount: 0, order: classMap.size })
      }
      const row = classMap.get(key)
      row.amount += item.amount
      row.receivedAmount = (row.receivedAmount || 0) + (item.status === DONATE_STATUS_RECEIVED ? item.amount : 0)
      row.donorCount += 1
      row.receivedCount = (row.receivedCount || 0) + (item.status === DONATE_STATUS_RECEIVED ? 1 : 0)
    })

  const classLeaderboard = Array.from(classMap.values())
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return a.order - b.order
    })
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      amount: item.amount,
      receivedAmount: item.receivedAmount || 0,
      donorCount: item.donorCount,
      receivedCount: item.receivedCount || 0,
      amountLabel: item.amount > 0 ? formatMoney(item.amount) : '–',
      donorLabel: item.donorCount > 0 ? `${item.donorCount} người` : '–',
      statusLabel: item.donorCount > 0
        ? ((item.receivedCount || 0) === item.donorCount ? DONATE_STATUS_RECEIVED : ((item.receivedCount || 0) > 0 ? `${item.receivedCount} / ${item.donorCount} đã nhận` : DONATE_STATUS_PENDING))
        : '–'
    }))

  const personalLeaderboard = entries
    .filter(item => item.type === 'personal')
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return String(b.createdAt).localeCompare(String(a.createdAt))
    })
    .map((item, index) => ({
      rank: index + 1,
      displayName: item.anonymous ? 'Ẩn danh' : (item.name || 'Cựu học sinh'),
      className: item.className || 'Khác',
      amount: item.amount,
      amountLabel: formatMoney(item.amount),
      message: item.message || '',
      status: item.status,
      createdAtLabel: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''
    }))

  const organizationLeaderboard = entries
    .filter(item => item.type === 'organization')
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return String(b.createdAt).localeCompare(String(a.createdAt))
    })
    .map((item, index) => ({
      rank: index + 1,
      organizationName: item.anonymous ? 'Ẩn danh' : (item.organizationName || 'Tập thể'),
      contactName: item.anonymous ? '' : (item.contactName || ''),
      amount: item.amount,
      amountLabel: formatMoney(item.amount),
      message: item.message || '',
      status: item.status,
      createdAtLabel: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : ''
    }))

  const totalAmount = receivedEntries.reduce((sum, item) => sum + item.amount, 0)

  return {
    ...DONATE_DEFAULTS,
    ...rawDonate,
    quickAmounts,
    entries,
    classOptions,
    totalAmount,
    totalAmountLabel: formatMoney(totalAmount),
    donorCount: receivedEntries.length,
    classLeaderboard,
    personalLeaderboard,
    organizationLeaderboard
  }
}

router.get('/', (req, res) => {
  const content = getContent()
  const galleryImages = getGalleryImages(content)
  const eventDateFormatted = formatEventDate(content.event?.date)
  const registeredSummary = normalizeRegistered(content)
  const donateSummary = normalizeDonate(content)
  const scheduleActivities = normalizeScheduleActivities(content.schedule)
  const previewMode = req.query.adminPreview === '1'
  res.render('index', { content, galleryImages, eventDateFormatted, registeredSummary, donateSummary, scheduleActivities, previewMode })
})

router.get('/donate', (req, res) => {
  const content = getContent()
  const donateSummary = normalizeDonate(content)
  res.render('donate', { content, donateSummary })
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

router.post('/donate', (req, res) => {
  try {
    const type = req.body?.type === 'organization' ? 'organization' : 'personal'
    const name = String(req.body?.name || '').trim()
    const className = String(req.body?.className || '').trim()
    const contactName = String(req.body?.contactName || '').trim()
    const organizationName = String(req.body?.organizationName || '').trim()
    const message = String(req.body?.message || '').trim()
    const anonymous = req.body?.anonymous === true || req.body?.anonymous === 'true' || req.body?.anonymous === 'on' || req.body?.anonymous === '1'
    const amount = parseInt(String(req.body?.amount || '').replace(/[^\d]/g, ''), 10) || 0

    if (amount <= 0) {
      return res.status(400).json({ ok: false, message: 'Vui lòng nhập số tiền đóng góp hợp lệ.' })
    }

    if (amount > 1000000000) {
      return res.status(400).json({ ok: false, message: 'Số tiền đóng góp vượt quá giới hạn cho phép.' })
    }

    if (message.length > 300) {
      return res.status(400).json({ ok: false, message: 'Lời nhắn vượt quá giới hạn cho phép.' })
    }

    const content = getContent()
    if (!content.donate) content.donate = {}
    if (!Array.isArray(content.donate.entries)) content.donate.entries = []

    if (type === 'personal') {
      if (!name || !className) {
        return res.status(400).json({ ok: false, message: 'Vui lòng nhập họ tên và lớp.' })
      }

      if (name.length > 80 || className.length > 20) {
        return res.status(400).json({ ok: false, message: 'Thông tin cá nhân vượt quá giới hạn cho phép.' })
      }

      const classOptions = getRegisteredClassOptions(content.registered)
      if (classOptions.length > 0 && !classOptions.includes(className)) {
        return res.status(400).json({ ok: false, message: 'Lớp đã chọn không hợp lệ. Vui lòng tải lại trang.' })
      }
    } else {
      if (!contactName || !organizationName) {
        return res.status(400).json({ ok: false, message: 'Vui lòng nhập người liên hệ và tên tổ chức.' })
      }

      if (contactName.length > 80 || organizationName.length > 120) {
        return res.status(400).json({ ok: false, message: 'Thông tin công ty / tập thể vượt quá giới hạn cho phép.' })
      }
    }

    const now = new Date()
    const entry = {
      id: `${now.getTime()}`,
      type,
      name,
      className,
      contactName,
      organizationName,
      amount,
      message,
      anonymous,
      status: DONATE_STATUS_PENDING,
      createdAt: now.toISOString()
    }

    content.donate.entries.unshift(entry)
    saveContent(content)

    return res.json({
      ok: true,
      message: 'Đã ghi nhận thông tin đóng góp.',
      entry
    })
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Không thể lưu thông tin đóng góp lúc này.' })
  }
})

router.post('/gallery-memory', galleryUpload.array('images', 3), (req, res) => {
  try {
    const name = String(req.body?.name || '').trim()
    const className = String(req.body?.className || '').trim()
    const description = String(req.body?.description || '').trim()

    if (!name || !className || !description) {
      removeUploadedFiles(req.files)
      return res.status(400).json({ ok: false, message: 'Vui lòng nhập họ tên, lớp và mô tả.' })
    }

    if (!req.files?.length) {
      return res.status(400).json({ ok: false, message: 'Vui lòng chọn ít nhất 1 ảnh.' })
    }

    if (name.length > 80 || className.length > 30 || description.length > 160) {
      removeUploadedFiles(req.files)
      return res.status(400).json({ ok: false, message: 'Thông tin ảnh vượt quá giới hạn cho phép.' })
    }

    const content = getContent()
    if (!content.gallery) content.gallery = {}
    if (!Array.isArray(content.gallery.order)) content.gallery.order = []
    if (!Array.isArray(content.gallery.captions)) content.gallery.captions = []

    const now = new Date()
    const label = `${name} - ${className} - ${description}`
    const items = req.files.map(file => ({
      filename: file.filename,
      title: label,
      subtitle: '',
      name,
      className,
      description,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      source: 'public-upload',
      uploadedAt: now.toISOString()
    }))

    content.gallery.order = [...items.map(item => item.filename), ...content.gallery.order]
    content.gallery.captions = [
      ...items,
      ...content.gallery.captions.filter(item => !items.some(uploaded => uploaded.filename === item?.filename))
    ]

    saveContent(content)

    return res.json({
      ok: true,
      message: 'Đã gửi ảnh kỷ niệm thành công.',
      items: items.map(item => ({
        filename: item.filename,
        src: `/images/gallery/${item.filename}`,
        captionTitle: item.title,
        captionSubtitle: item.subtitle
      }))
    })
  } catch (error) {
    removeUploadedFiles(req.files)
    return res.status(500).json({ ok: false, message: 'Không thể lưu ảnh kỷ niệm lúc này.' })
  }
})

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ ok: false, message: 'Mỗi ảnh tối đa 5MB.' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ ok: false, message: 'Chỉ được gửi tối đa 3 ảnh mỗi lần.' })
    }
    return res.status(400).json({ ok: false, message: 'Không thể upload ảnh. Vui lòng thử lại.' })
  }

  if (err) {
    return res.status(400).json({ ok: false, message: err.message || 'File ảnh không hợp lệ.' })
  }

  return next()
})

module.exports = router
