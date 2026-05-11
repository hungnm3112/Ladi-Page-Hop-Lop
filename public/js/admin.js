;(function () {
  'use strict'

  var SECTION_CONFIGS = {
    hero: { label: 'Hero', description: 'Sửa logo, tiêu đề chính, mô tả và các nút hành động.', source: 'hero' },
    about: { label: 'Giới thiệu', description: 'Sửa thư ngỏ, subtitle và chữ ký.', source: 'about' },
    event: { label: 'Sự kiện', description: 'Ngày giờ, địa điểm, liên hệ và đối tượng.', source: 'event' },
    schedule: { label: 'Lịch trình', description: 'Sửa các ngày, hoạt động và timeline.', source: 'schedule' },
    registered: { label: 'Đăng ký', description: 'Sửa danh sách lớp, thống kê và người đăng ký.', source: 'registered' },
    gallery: { label: 'Thư viện ảnh', description: 'Sửa tiêu đề gallery và quản lý hình ảnh.', source: 'gallery' },
    donate: { label: 'Ủng hộ', description: 'Sửa nội dung trang ủng hộ, mức tiền gợi ý và danh sách đóng góp.', source: 'donate' },
    guestbook: { label: 'Lưu bút', description: 'Sửa tiêu đề và danh sách lời nhắn.', source: 'guestbook' },
    announcements: { label: 'Thông báo', description: 'Sửa tin từ ban tổ chức.', source: 'announcements' },
    contact: { label: 'Liên hệ', description: 'Sửa địa chỉ, số điện thoại, bản đồ và thông tin hỗ trợ.', source: 'contact' },
    footer: { label: 'Footer', description: 'Sửa nội dung chân trang.', source: 'footer' },
    appearance: { label: 'Giao diện', description: 'Chọn font chữ hiển thị cho toàn bộ website.', source: 'appearance' },
    cta: { label: 'Dữ liệu CTA', description: 'Sửa dữ liệu CTA trong content.json.', source: 'cta' },
    'full-content': { label: 'Toàn bộ content.json', description: 'Form đầy đủ cho tất cả section.', source: null, wide: true }
  }

  var fullContentInitial = null
  var fullContentState = null
  var galleryFilesState = []
  var currentTarget = 'hero'
  var editorDirty = false
  var pendingPreviewHighlight = null
  var dragSrc = null
  var dragSourceThumb = null
  var scheduleActivityIconOptions = []
  var iconPickerState = { onPick: null, currentValue: '', trigger: null }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function showToast(msg, type) {
    type = type || 'success'
    var container = document.getElementById('toast-container')
    if (!container) return
    var el = document.createElement('div')
    el.className = 'toast ' + type
    el.innerHTML = '<span class="toast-icon">' + (type === 'success' ? 'OK' : 'X') + '</span><span>' + esc(msg) + '</span>'
    container.appendChild(el)
    setTimeout(function () {
      el.style.opacity = '0'
      setTimeout(function () { el.remove() }, 300)
    }, 3200)
  }

  async function parseJsonResponse(res) {
    if (res.redirected) {
      throw new Error('Yêu cầu bị chuyển hướng. Vui lòng tải lại trang.')
    }

    var contentType = String(res.headers.get('content-type') || '')
    if (contentType.indexOf('application/json') !== -1) {
      return res.json()
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang.')
    }

    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.')
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function parseJsonScript(id, fallback) {
    var el = document.getElementById(id)
    if (!el) return fallback
    try {
      return JSON.parse(el.textContent || '')
    } catch (error) {
      return fallback
    }
  }

  function parseClassOptionsText(text) {
    var seen = {}
    return String(text || '')
      .split(/\r?\n|,/)
      .map(function (item) { return item.trim() })
      .filter(function (item) {
        if (!item || seen[item]) return false
        seen[item] = true
        return true
      })
  }

  function normalizeScheduleActivityItem(item) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return {
        icon: String(item.icon || 'fa-solid fa-star').trim() || 'fa-solid fa-star',
        label: String(item.label || '').trim()
      }
    }

    var raw = String(item || '').trim()
    if (!raw) {
      return { icon: 'fa-solid fa-star', label: '' }
    }

    var label = raw.replace(/^[^\p{L}\p{N}]+/u, '').trim() || raw
    var normalized = label.toLowerCase()
    var inferredIcon = 'fa-solid fa-star'
    if (normalized.indexOf('bóng') !== -1 || normalized.indexOf('đá') !== -1) inferredIcon = 'fa-solid fa-futbol'
    else if (normalized.indexOf('kéo co') !== -1 || normalized.indexOf('kéo cờ') !== -1) inferredIcon = 'fa-solid fa-people-pulling'
    else if (normalized.indexOf('pickleball') !== -1 || normalized.indexOf('tennis') !== -1) inferredIcon = 'fa-solid fa-table-tennis-paddle-ball'
    else if (normalized.indexOf('lửa trại') !== -1 || normalized.indexOf('lửa') !== -1) inferredIcon = 'fa-solid fa-fire'
    else if (normalized.indexOf('văn nghệ') !== -1 || normalized.indexOf('karaoke') !== -1 || normalized.indexOf('nhạc') !== -1) inferredIcon = 'fa-solid fa-music'
    else if (normalized.indexOf('ẩm thực') !== -1 || normalized.indexOf('ăn') !== -1) inferredIcon = 'fa-solid fa-utensils'
    else if (normalized.indexOf('gặp mặt') !== -1 || normalized.indexOf('hội ngộ') !== -1) inferredIcon = 'fa-solid fa-handshake'

    return {
      icon: inferredIcon,
      label: label
    }
  }

  function getScheduleActivitiesFromState() {
    if (!fullContentState) return []
    if (!fullContentState.schedule) fullContentState.schedule = {}
    var items = Array.isArray(fullContentState.schedule.activities) ? fullContentState.schedule.activities : []
    return items
      .map(normalizeScheduleActivityItem)
      .filter(function (item) { return item.label })
  }

  function setScheduleActivitiesToState(items) {
    if (!fullContentState) return
    if (!fullContentState.schedule) fullContentState.schedule = {}
    fullContentState.schedule.activities = items
      .map(normalizeScheduleActivityItem)
      .filter(function (item) { return item.label })
  }

  function createEl(tag, className, text) {
    var el = document.createElement(tag)
    if (className) el.className = className
    if (typeof text === 'string') el.textContent = text
    return el
  }

  function initTabs() {
    var navItems = Array.from(document.querySelectorAll('.tab-item'))
    var panels = Array.from(document.querySelectorAll('.panel'))

    function activate(target) {
      navItems.forEach(function (item) { item.classList.toggle('active', item.dataset.panel === target) })
      panels.forEach(function (panel) { panel.classList.toggle('active', panel.id === 'panel-' + target) })
      history.replaceState(null, '', '?tab=' + target)
    }

    navItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.preventDefault()
        activate(item.dataset.panel)
      })
    })

    var tab = new URLSearchParams(location.search).get('tab')
    if (tab && document.getElementById('panel-' + tab)) activate(tab)
  }

  async function saveSection(section, formId) {
    var form = document.getElementById(formId)
    if (!form) return
    var data = { section: section }
    form.querySelectorAll('[name]').forEach(function (el) { data[el.name] = el.value })

    try {
      var res = await fetch('/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (result.ok && fullContentState) {
        if (!fullContentState[section]) fullContentState[section] = {}
        form.querySelectorAll('[name]').forEach(function (el) {
          fullContentState[section][el.name] = el.value
        })
        fullContentInitial = deepClone(fullContentState)
        clearDirty()
        reloadPreview(section)
      }
      showToast(result.message || 'Đã lưu!', result.ok ? 'success' : 'error')
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, 'error')
    }
  }

  async function saveRegisteredSettings() {
    var form = document.getElementById('form-registered')
    if (!form) return
    var data = {}
    form.querySelectorAll('[name]').forEach(function (el) { data[el.name] = el.value })

    try {
      var res = await fetch('/admin/registered-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (result.ok && fullContentState && fullContentState.registered) {
        var classOptions = parseClassOptionsText(data.classOptionsText)
        fullContentState.registered.label = data.label || fullContentState.registered.label || ''
        fullContentState.registered.title = data.title || fullContentState.registered.title || ''
        fullContentState.registered.subtitle = data.subtitle || fullContentState.registered.subtitle || ''
        fullContentState.registered.classOptions = classOptions
        fullContentState.registered.classes = classOptions.map(function (name) { return { name: name, count: 0 } })
        fullContentInitial = deepClone(fullContentState)
        clearDirty()
      }
      showToast(result.message || 'Đã lưu!', result.ok ? 'success' : 'error')
      if (result.ok) reloadPreview('registered')
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, 'error')
    }
  }

  function getScheduleActivityIconOption(value) {
    var normalizedValue = String(value || '').trim()
    var found = scheduleActivityIconOptions.find(function (item) { return item.value === normalizedValue })
    return found || scheduleActivityIconOptions[0] || { value: 'fa-solid fa-star', label: 'Khác' }
  }

  function updateIconTriggerButton(button, value) {
    if (!button) return
    var option = getScheduleActivityIconOption(value)
    button.dataset.iconValue = option.value
    button.innerHTML =
      '<span class="icon-picker-trigger-main">' +
        '<span class="icon-picker-trigger-preview"><i class="' + esc(option.value) + '" aria-hidden="true"></i></span>' +
        '<span class="icon-picker-trigger-copy">' +
          '<span class="icon-picker-trigger-title">' + esc(option.label) + '</span>' +
          '<span class="icon-picker-trigger-value">' + esc(option.value) + '</span>' +
        '</span>' +
      '</span>' +
      '<span class="icon-picker-trigger-action">Chọn icon</span>'
  }

  function syncIconPickerSelection() {
    var modal = document.getElementById('icon-picker-modal')
    if (!modal) return
    modal.querySelectorAll('[data-icon-picker-value]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.iconPickerValue === iconPickerState.currentValue)
    })
  }

  function closeIconPicker() {
    var modal = document.getElementById('icon-picker-modal')
    if (!modal || modal.hidden) return false
    modal.hidden = true
    iconPickerState.onPick = null
    iconPickerState.trigger = null
    return true
  }

  function openIconPicker(currentValue, onPick, trigger) {
    var modal = document.getElementById('icon-picker-modal')
    if (!modal || !scheduleActivityIconOptions.length) return
    iconPickerState.currentValue = String(currentValue || scheduleActivityIconOptions[0].value || 'fa-solid fa-star')
    iconPickerState.onPick = onPick
    iconPickerState.trigger = trigger || null
    modal.hidden = false
    syncIconPickerSelection()
  }

  function initIconPickerModal() {
    var modal = document.getElementById('icon-picker-modal')
    var grid = document.getElementById('icon-picker-grid')
    var closeBtn = document.getElementById('icon-picker-close')
    var backdrop = document.getElementById('icon-picker-backdrop')
    if (!modal || !grid) return
    if (!scheduleActivityIconOptions.length) {
      scheduleActivityIconOptions = parseJsonScript('schedule-activity-icons-data', [])
    }

    grid.innerHTML = ''
    scheduleActivityIconOptions.forEach(function (option) {
      var btn = createEl('button', 'icon-picker-option')
      btn.type = 'button'
      btn.dataset.iconPickerValue = option.value
      btn.innerHTML =
        '<span class="icon-picker-option-preview"><i class="' + esc(option.value) + '" aria-hidden="true"></i></span>' +
        '<span class="icon-picker-option-label">' + esc(option.label) + '</span>'
      btn.addEventListener('click', function () {
        if (typeof iconPickerState.onPick === 'function') iconPickerState.onPick(option.value)
        closeIconPicker()
      })
      grid.appendChild(btn)
    })

    if (closeBtn) closeBtn.addEventListener('click', closeIconPicker)
    if (backdrop) backdrop.addEventListener('click', closeIconPicker)
  }

  function createScheduleActivityRow(activity) {
    var item = normalizeScheduleActivityItem(activity)
    var row = document.createElement('div')
    row.className = 'schedule-activity-item'
    row.innerHTML =
      '<div class="schedule-activity-preview" data-schedule-activity-preview><i class="' + esc(item.icon) + '" aria-hidden="true"></i></div>' +
      '<input type="hidden" data-schedule-activity-icon value="' + esc(item.icon) + '">' +
      '<button class="icon-picker-trigger schedule-activity-icon-trigger" type="button" data-schedule-activity-icon-button></button>' +
      '<input class="form-control" type="text" maxlength="40" placeholder="VD: Bóng đá" data-schedule-activity-label value="' + esc(item.label) + '">' +
      '<div class="schedule-activity-actions"><button class="btn btn-danger btn-sm" type="button" data-schedule-activity-remove>Xóa</button></div>'

    var iconInput = row.querySelector('[data-schedule-activity-icon]')
    var iconButton = row.querySelector('[data-schedule-activity-icon-button]')
    var labelInput = row.querySelector('[data-schedule-activity-label]')
    var removeBtn = row.querySelector('[data-schedule-activity-remove]')
    var preview = row.querySelector('[data-schedule-activity-preview]')

    updateIconTriggerButton(iconButton, item.icon)

    iconButton.addEventListener('click', function () {
      openIconPicker(iconInput.value, function (nextValue) {
        iconInput.value = nextValue
        updateIconTriggerButton(iconButton, nextValue)
        preview.innerHTML = '<i class="' + esc(nextValue) + '" aria-hidden="true"></i>'
        markDirty()
      }, iconButton)
    })

    labelInput.addEventListener('input', markDirty)

    removeBtn.addEventListener('click', function () {
      row.remove()
      markDirty()
      ensureScheduleActivityRows()
    })

    return row
  }

  function renderScheduleActivitiesManager() {
    var list = document.getElementById('schedule-activities-list')
    if (!list) return
    var activities = getScheduleActivitiesFromState()
    list.innerHTML = ''
    if (activities.length === 0) activities = [{ icon: 'fa-solid fa-star', label: '' }]
    activities.forEach(function (activity) {
      list.appendChild(createScheduleActivityRow(activity))
    })
  }

  function ensureScheduleActivityRows() {
    var list = document.getElementById('schedule-activities-list')
    if (!list) return
    if (list.children.length === 0) {
      list.appendChild(createScheduleActivityRow({ icon: 'fa-solid fa-star', label: '' }))
    }
  }

  function collectScheduleActivitiesFromManager() {
    var list = document.getElementById('schedule-activities-list')
    if (!list) return []
    return Array.from(list.querySelectorAll('.schedule-activity-item'))
      .map(function (row) {
        var iconEl = row.querySelector('[data-schedule-activity-icon]')
        var labelEl = row.querySelector('[data-schedule-activity-label]')
        return {
          icon: iconEl ? iconEl.value : 'fa-solid fa-star',
          label: labelEl ? labelEl.value : ''
        }
      })
      .map(normalizeScheduleActivityItem)
      .filter(function (item) { return item.label })
  }

  async function saveScheduleActivities() {
    var activities = collectScheduleActivitiesFromManager()
    if (activities.length === 0) {
      showToast('Vui lòng thêm ít nhất 1 hoạt động cho chương trình.', 'error')
      return
    }

    try {
      var res = await fetch('/admin/schedule-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activities }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (result.ok) {
        setScheduleActivitiesToState(activities)
        fullContentInitial = deepClone(fullContentState)
        clearDirty()
        renderScheduleActivitiesManager()
        renderEditor()
        reloadPreview('schedule')
      }
      showToast(result.message || 'Đã lưu!', result.ok ? 'success' : 'error')
    } catch (err) {
      showToast('Lỗi kết nối: ' + err.message, 'error')
    }
  }

  function initScheduleActivitiesManager() {
    scheduleActivityIconOptions = parseJsonScript('schedule-activity-icons-data', [])
    if (!scheduleActivityIconOptions.length) return

    var addBtn = document.getElementById('schedule-activities-add')
    var saveBtn = document.getElementById('schedule-activities-save')
    var list = document.getElementById('schedule-activities-list')
    if (!list) return

    renderScheduleActivitiesManager()

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        list.appendChild(createScheduleActivityRow({ icon: scheduleActivityIconOptions[0].value, label: '' }))
        markDirty()
      })
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', saveScheduleActivities)
    }
  }

  function getGalleryFilesStateByName(filename) {
    return galleryFilesState.find(function (item) { return item.filename === filename })
  }

  function syncGalleryOrderToState() {
    if (!fullContentState || !fullContentState.gallery) return
    fullContentState.gallery.order = galleryFilesState.map(function (item) { return item.filename })
  }

  function syncGalleryCaptionsToState() {
    if (!fullContentState || !fullContentState.gallery) return
    fullContentState.gallery.captions = galleryFilesState
      .map(function (item) {
        return {
          filename: item.filename,
          title: String(item.title || '').trim(),
          subtitle: String(item.subtitle || '').trim()
        }
      })
      .filter(function (item) { return item.title || item.subtitle })
  }

  function syncAdminGalleryGrid() {
    var grid = document.getElementById('gallery-grid')
    if (!grid) return
    grid.innerHTML = ''
    galleryFilesState.forEach(function (item) {
      var thumb = document.createElement('div')
      thumb.className = 'gallery-thumb'
      thumb.setAttribute('draggable', 'true')
      thumb.dataset.filename = item.filename
      thumb.innerHTML = '<img src="' + esc(item.url) + '" alt="' + esc(item.filename) + '" loading="lazy">' +
        '<button class="thumb-delete" data-filename="' + esc(item.filename) + '" title="Xóa ảnh này">x</button>'
      var btn = thumb.querySelector('.thumb-delete')
      btn.addEventListener('click', function () { deleteGalleryImage(item.filename) })
      initDragOnThumb(thumb)
      grid.appendChild(thumb)
    })
    updateGalleryCount()
  }

  function renderGalleryCaptionList() {
    var list = document.getElementById('gallery-caption-list')
    if (!list) return

    list.innerHTML = ''
    galleryFilesState.forEach(function (item, index) {
      var row = document.createElement('div')
      row.className = 'gallery-caption-item'
      row.dataset.galleryCaptionItem = item.filename
      row.innerHTML =
        '<img class="gallery-caption-preview" src="' + esc(item.url) + '" alt="' + esc(item.filename) + '" loading="lazy">' +
        '<div class="gallery-caption-fields">' +
          '<div class="gallery-caption-meta">' + (index + 1) + '. ' + esc(item.filename) + '</div>' +
          '<label class="form-label" for="gallery-caption-' + index + '">Nhãn hiển thị</label>' +
          '<input id="gallery-caption-' + index + '" class="form-control" type="text" placeholder="VD: Lớp A1" value="' + esc(item.title || '') + '" data-gallery-caption-input="' + esc(item.filename) + '">' +
        '</div>'

      var input = row.querySelector('[data-gallery-caption-input]')
      input.addEventListener('input', function () {
        item.title = input.value
        syncGalleryCaptionsToState()
        markDirty()
      })
      list.appendChild(row)
    })
  }

  function updateGalleryCount() {
    var el = document.getElementById('gallery-count')
    if (el) el.textContent = String(galleryFilesState.length)
  }

  async function uploadLogoFile(file, previewEl) {
    if (!file) return
    var fd = new FormData()
    fd.append('logo', file)

    try {
      var res = await fetch('/admin/upload-logo', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể upload logo.')
      if (previewEl) previewEl.src = result.url
      if (fullContentState && fullContentState.hero) {
        fullContentState.hero.logo = '/images/logo.png'
        fullContentInitial = deepClone(fullContentState)
        clearDirty()
      }
      showToast('Logo đã được cập nhật!', 'success')
      reloadPreview('hero')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    }
  }

  async function uploadGalleryFiles(files) {
    if (!files || !files.length) return
    var fd = new FormData()
    Array.from(files).forEach(function (file) { fd.append('images', file) })

    try {
      var res = await fetch('/admin/upload-gallery', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể upload ảnh.')
      result.urls.forEach(function (item) {
        galleryFilesState.push({
          filename: item.filename,
          url: item.url,
          title: '',
          subtitle: ''
        })
      })
      syncGalleryOrderToState()
      syncGalleryCaptionsToState()
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
      renderGalleryCaptionList()
      renderEditor()
      showToast('Đã upload ' + result.urls.length + ' ảnh!', 'success')
      reloadPreview('gallery')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    }
  }

  async function deleteGalleryImage(filename) {
    if (!confirm('Xóa ảnh "' + filename + '"?\nThao tác này không thể hoàn tác.')) return

    try {
      var res = await fetch('/admin/gallery/' + encodeURIComponent(filename), {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể xóa ảnh.')
      galleryFilesState = galleryFilesState.filter(function (item) { return item.filename !== filename })
      syncGalleryOrderToState()
      syncGalleryCaptionsToState()
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
      renderGalleryCaptionList()
      renderEditor()
      showToast('Đã xóa ảnh!', 'success')
      reloadPreview('gallery')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    }
  }

  function initLogoUpload() {
    var input = document.getElementById('logo-file')
    var preview = document.getElementById('logo-preview')
    var zone = document.getElementById('logo-zone')
    if (!input || !zone) return

    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover') })
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover') })
    zone.addEventListener('drop', function (e) {
      e.preventDefault()
      zone.classList.remove('dragover')
      if (e.dataTransfer.files[0]) uploadLogoFile(e.dataTransfer.files[0], preview)
    })
    input.addEventListener('change', function () {
      if (input.files[0]) uploadLogoFile(input.files[0], preview)
    })
  }

  function initGalleryUpload() {
    var input = document.getElementById('gallery-file')
    var zone = document.getElementById('gallery-zone')
    if (!input || !zone) return

    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover') })
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover') })
    zone.addEventListener('drop', function (e) {
      e.preventDefault()
      zone.classList.remove('dragover')
      uploadGalleryFiles(e.dataTransfer.files)
    })
    input.addEventListener('change', function () {
      uploadGalleryFiles(input.files)
      input.value = ''
    })
  }

  function initDragOnThumb(thumb) {
    thumb.addEventListener('dragstart', function (e) {
      dragSrc = thumb
      thumb.classList.add('dragging')
      e.dataTransfer.effectAllowed = 'move'
    })

    thumb.addEventListener('dragend', function () {
      thumb.classList.remove('dragging')
      document.querySelectorAll('.gallery-thumb').forEach(function (item) { item.classList.remove('drag-over') })
      saveGalleryOrderFromDom()
    })

    thumb.addEventListener('dragover', function (e) {
      e.preventDefault()
      if (dragSrc && dragSrc !== thumb) {
        document.querySelectorAll('.gallery-thumb').forEach(function (item) { item.classList.remove('drag-over') })
        thumb.classList.add('drag-over')
        var grid = document.getElementById('gallery-grid')
        if (!grid) return
        var siblings = Array.from(grid.children)
        var srcIdx = siblings.indexOf(dragSrc)
        var tgtIdx = siblings.indexOf(thumb)
        if (srcIdx < tgtIdx) grid.insertBefore(dragSrc, thumb.nextSibling)
        else grid.insertBefore(dragSrc, thumb)
      }
    })

    thumb.addEventListener('dragleave', function () { thumb.classList.remove('drag-over') })
  }

  async function saveGalleryOrder(order) {
    try {
      var res = await fetch('/admin/gallery-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: order }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể lưu thứ tự ảnh.')
      reloadPreview('gallery')
    } catch (err) {
      showToast('Lỗi lưu thứ tự ảnh: ' + err.message, 'error')
    }
  }

  async function saveGalleryCaptions() {
    try {
      var captions = galleryFilesState.map(function (item) {
        return {
          filename: item.filename,
          title: String(item.title || '').trim(),
          subtitle: String(item.subtitle || '').trim()
        }
      })

      var res = await fetch('/admin/gallery-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions: captions }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'KhÃ´ng thá»ƒ lÆ°u nhÃ£n áº£nh.')
      syncGalleryCaptionsToState()
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
      renderGalleryCaptionList()
      renderEditor()
      showToast(result.message || 'ÄÃ£ lÆ°u nhÃ£n áº£nh!', 'success')
      reloadPreview('gallery')
    } catch (err) {
      showToast('Lá»—i lÆ°u nhÃ£n áº£nh: ' + err.message, 'error')
    }
  }

  function saveGalleryOrderFromDom() {
    var grid = document.getElementById('gallery-grid')
    if (!grid) return
    var order = Array.from(grid.querySelectorAll('.gallery-thumb')).map(function (thumb) { return thumb.dataset.filename })
    galleryFilesState = order.map(function (filename) { return getGalleryFilesStateByName(filename) }).filter(Boolean)
    syncGalleryOrderToState()
    syncGalleryCaptionsToState()
    fullContentInitial = deepClone(fullContentState)
    clearDirty()
    renderGalleryCaptionList()
    saveGalleryOrder(order)
  }

  async function saveGalleryCaptions() {
    try {
      var captions = galleryFilesState.map(function (item) {
        return {
          filename: item.filename,
          title: String(item.title || '').trim(),
          subtitle: String(item.subtitle || '').trim()
        }
      })

      var res = await fetch('/admin/gallery-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captions: captions }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Khong the luu nhan anh.')
      syncGalleryCaptionsToState()
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
      renderGalleryCaptionList()
      renderEditor()
      showToast(result.message || 'Da luu nhan anh!', 'success')
      reloadPreview('gallery')
    } catch (err) {
      showToast('Loi luu nhan anh: ' + err.message, 'error')
    }
  }

  function initExistingThumbs() {
    document.querySelectorAll('#gallery-grid .gallery-thumb').forEach(function (thumb) {
      initDragOnThumb(thumb)
      var btn = thumb.querySelector('.thumb-delete')
      if (btn) btn.addEventListener('click', function () { deleteGalleryImage(btn.dataset.filename) })
    })
    updateGalleryCount()
  }

  // ── Attendees manager ─────────────────────────────────
  var attendeesState = {
    list: [],
    search: '',
    classFilter: 'all',
    statusFilter: 'all',
    page: 1,
    pageSize: 20
  }

  function getAttendeesFromState() {
    if (fullContentState && fullContentState.registered && Array.isArray(fullContentState.registered.attendees)) {
      return fullContentState.registered.attendees
    }
    return []
  }

  function getClassOptionsFromState() {
    if (fullContentState && fullContentState.registered) {
      var opts = fullContentState.registered.classOptions
      if (Array.isArray(opts) && opts.length > 0) return opts
    }
    return []
  }

  function normalizeStatus(s) {
    var v = String(s || '').trim()
    return v || 'Chờ xác nhận'
  }

  function filterAttendees() {
    var term = attendeesState.search.trim().toLowerCase()
    return attendeesState.list.filter(function (a) {
      if (attendeesState.classFilter !== 'all' && (a.className || '') !== attendeesState.classFilter) return false
      if (attendeesState.statusFilter !== 'all' && normalizeStatus(a.status) !== attendeesState.statusFilter) return false
      if (!term) return true
      var haystack = [a.name, a.className, a.phone, a.note].join(' ').toLowerCase()
      return haystack.indexOf(term) !== -1
    })
  }

  function renderAttendeesStats() {
    var list = attendeesState.list
    var total = list.length
    var confirmed = list.filter(function (a) { return normalizeStatus(a.status) === 'Đã xác nhận' }).length
    var pending = total - confirmed
    var totalEl = document.getElementById('attendees-stat-total')
    var confirmedEl = document.getElementById('attendees-stat-confirmed')
    var pendingEl = document.getElementById('attendees-stat-pending')
    var countEl = document.getElementById('attendees-total-count')
    if (totalEl) totalEl.textContent = String(total)
    if (confirmedEl) confirmedEl.textContent = String(confirmed)
    if (pendingEl) pendingEl.textContent = String(pending)
    if (countEl) countEl.textContent = String(total)
  }

  function renderAttendeesClassFilter() {
    var select = document.getElementById('attendees-filter-class')
    if (!select) return
    var current = attendeesState.classFilter
    var classOptions = getClassOptionsFromState()
    var extras = Array.from(new Set(attendeesState.list
      .map(function (a) { return a.className })
      .filter(function (c) { return c && classOptions.indexOf(c) === -1 })))
    var options = ['<option value="all">Tất cả lớp</option>']
      .concat(classOptions.concat(extras).map(function (c) {
        return '<option value="' + esc(c) + '">' + esc(c) + '</option>'
      }))
    select.innerHTML = options.join('')
    select.value = classOptions.concat(extras).indexOf(current) === -1 ? 'all' : current
    attendeesState.classFilter = select.value
  }

  function renderAttendeesPagination(totalPages) {
    var pag = document.getElementById('attendees-pagination')
    if (!pag) return
    pag.innerHTML = ''
    if (totalPages <= 1) return
    for (var i = 1; i <= totalPages; i++) {
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = String(i)
      if (i === attendeesState.page) btn.className = 'active'
      btn.dataset.page = String(i)
      btn.addEventListener('click', function () {
        attendeesState.page = parseInt(this.dataset.page, 10) || 1
        renderAttendeesList()
      })
      pag.appendChild(btn)
    }
  }

  function renderAttendeesList() {
    var listEl = document.getElementById('attendees-list')
    if (!listEl) return
    var filtered = filterAttendees()
    var totalPages = Math.max(1, Math.ceil(filtered.length / attendeesState.pageSize))
    if (attendeesState.page > totalPages) attendeesState.page = totalPages
    var start = (attendeesState.page - 1) * attendeesState.pageSize
    var slice = filtered.slice(start, start + attendeesState.pageSize)

    if (slice.length === 0) {
      listEl.innerHTML = '<div class="attendees-empty">Không có người đăng ký nào khớp bộ lọc.</div>'
      renderAttendeesPagination(totalPages)
      return
    }

    listEl.innerHTML = slice.map(function (a, idx) {
      var status = normalizeStatus(a.status)
      var statusClass = status === 'Đã xác nhận' ? 'confirmed' : 'pending'
      var id = esc(a.id || '')
      var toggleLabel = status === 'Đã xác nhận' ? 'Hủy xác nhận' : 'Xác nhận'
      var toggleClass = status === 'Đã xác nhận' ? 'btn-unconfirm' : 'btn-confirm'
      var nextStatus = status === 'Đã xác nhận' ? 'Chờ xác nhận' : 'Đã xác nhận'

      return '<div class="attendees-row" data-attendee-id="' + id + '">' +
        '<span data-label="#">' + (start + idx + 1) + '</span>' +
        '<span data-label="Họ tên"><strong>' + esc(a.name || '') + '</strong></span>' +
        '<span data-label="Lớp">' + esc(a.className || '–') + '</span>' +
        '<span data-label="SĐT">' + esc(a.phone || '–') + '</span>' +
        '<span data-label="Ghi chú" class="attendees-note">' + (a.note ? esc(a.note) : '–') + '</span>' +
        '<span data-label="Trạng thái"><span class="attendees-status ' + statusClass + '">' + esc(status) + '</span></span>' +
        '<span data-label="Ngày">' + esc(a.registeredAt || '–') + '</span>' +
        '<span class="attendees-cell-actions" data-label="Thao tác"><div class="attendees-actions">' +
          '<button type="button" class="' + toggleClass + '" data-attendee-action="toggle" data-attendee-status="' + esc(nextStatus) + '">' + toggleLabel + '</button>' +
          '<button type="button" class="btn-delete" data-attendee-action="delete">Xóa</button>' +
        '</div></span>' +
      '</div>'
    }).join('')

    renderAttendeesPagination(totalPages)
  }

  function renderAttendeesAll() {
    attendeesState.list = getAttendeesFromState().slice()
    renderAttendeesStats()
    renderAttendeesClassFilter()
    renderAttendeesList()
  }

  async function updateAttendeeStatus(id, status) {
    try {
      var res = await fetch('/admin/attendees/' + encodeURIComponent(id) + '/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể cập nhật.')

      var attendees = getAttendeesFromState()
      var match = attendees.find(function (a) { return String(a.id) === String(id) })
      if (match) match.status = status
      fullContentInitial = deepClone(fullContentState)
      renderAttendeesAll()
      showToast(result.message || 'Đã cập nhật.', 'success')
      reloadPreview('registered')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    }
  }

  async function deleteAttendee(id) {
    if (!window.confirm('Xóa người đăng ký này? Thao tác không thể hoàn tác.')) return
    try {
      var res = await fetch('/admin/attendees/' + encodeURIComponent(id), {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể xóa.')

      if (fullContentState && fullContentState.registered) {
        fullContentState.registered.attendees = getAttendeesFromState().filter(function (a) {
          return String(a.id) !== String(id)
        })
      }
      fullContentInitial = deepClone(fullContentState)
      renderAttendeesAll()
      showToast(result.message || 'Đã xóa.', 'success')
      reloadPreview('registered')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    }
  }

  function exportAttendeesCSV() {
    var rows = filterAttendees()
    if (rows.length === 0) {
      showToast('Không có dữ liệu để xuất.', 'error')
      return
    }
    var headers = ['STT', 'Họ tên', 'Lớp', 'SĐT', 'Ghi chú', 'Trạng thái', 'Ngày đăng ký']
    var csv = [headers.join(',')]
    rows.forEach(function (a, i) {
      var cells = [
        String(i + 1),
        a.name || '',
        a.className || '',
        a.phone || '',
        a.note || '',
        normalizeStatus(a.status),
        a.registeredAt || ''
      ].map(function (v) {
        var s = String(v).replace(/"/g, '""')
        return '"' + s + '"'
      })
      csv.push(cells.join(','))
    })
    var blob = new Blob(['﻿' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
    var url = URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = url
    link.download = 'danh-sach-dang-ky-' + new Date().toISOString().slice(0, 10) + '.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function initAttendeesManager() {
    var searchEl = document.getElementById('attendees-search')
    var classEl = document.getElementById('attendees-filter-class')
    var statusEl = document.getElementById('attendees-filter-status')
    var exportBtn = document.getElementById('attendees-export')
    var listEl = document.getElementById('attendees-list')

    if (!listEl) return

    if (searchEl) {
      var searchTimer = null
      searchEl.addEventListener('input', function () {
        if (searchTimer) clearTimeout(searchTimer)
        searchTimer = setTimeout(function () {
          attendeesState.search = searchEl.value
          attendeesState.page = 1
          renderAttendeesList()
        }, 180)
      })
    }

    if (classEl) {
      classEl.addEventListener('change', function () {
        attendeesState.classFilter = classEl.value
        attendeesState.page = 1
        renderAttendeesList()
      })
    }

    if (statusEl) {
      statusEl.addEventListener('change', function () {
        attendeesState.statusFilter = statusEl.value
        attendeesState.page = 1
        renderAttendeesList()
      })
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', exportAttendeesCSV)
    }

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-attendee-action]')
      if (!btn) return
      var row = btn.closest('[data-attendee-id]')
      if (!row) return
      var id = row.dataset.attendeeId
      var action = btn.dataset.attendeeAction
      if (action === 'delete') {
        deleteAttendee(id)
      } else if (action === 'toggle') {
        updateAttendeeStatus(id, btn.dataset.attendeeStatus)
      }
    })

    renderAttendeesAll()
  }

  // Donate manager
  var donationsState = {
    list: [],
    search: '',
    typeFilter: 'all',
    statusFilter: 'all',
    page: 1,
    pageSize: 20
  }

  function getDonationsFromState() {
    if (fullContentState && fullContentState.donate && Array.isArray(fullContentState.donate.entries)) {
      return fullContentState.donate.entries
    }
    return []
  }

  var DONATE_STATUS_PENDING = 'Đăng ký ủng hộ'
  var DONATE_STATUS_RECEIVED = 'Đã nhận chuyển khoản'

  function normalizeDonationStatus(status) {
    var v = String(status || '').trim()
    if (v === DONATE_STATUS_RECEIVED || v === 'Đã nhận') return DONATE_STATUS_RECEIVED
    return DONATE_STATUS_PENDING
  }

  function formatAdminMoney(amount) {
    var num = Number(amount || 0)
    if (!isFinite(num)) num = 0
    return num.toLocaleString('vi-VN') + ' VND'
  }

  function getDonationDisplayName(item) {
    if (item.type === 'organization') return item.organizationName || 'Tập thể'
    return item.name || 'Cựu học sinh'
  }

  function filterDonations() {
    var term = donationsState.search.trim().toLowerCase()
    return donationsState.list.filter(function (item) {
      var type = item.type === 'organization' ? 'organization' : 'personal'
      var status = normalizeDonationStatus(item.status)
      if (donationsState.typeFilter !== 'all' && type !== donationsState.typeFilter) return false
      if (donationsState.statusFilter !== 'all' && status !== donationsState.statusFilter) return false
      if (!term) return true
      var haystack = [
        item.name,
        item.className,
        item.contactName,
        item.organizationName,
        item.message,
        status
      ].join(' ').toLowerCase()
      return haystack.indexOf(term) !== -1
    })
  }

  function renderDonationsStats() {
    var list = donationsState.list
    var total = list.length
    var received = list.filter(function (item) { return normalizeDonationStatus(item.status) === DONATE_STATUS_RECEIVED }).length
    var pending = total - received
    var totalEl = document.getElementById('donations-stat-total')
    var receivedEl = document.getElementById('donations-stat-received')
    var pendingEl = document.getElementById('donations-stat-pending')
    var countEl = document.getElementById('donations-total-count')
    if (totalEl) totalEl.textContent = String(total)
    if (receivedEl) receivedEl.textContent = String(received)
    if (pendingEl) pendingEl.textContent = String(pending)
    if (countEl) countEl.textContent = String(total)
  }

  function renderDonationsPagination(totalPages) {
    var pag = document.getElementById('donations-pagination')
    if (!pag) return
    pag.innerHTML = ''
    if (totalPages <= 1) return
    for (var i = 1; i <= totalPages; i++) {
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = String(i)
      if (i === donationsState.page) btn.className = 'active'
      btn.dataset.page = String(i)
      btn.addEventListener('click', function () {
        donationsState.page = parseInt(this.dataset.page, 10) || 1
        renderDonationsList()
      })
      pag.appendChild(btn)
    }
  }

  function renderDonationsList() {
    var listEl = document.getElementById('donations-list')
    if (!listEl) return
    var filtered = filterDonations()
    var totalPages = Math.max(1, Math.ceil(filtered.length / donationsState.pageSize))
    if (donationsState.page > totalPages) donationsState.page = totalPages
    var start = (donationsState.page - 1) * donationsState.pageSize
    var slice = filtered.slice(start, start + donationsState.pageSize)

    if (slice.length === 0) {
      listEl.innerHTML = '<div class="attendees-empty">Không có khoản ủng hộ nào khớp bộ lọc.</div>'
      renderDonationsPagination(totalPages)
      return
    }

    listEl.innerHTML = slice.map(function (item, idx) {
      var status = normalizeDonationStatus(item.status)
      var statusClass = status === DONATE_STATUS_RECEIVED ? 'confirmed' : 'pending'
      var id = esc(item.id || '')
      var type = item.type === 'organization' ? 'organization' : 'personal'
      var typeLabel = type === 'organization' ? 'Công ty / tập thể' : 'Cá nhân'
      var nextStatus = status === DONATE_STATUS_RECEIVED ? DONATE_STATUS_PENDING : DONATE_STATUS_RECEIVED
      var toggleLabel = status === DONATE_STATUS_RECEIVED ? 'Chuyển về đăng ký ủng hộ' : 'Đã nhận chuyển khoản'
      var dateLabel = item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '–'

      return '<div class="donations-row" data-donation-id="' + id + '">' +
        '<span data-label="#">' + (start + idx + 1) + '</span>' +
        '<span data-label="Người / tổ chức"><strong>' + esc(getDonationDisplayName(item)) + '</strong>' + (type === 'organization' && item.contactName ? '<small>Liên hệ: ' + esc(item.contactName) + '</small>' : '') + '</span>' +
        '<span data-label="Loại">' + esc(typeLabel) + '</span>' +
        '<span data-label="Lớp">' + esc(type === 'personal' ? (item.className || '–') : '–') + '</span>' +
        '<span data-label="Số tiền"><strong>' + esc(formatAdminMoney(item.amount)) + '</strong></span>' +
        '<span data-label="Lời nhắn" class="attendees-note">' + (item.message ? esc(item.message) : '–') + '</span>' +
        '<span data-label="Ẩn danh">' + (item.anonymous ? 'Có' : 'Không') + '</span>' +
        '<span data-label="Ngày">' + esc(dateLabel) + '</span>' +
        '<span data-label="Trạng thái"><span class="attendees-status ' + statusClass + '">' + esc(status) + '</span></span>' +
        '<span class="attendees-cell-actions" data-label="Thao tác"><div class="attendees-actions">' +
          '<button type="button" class="' + (status === DONATE_STATUS_RECEIVED ? 'btn-unconfirm' : 'btn-confirm') + '" data-donation-action="toggle" data-donation-status="' + esc(nextStatus) + '">' + esc(toggleLabel) + '</button>' +
        '</div></span>' +
      '</div>'
    }).join('')

    renderDonationsPagination(totalPages)
  }

  function renderDonationsAll() {
    donationsState.list = getDonationsFromState().map(function (item) {
      if (!item.status) item.status = DONATE_STATUS_PENDING
      return item
    })
    renderDonationsStats()
    renderDonationsList()
  }

  async function updateDonationStatus(id, status) {
    try {
      var res = await fetch('/admin/donations/' + encodeURIComponent(id) + '/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể cập nhật.')

      var donations = getDonationsFromState()
      var match = donations.find(function (item) { return String(item.id) === String(id) })
      if (match) match.status = status
      fullContentInitial = deepClone(fullContentState)
      renderDonationsAll()
      showToast(result.message || 'Đã cập nhật trạng thái ủng hộ.', 'success')
      reloadPreview('donate')
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error')
    }
  }

  function exportDonationsCSV() {
    var rows = filterDonations()
    if (rows.length === 0) {
      showToast('Không có dữ liệu để xuất.', 'error')
      return
    }
    var headers = ['STT', 'Ten hien thi', 'Loai', 'Lop', 'So tien', 'Loi nhan', 'An danh', 'Trang thai', 'Ngay']
    var csv = [headers.join(',')]
    rows.forEach(function (item, i) {
      var type = item.type === 'organization' ? 'organization' : 'personal'
      var cells = [
        String(i + 1),
        getDonationDisplayName(item),
        type === 'organization' ? 'Cong ty / tap the' : 'Ca nhan',
        type === 'personal' ? (item.className || '') : '',
        String(item.amount || 0),
        item.message || '',
        item.anonymous ? 'Co' : 'Khong',
        normalizeDonationStatus(item.status),
        item.createdAt || ''
      ].map(function (v) {
        var s = String(v).replace(/"/g, '""')
        return '"' + s + '"'
      })
      csv.push(cells.join(','))
    })
    var blob = new Blob(['\ufeff' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' })
    var url = URL.createObjectURL(blob)
    var link = document.createElement('a')
    link.href = url
    link.download = 'danh-sach-ung-ho-' + new Date().toISOString().slice(0, 10) + '.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function initDonationsManager() {
    var searchEl = document.getElementById('donations-search')
    var typeEl = document.getElementById('donations-filter-type')
    var statusEl = document.getElementById('donations-filter-status')
    var exportBtn = document.getElementById('donations-export')
    var listEl = document.getElementById('donations-list')

    if (!listEl) return

    if (searchEl) {
      var searchTimer = null
      searchEl.addEventListener('input', function () {
        if (searchTimer) clearTimeout(searchTimer)
        searchTimer = setTimeout(function () {
          donationsState.search = searchEl.value
          donationsState.page = 1
          renderDonationsList()
        }, 180)
      })
    }

    if (typeEl) {
      typeEl.addEventListener('change', function () {
        donationsState.typeFilter = typeEl.value
        donationsState.page = 1
        renderDonationsList()
      })
    }

    if (statusEl) {
      statusEl.addEventListener('change', function () {
        donationsState.statusFilter = statusEl.value
        donationsState.page = 1
        renderDonationsList()
      })
    }

    if (exportBtn) exportBtn.addEventListener('click', exportDonationsCSV)

    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-donation-action]')
      if (!btn) return
      var row = btn.closest('[data-donation-id]')
      if (!row) return
      if (btn.dataset.donationAction === 'toggle') {
        updateDonationStatus(row.dataset.donationId, btn.dataset.donationStatus)
      }
    })

    renderDonationsAll()
  }

  async function uploadFontFile(file) {
    if (!file) return
    var nameInput = document.getElementById('custom-font-name-input')
    var familyName = (nameInput ? nameInput.value.trim() : '') || file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
    var fd = new FormData()
    fd.append('font', file)
    fd.append('fontFamily', familyName)

    try {
      var res = await fetch('/admin/upload-font', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể upload font.')
      if (fullContentState) {
        if (!fullContentState.appearance) fullContentState.appearance = {}
        fullContentState.appearance.customFont = { family: result.family, filename: result.filename }
        fullContentInitial = deepClone(fullContentState)
        clearDirty()
      }
      updateCustomFontDisplay(result.family, result.filename)
      showToast('Font "' + result.family + '" đã được tải lên!', 'success')
      reloadPreview('appearance')
    } catch (err) {
      showToast('Lỗi upload font: ' + err.message, 'error')
    }
  }

  async function deleteCustomFont(filename) {
    if (!window.confirm('Xóa font tùy chỉnh?\nTrang sẽ quay về font Google Fonts đã chọn.')) return
    try {
      var res = await fetch('/admin/fonts/' + encodeURIComponent(filename), {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể xóa font.')
      if (fullContentState && fullContentState.appearance) {
        delete fullContentState.appearance.customFont
        fullContentInitial = deepClone(fullContentState)
        clearDirty()
      }
      updateCustomFontDisplay(null, null)
      showToast('Đã xóa font tùy chỉnh. Trang quay về dùng font Google.', 'success')
      reloadPreview('appearance')
    } catch (err) {
      showToast('Lỗi xóa font: ' + err.message, 'error')
    }
  }

  function updateCustomFontDisplay(family, filename) {
    var current = document.getElementById('custom-font-current')
    if (!current) return
    if (family && filename) {
      current.classList.remove('is-hidden')
      var nameEl = document.getElementById('custom-font-family-name')
      var fileEl = document.getElementById('custom-font-file-name')
      var delBtn = document.getElementById('btn-delete-custom-font')
      if (nameEl) nameEl.textContent = family
      if (fileEl) fileEl.textContent = '(' + filename + ')'
      if (delBtn) {
        delBtn.dataset.filename = filename
        delBtn.onclick = function () { deleteCustomFont(filename) }
      }
    } else {
      current.classList.add('is-hidden')
    }
  }

  function initFontUpload() {
    var input = document.getElementById('font-file')
    var zone = document.getElementById('font-upload-zone')
    var deleteBtn = document.getElementById('btn-delete-custom-font')
    if (!zone) return

    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover') })
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover') })
    zone.addEventListener('drop', function (e) {
      e.preventDefault()
      zone.classList.remove('dragover')
      if (e.dataTransfer.files[0]) uploadFontFile(e.dataTransfer.files[0])
    })
    if (input) {
      input.addEventListener('change', function () {
        if (input.files[0]) uploadFontFile(input.files[0])
        input.value = ''
      })
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () { deleteCustomFont(deleteBtn.dataset.filename) })
    }
  }

  function bindSaveButtons() {
    document.querySelectorAll('[data-save-section]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        saveSection(btn.dataset.saveSection, btn.dataset.saveForm)
      })
    })

    document.querySelectorAll('[data-save-handler="registered"]').forEach(function (btn) {
      btn.addEventListener('click', saveRegisteredSettings)
    })

    document.querySelectorAll('[data-save-handler="gallery-captions"]').forEach(function (btn) {
      btn.addEventListener('click', saveGalleryCaptions)
    })
  }

  function getSectionConfig(target) {
    return SECTION_CONFIGS[target] || SECTION_CONFIGS.hero
  }

  function getPreviewFrame() {
    return document.getElementById('content-preview-frame')
  }

  function postPreviewMessage(message) {
    var frame = getPreviewFrame()
    if (!frame || !frame.contentWindow) return
    frame.contentWindow.postMessage(message, '*')
  }

  function highlightPreview(target) {
    pendingPreviewHighlight = target
    postPreviewMessage({ type: 'admin-preview-highlight', target: target })
  }

  function reloadPreview(target) {
    var frame = getPreviewFrame()
    if (!frame) return
    pendingPreviewHighlight = target || currentTarget
    frame.src = '/?adminPreview=1&t=' + Date.now()
  }

  function updatePreviewDevice(device) {
    var stage = document.getElementById('preview-stage')
    if (!stage) return
    stage.classList.remove('is-desktop', 'is-tablet', 'is-mobile')
    stage.classList.add('is-' + device)

    document.querySelectorAll('[data-preview-device]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.previewDevice === device)
    })
  }

  function updateSectionNav(target) {
    currentTarget = target
    document.querySelectorAll('[data-live-editor-target]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.liveEditorTarget === target)
    })

    var config = getSectionConfig(target)
    var pill = document.getElementById('current-section-pill')
    var title = document.getElementById('preview-toolbar-title')
    if (pill) pill.textContent = config.label
    if (title) title.textContent = config.label
  }

  function markDirty() {
    editorDirty = true
    updateSaveState()
  }

  function clearDirty() {
    editorDirty = false
    updateSaveState()
  }

  function updateSaveState() {
    var status = document.getElementById('editor-modal-status')
    if (!status) return
    if (editorDirty) {
      status.textContent = 'Có thay đổi chưa lưu. Bấm lưu để cập nhật preview.'
      status.style.color = '#01148b'
    } else {
      status.textContent = 'Chưa có thay đổi chưa lưu.'
      status.style.color = '#667085'
    }
  }

  function getNodeAtPath(root, path) {
    if (!path.length) return root
    return path.reduce(function (acc, key) { return acc[key] }, root)
  }

  function setNodeValue(path, nextValue) {
    if (!path.length) return
    if (path.length === 1) {
      fullContentState[path[0]] = nextValue
      return
    }
    var parent = getNodeAtPath(fullContentState, path.slice(0, -1))
    parent[path[path.length - 1]] = nextValue
  }

  function canonicalPath(path) {
    return path.map(function (part) { return typeof part === 'number' ? '[]' : part }).join('.')
  }

  function emptyFromSample(sample) {
    if (Array.isArray(sample)) return sample.length > 0 ? [emptyFromSample(sample[0])] : []
    if (sample && typeof sample === 'object') {
      var out = {}
      Object.keys(sample).forEach(function (key) { out[key] = emptyFromSample(sample[key]) })
      return out
    }
    if (typeof sample === 'number') return 0
    if (typeof sample === 'boolean') return false
    return ''
  }

  function getArrayTemplate(path, arr) {
    if (arr.length > 0) return emptyFromSample(arr[0])

    var templates = {
      'gallery.captions': { title: '', subtitle: '' },
      'guestbook.messages': { name: '', className: '', message: '', createdAt: '' },
      'registered.classes': { name: '', count: 0 },
      'registered.classOptions': '',
      'registered.attendees': { name: '', className: '', phone: '', note: '', status: 'Chờ xác nhận', registeredAt: '' },
      'donate.quickAmounts': 0,
      'donate.entries': { type: 'personal', name: '', className: '', contactName: '', organizationName: '', amount: 0, message: '', anonymous: false, status: 'Đăng ký ủng hộ', createdAt: '' },
      'schedule.activities': { icon: 'fa-solid fa-star', label: '' },
      'schedule.days': { label: '', date: '', items: [{ time: '', endTime: '', title: '', desc: '' }] },
      'schedule.days.[].items': { time: '', endTime: '', title: '', desc: '' },
      'announcements.items': { title: '', desc: '', date: '', url: '' }
    }

    var key = canonicalPath(path)
    return templates[key] !== undefined ? deepClone(templates[key]) : ''
  }

  function renderPrimitiveEditor(options) {
    if (canonicalPath(options.path || []) === 'schedule.activities.[].icon' && scheduleActivityIconOptions.length) {
      return renderIconPickerField(options)
    }

    var wrapper = createEl('div', 'content-field')
    var label = createEl('label', 'form-label', options.label || 'Giá trị')
    var input
    var value = options.value

    if (typeof value === 'boolean') {
      input = createEl('input')
      input.type = 'checkbox'
      input.checked = value
      input.addEventListener('change', function () {
        options.onChange(input.checked)
        markDirty()
      })
    } else if (typeof value === 'number') {
      input = createEl('input', 'form-control')
      input.type = 'number'
      input.value = String(value)
      input.addEventListener('input', function () {
        var num = Number(input.value)
        options.onChange(Number.isFinite(num) ? num : 0)
        markDirty()
      })
    } else {
      var stringValue = value == null ? '' : String(value)
      if (stringValue.length > 90 || stringValue.indexOf('\n') !== -1) {
        input = createEl('textarea', 'form-control')
        input.rows = 4
        input.value = stringValue
      } else {
        input = createEl('input', 'form-control')
        input.type = 'text'
        input.value = stringValue
      }
      input.addEventListener('input', function () {
        options.onChange(input.value)
        markDirty()
      })
    }

    wrapper.appendChild(label)
    wrapper.appendChild(input)
    return wrapper
  }

  function renderIconPickerField(options) {
    var wrapper = createEl('div', 'content-field')
    var label = createEl('label', 'form-label', options.label || 'Icon')
    var button = createEl('button', 'icon-picker-trigger')
    var currentValue = String(options.value || 'fa-solid fa-star').trim() || 'fa-solid fa-star'
    button.type = 'button'
    updateIconTriggerButton(button, currentValue)
    button.addEventListener('click', function () {
      openIconPicker(currentValue, function (nextValue) {
        currentValue = nextValue
        updateIconTriggerButton(button, nextValue)
        options.onChange(nextValue)
        markDirty()
      }, button)
    })
    wrapper.appendChild(label)
    wrapper.appendChild(button)
    return wrapper
  }

  function renderNode(container, node, path, key) {
    if (Array.isArray(node)) {
      var block = createEl('div', 'content-block')
      var head = createEl('div', 'content-block-head')
      head.appendChild(createEl('div', 'content-block-title', key || 'Danh sách'))

      var addBtn = createEl('button', 'btn btn-ghost btn-sm', 'Thêm item')
      addBtn.type = 'button'
      addBtn.addEventListener('click', function () {
        node.push(getArrayTemplate(path, node))
        renderEditor()
        markDirty()
      })
      head.appendChild(addBtn)
      block.appendChild(head)

      if (node.length === 0) {
        block.appendChild(createEl('div', 'content-empty', 'Danh sách đang rỗng. Bấm "Thêm item" để bổ sung.'))
      }

      node.forEach(function (item, index) {
        var itemWrap = createEl('div', 'content-array-item')
        var itemHead = createEl('div', 'content-array-item-head')
        itemHead.appendChild(createEl('div', 'content-array-item-title', 'Item ' + (index + 1)))

        var delBtn = createEl('button', 'btn btn-ghost btn-sm', 'Xóa')
        delBtn.type = 'button'
        delBtn.addEventListener('click', function () {
          node.splice(index, 1)
          renderEditor()
          markDirty()
        })
        itemHead.appendChild(delBtn)
        itemWrap.appendChild(itemHead)

        renderNode(itemWrap, item, path.concat([index]), key)
        block.appendChild(itemWrap)
      })

      container.appendChild(block)
      return
    }

    if (node && typeof node === 'object') {
      var objectWrap = createEl('div', 'content-object')
      if (key) objectWrap.appendChild(createEl('div', 'content-object-title', key))
      Object.keys(node).forEach(function (childKey) {
        renderNode(objectWrap, node[childKey], path.concat([childKey]), childKey)
      })
      container.appendChild(objectWrap)
      return
    }

    container.appendChild(renderPrimitiveEditor({
      label: key,
      path: path,
      value: node,
      onChange: function (nextValue) {
        setNodeValue(path, nextValue)
      }
    }))
  }

  function renderSectionEditor(target, root) {
    var config = getSectionConfig(target)
    var sectionCard

    if (config.source == null) {
      Object.keys(fullContentState).forEach(function (key) {
        sectionCard = createEl('div', 'content-section-card')
        sectionCard.appendChild(createEl('div', 'content-section-title', key))
        renderNode(sectionCard, fullContentState[key], [key], null)
        root.appendChild(sectionCard)
      })
      return
    }

    sectionCard = createEl('div', 'content-section-card')
    sectionCard.appendChild(createEl('div', 'content-section-title', config.label))
    renderNode(sectionCard, fullContentState[config.source], [config.source], null)
    root.appendChild(sectionCard)
  }

  function createUploadZone(text, hint, multiple) {
    var zone = createEl('label', 'upload-zone')
    var input = createEl('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = !!multiple
    zone.appendChild(input)
    zone.appendChild(createEl('div', 'upload-zone-text', text))
    zone.appendChild(createEl('div', 'upload-zone-hint', hint))
    return zone
  }

  function wireUploadZoneDrag(zone, handler) {
    zone.addEventListener('dragover', function (e) {
      e.preventDefault()
      zone.classList.add('dragover')
    })
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('dragover')
    })
    zone.addEventListener('drop', function (e) {
      e.preventDefault()
      zone.classList.remove('dragover')
      handler(e.dataTransfer.files)
    })
  }

  function renderLogoTool(container) {
    var card = createEl('div', 'tool-card')
    var head = createEl('div', 'tool-card-head')
    head.appendChild(createEl('div', 'tool-card-title', 'Logo'))
    card.appendChild(head)
    card.appendChild(createEl('p', 'tool-card-copy', 'Upload logo mới ngay trong popup này. Preview sẽ cập nhật sau khi upload thành công.'))

    var inline = createEl('div', 'tool-inline')
    var preview = createEl('img', 'logo-preview-admin')
    preview.src = String((fullContentState.hero && fullContentState.hero.logo) || '/images/logo.png') + '?t=' + Date.now()
    preview.alt = 'Logo'
    inline.appendChild(preview)

    var zone = createUploadZone('Nhấn hoặc kéo thả logo vào đây', 'PNG, JPG - tối đa 5MB')
    var input = zone.querySelector('input')
    wireUploadZoneDrag(zone, function (files) {
      if (files && files[0]) uploadLogoFile(files[0], preview)
    })
    input.addEventListener('change', function () {
      if (input.files[0]) uploadLogoFile(input.files[0], preview)
    })
    inline.appendChild(zone)

    card.appendChild(inline)
    container.appendChild(card)
  }

  function initModalThumbDrag(thumb, grid) {
    thumb.addEventListener('dragstart', function (e) {
      dragSourceThumb = thumb
      thumb.classList.add('dragging')
      e.dataTransfer.effectAllowed = 'move'
    })

    thumb.addEventListener('dragend', function () {
      thumb.classList.remove('dragging')
      Array.from(grid.querySelectorAll('.gallery-thumb')).forEach(function (item) { item.classList.remove('drag-over') })
      var order = Array.from(grid.querySelectorAll('.gallery-thumb')).map(function (item) { return item.dataset.filename })
      galleryFilesState = order.map(function (filename) { return getGalleryFilesStateByName(filename) }).filter(Boolean)
      syncGalleryOrderToState()
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
      saveGalleryOrder(order)
    })

    thumb.addEventListener('dragover', function (e) {
      e.preventDefault()
      if (!dragSourceThumb || dragSourceThumb === thumb) return
      Array.from(grid.querySelectorAll('.gallery-thumb')).forEach(function (item) { item.classList.remove('drag-over') })
      thumb.classList.add('drag-over')
      var siblings = Array.from(grid.children)
      var srcIdx = siblings.indexOf(dragSourceThumb)
      var tgtIdx = siblings.indexOf(thumb)
      if (srcIdx < tgtIdx) grid.insertBefore(dragSourceThumb, thumb.nextSibling)
      else grid.insertBefore(dragSourceThumb, thumb)
    })

    thumb.addEventListener('dragleave', function () { thumb.classList.remove('drag-over') })
  }

  function renderGalleryTool(container) {
    var card = createEl('div', 'tool-card')
    var head = createEl('div', 'tool-card-head')
    head.appendChild(createEl('div', 'tool-card-title', 'Thư viện media'))
    card.appendChild(head)
    card.appendChild(createEl('p', 'tool-card-copy', 'Thêm, xóa và kéo thả để sắp xếp ảnh. Các thao tác media được lưu ngay.'))

    var uploadZone = createUploadZone('Tải ảnh mới vào gallery', 'Có thể chọn nhiều ảnh cùng lúc - tối đa 15MB/ảnh', true)
    var input = uploadZone.querySelector('input')
    wireUploadZoneDrag(uploadZone, function (files) {
      uploadGalleryFiles(files)
    })
    input.addEventListener('change', function () {
      uploadGalleryFiles(input.files)
      input.value = ''
    })
    card.appendChild(uploadZone)

    var grid = createEl('div', 'gallery-grid-admin')
    galleryFilesState.forEach(function (item) {
      var thumb = createEl('div', 'gallery-thumb')
      thumb.setAttribute('draggable', 'true')
      thumb.dataset.filename = item.filename
      thumb.innerHTML =
        '<img src="' + esc(item.url) + '" alt="' + esc(item.filename) + '" loading="lazy">' +
        '<button class="thumb-delete" type="button" data-filename="' + esc(item.filename) + '">x</button>' +
        '<div class="gallery-caption-chip">' + esc(item.title || item.filename) + '</div>'
      thumb.querySelector('.thumb-delete').addEventListener('click', function (e) {
        e.preventDefault()
        deleteGalleryImage(item.filename)
      })
      initModalThumbDrag(thumb, grid)
      grid.appendChild(thumb)
    })
    card.appendChild(grid)

    container.appendChild(card)
  }

  function renderSpecialTools(target, container) {
    container.innerHTML = ''
    if (target === 'hero') renderLogoTool(container)
    if (target === 'gallery') renderGalleryTool(container)
  }

  function renderEditor() {
    var modal = document.getElementById('editor-modal')
    var dialog = document.getElementById('editor-modal-dialog')
    var title = document.getElementById('editor-modal-title')
    var subtitle = document.getElementById('editor-modal-subtitle')
    var tools = document.getElementById('editor-special-tools')
    var fields = document.getElementById('editor-fields')
    if (!modal || !dialog || !title || !subtitle || !tools || !fields || !fullContentState) return

    var config = getSectionConfig(currentTarget)
    dialog.classList.toggle('is-wide', !!config.wide)
    title.textContent = config.label
    subtitle.textContent = config.description
    fields.innerHTML = ''
    renderSpecialTools(currentTarget, tools)
    renderSectionEditor(currentTarget, fields)
  }

  function openEditor(target) {
    var modal = document.getElementById('editor-modal')
    if (!modal) return
    updateSectionNav(target)
    renderEditor()
    modal.hidden = false
    document.body.style.overflow = 'hidden'
    highlightPreview(target)
    updateSaveState()
  }

  function closeEditor() {
    var modal = document.getElementById('editor-modal')
    if (!modal) return
    closeIconPicker()
    modal.hidden = true
    document.body.style.overflow = ''
  }

  async function saveFullContent() {
    if (!fullContentState) return
    try {
      var res = await fetch('/admin/save-full-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fullContentState }),
        credentials: 'same-origin'
      })
      var result = await parseJsonResponse(res)
      if (!result.ok) throw new Error(result.message || 'Không thể lưu nội dung.')
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      showToast(result.message || 'Đã lưu toàn bộ nội dung.', 'success')
      reloadPreview(currentTarget)
      closeEditor()
    } catch (err) {
      showToast('Lỗi lưu full content: ' + err.message, 'error')
    }
  }

  function initLiveEditorSidebar() {
    document.querySelectorAll('[data-live-editor-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openEditor(btn.dataset.liveEditorTarget)
      })
    })
  }

  function initLiveEditorToolbar() {
    document.querySelectorAll('[data-preview-device]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        updatePreviewDevice(btn.dataset.previewDevice)
      })
    })

    var refreshBtn = document.getElementById('refresh-preview-btn')
    if (refreshBtn) refreshBtn.addEventListener('click', function () { reloadPreview(currentTarget) })
  }

  function initLiveEditorModal() {
    var closeBtn = document.getElementById('editor-modal-close')
    var cancelBtn = document.getElementById('editor-modal-cancel')
    var backdrop = document.getElementById('editor-modal-backdrop')
    var saveBtn = document.getElementById('editor-modal-save')

    if (closeBtn) closeBtn.addEventListener('click', closeEditor)
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditor)
    if (backdrop) backdrop.addEventListener('click', closeEditor)
    if (saveBtn) saveBtn.addEventListener('click', saveFullContent)

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return
      if (closeIconPicker()) {
        e.preventDefault()
        return
      }
      closeEditor()
    })
  }

  function initPreviewMessaging() {
    window.addEventListener('message', function (event) {
      if (!event.data || typeof event.data !== 'object') return

      if (event.data.type === 'admin-preview-ready') {
        if (pendingPreviewHighlight) highlightPreview(pendingPreviewHighlight)
        return
      }

      if (event.data.type === 'admin-preview-select' && event.data.target) {
        openEditor(event.data.target)
      }
    })

    var frame = getPreviewFrame()
    if (frame) {
      frame.addEventListener('load', function () {
        if (pendingPreviewHighlight) highlightPreview(pendingPreviewHighlight)
      })
    }
  }

  function initState() {
    var contentEl = document.getElementById('full-content-data')
    var galleryEl = document.getElementById('gallery-files-data')
    if (!contentEl || !galleryEl) return
    fullContentInitial = JSON.parse(contentEl.textContent || '{}')
    fullContentState = deepClone(fullContentInitial)
    setScheduleActivitiesToState(getScheduleActivitiesFromState())
    fullContentInitial = deepClone(fullContentState)
    galleryFilesState = JSON.parse(galleryEl.textContent || '[]')
    syncGalleryOrderToState()
    syncGalleryCaptionsToState()
    clearDirty()
    updateSectionNav(currentTarget)
  }

  document.addEventListener('DOMContentLoaded', function () {
    initState()
    initTabs()
    initIconPickerModal()
    initLogoUpload()
    initFontUpload()
    initGalleryUpload()
    initExistingThumbs()
    renderGalleryCaptionList()
    initScheduleActivitiesManager()
    bindSaveButtons()
    initLiveEditorSidebar()
    initLiveEditorToolbar()
    initLiveEditorModal()
    initPreviewMessaging()
    initAttendeesManager()
    initDonationsManager()
    updatePreviewDevice('desktop')
  })
})()
