;(function () {
  'use strict'

  var SECTION_CONFIGS = {
    hero: { label: 'Hero', description: 'Sửa logo, tiêu đề chính, mô tả và các nút hành động.', source: 'hero' },
    about: { label: 'Giới thiệu', description: 'Sửa thư ngỏ, subtitle và chữ ký.', source: 'about' },
    event: { label: 'Sự kiện', description: 'Ngày giờ, địa điểm, liên hệ và đối tượng.', source: 'event' },
    schedule: { label: 'Lịch trình', description: 'Sửa các ngày, hoạt động và timeline.', source: 'schedule' },
    registered: { label: 'Đăng ký', description: 'Sửa danh sách lớp, thống kê và người đăng ký.', source: 'registered' },
    gallery: { label: 'Thư viện ảnh', description: 'Sửa tiêu đề gallery và quản lý hình ảnh.', source: 'gallery' },
    guestbook: { label: 'Lưu bút', description: 'Sửa tiêu đề và danh sách lời nhắn.', source: 'guestbook' },
    announcements: { label: 'Thông báo', description: 'Sửa tin từ ban tổ chức.', source: 'announcements' },
    contact: { label: 'Liên hệ', description: 'Sửa địa chỉ, số điện thoại, bản đồ và thông tin hỗ trợ.', source: 'contact' },
    footer: { label: 'Footer', description: 'Sửa nội dung chân trang.', source: 'footer' },
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
      if (result.ok && fullContentState && fullContentState[section]) {
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

  function getGalleryFilesStateByName(filename) {
    return galleryFilesState.find(function (item) { return item.filename === filename })
  }

  function syncGalleryOrderToState() {
    if (!fullContentState || !fullContentState.gallery) return
    fullContentState.gallery.order = galleryFilesState.map(function (item) { return item.filename })
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
      result.urls.forEach(function (item) { galleryFilesState.push(item) })
      syncGalleryOrderToState()
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
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
      fullContentInitial = deepClone(fullContentState)
      clearDirty()
      syncAdminGalleryGrid()
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

  function saveGalleryOrderFromDom() {
    var grid = document.getElementById('gallery-grid')
    if (!grid) return
    var order = Array.from(grid.querySelectorAll('.gallery-thumb')).map(function (thumb) { return thumb.dataset.filename })
    galleryFilesState = order.map(function (filename) { return getGalleryFilesStateByName(filename) }).filter(Boolean)
    syncGalleryOrderToState()
    fullContentInitial = deepClone(fullContentState)
    clearDirty()
    saveGalleryOrder(order)
  }

  function initExistingThumbs() {
    document.querySelectorAll('#gallery-grid .gallery-thumb').forEach(function (thumb) {
      initDragOnThumb(thumb)
      var btn = thumb.querySelector('.thumb-delete')
      if (btn) btn.addEventListener('click', function () { deleteGalleryImage(btn.dataset.filename) })
    })
    updateGalleryCount()
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
      status.style.color = '#0f5fd7'
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
      'schedule.activities': '',
      'schedule.days': { label: '', date: '', items: [{ time: '', endTime: '', title: '', desc: '' }] },
      'schedule.days.[].items': { time: '', endTime: '', title: '', desc: '' },
      'announcements.items': { title: '', desc: '', date: '', url: '' }
    }

    var key = canonicalPath(path)
    return templates[key] !== undefined ? deepClone(templates[key]) : ''
  }

  function renderPrimitiveEditor(options) {
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
        '<div class="gallery-caption-chip">' + esc(item.filename) + '</div>'
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
    if (saveBtn) backdrop.addEventListener('click', closeEditor)
    if (saveBtn) saveBtn.addEventListener('click', saveFullContent)

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeEditor()
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
    galleryFilesState = JSON.parse(galleryEl.textContent || '[]')
    syncGalleryOrderToState()
    clearDirty()
    updateSectionNav(currentTarget)
  }

  document.addEventListener('DOMContentLoaded', function () {
    initState()
    initTabs()
    initLogoUpload()
    initGalleryUpload()
    initExistingThumbs()
    bindSaveButtons()
    initLiveEditorSidebar()
    initLiveEditorToolbar()
    initLiveEditorModal()
    initPreviewMessaging()
    updatePreviewDevice('desktop')
  })
})()
