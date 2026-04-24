;(function () {
  'use strict'

  var donateModal = document.getElementById('donate-modal')
  var donateBackdrop = document.getElementById('donate-modal-backdrop')
  var donateClose = document.getElementById('donate-modal-close')
  var donateForm = document.getElementById('donate-form')
  var donateSubmit = document.getElementById('donate-submit')
  var donateMessage = document.getElementById('donate-form-message')
  var donateType = document.getElementById('donate-type')
  var donateAmountInput = document.getElementById('donate-amount-input')
  var donateKindTabs = Array.from(document.querySelectorAll('[data-donate-kind]'))
  var donatePanels = Array.from(document.querySelectorAll('[data-donate-panel]'))
  var amountButtons = Array.from(document.querySelectorAll('[data-donate-amount]'))
  var donateBoardRoots = Array.from(document.querySelectorAll('[data-donate-board-root]'))
  var DONATE_PAGE_SIZE = 10

  function setDonateMessage(message, type) {
    if (!donateMessage) return
    if (!message) {
      donateMessage.hidden = true
      donateMessage.textContent = ''
      donateMessage.className = 'donate-form-message'
      return
    }

    donateMessage.hidden = false
    donateMessage.textContent = message
    donateMessage.className = 'donate-form-message ' + (type || 'info')
  }

  function formatNumber(value) {
    var num = Number(value || 0)
    if (!isFinite(num)) num = 0
    return num.toLocaleString('vi-VN')
  }

  function normalizeAmount(value) {
    return String(value || '').replace(/[^\d]/g, '')
  }

  function openDonateModal() {
    if (!donateModal) return
    donateModal.classList.add('active')
    donateModal.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    setDonateMessage('')
  }

  function closeDonateModal() {
    if (!donateModal) return
    donateModal.classList.remove('active')
    donateModal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  function activateDonateKind(kind) {
    if (!donateType) return
    donateType.value = kind
    donateKindTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-donate-kind') === kind)
    })
    donatePanels.forEach(function (panel) {
      var active = panel.getAttribute('data-donate-panel') === kind
      panel.classList.toggle('active', active)
      panel.hidden = !active
    })
  }

  function renderBoardPanel(panel) {
    if (!panel) return
    var items = Array.from(panel.querySelectorAll('[data-donate-page-item]'))
    var pagination = panel.querySelector('[data-donate-pagination]')
    if (!pagination) return

    if (items.length <= DONATE_PAGE_SIZE) {
      items.forEach(function (item) { item.hidden = false })
      pagination.hidden = true
      pagination.innerHTML = ''
      panel.dataset.currentPage = '1'
      return
    }

    var totalPages = Math.ceil(items.length / DONATE_PAGE_SIZE)
    var currentPage = parseInt(panel.dataset.currentPage || '1', 10) || 1
    if (currentPage > totalPages) currentPage = totalPages
    if (currentPage < 1) currentPage = 1
    panel.dataset.currentPage = String(currentPage)

    var start = (currentPage - 1) * DONATE_PAGE_SIZE
    var end = start + DONATE_PAGE_SIZE
    items.forEach(function (item, index) {
      item.hidden = index < start || index >= end
    })

    pagination.hidden = false
    pagination.innerHTML = ''

    for (var page = 1; page <= totalPages; page++) {
      var button = document.createElement('button')
      button.type = 'button'
      button.className = 'donate-pagination-btn' + (page === currentPage ? ' active' : '')
      button.textContent = String(page)
      button.dataset.page = String(page)
      button.addEventListener('click', function () {
        panel.dataset.currentPage = this.dataset.page
        renderBoardPanel(panel)
      })
      pagination.appendChild(button)
    }
  }

  function activateBoardTab(root, kind) {
    if (!root) return
    var boardTabs = Array.from(root.querySelectorAll('[data-donate-board-tab]'))
    var boardPanels = Array.from(root.querySelectorAll('[data-donate-board-panel]'))

    boardTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-donate-board-tab') === kind)
    })
    boardPanels.forEach(function (panel) {
      var active = panel.getAttribute('data-donate-board-panel') === kind
      panel.classList.toggle('active', active)
      if (active) renderBoardPanel(panel)
    })
  }

  function initDonateBoard(root) {
    if (!root) return
    var boardTabs = Array.from(root.querySelectorAll('[data-donate-board-tab]'))
    var boardPanels = Array.from(root.querySelectorAll('[data-donate-board-panel]'))
    var activeTab = 'class'

    boardPanels.forEach(function (panel) {
      panel.dataset.currentPage = panel.dataset.currentPage || '1'
      renderBoardPanel(panel)
      if (panel.classList.contains('active')) {
        activeTab = panel.getAttribute('data-donate-board-panel') || activeTab
      }
    })

    boardTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activateBoardTab(root, tab.getAttribute('data-donate-board-tab'))
      })
    })

    activateBoardTab(root, activeTab)
  }

  document.querySelectorAll('[data-donate-open]').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      if (!donateModal) return
      e.preventDefault()
      openDonateModal()
    })
  })

  if (donateBackdrop) donateBackdrop.addEventListener('click', closeDonateModal)
  if (donateClose) donateClose.addEventListener('click', closeDonateModal)

  donateKindTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateDonateKind(tab.getAttribute('data-donate-kind'))
    })
  })

  amountButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-donate-amount') || ''
      if (donateAmountInput) donateAmountInput.value = formatNumber(value)
      amountButtons.forEach(function (item) { item.classList.toggle('active', item === button) })
    })
  })

  if (donateAmountInput) {
    donateAmountInput.addEventListener('input', function () {
      var clean = normalizeAmount(donateAmountInput.value)
      donateAmountInput.value = clean ? formatNumber(clean) : ''
      amountButtons.forEach(function (item) {
        item.classList.toggle('active', item.getAttribute('data-donate-amount') === clean)
      })
    })
  }

  if (donateForm) {
    donateForm.addEventListener('submit', function (e) {
      e.preventDefault()

      var payload = {
        type: donateType ? donateType.value : 'personal',
        name: donateForm.querySelector('[name="name"]') ? donateForm.querySelector('[name="name"]').value.trim() : '',
        className: donateForm.querySelector('[name="className"]') ? donateForm.querySelector('[name="className"]').value.trim() : '',
        contactName: donateForm.querySelector('[name="contactName"]') ? donateForm.querySelector('[name="contactName"]').value.trim() : '',
        organizationName: donateForm.querySelector('[name="organizationName"]') ? donateForm.querySelector('[name="organizationName"]').value.trim() : '',
        amount: normalizeAmount(donateAmountInput ? donateAmountInput.value : ''),
        message: donateForm.querySelector('[name="message"]') ? donateForm.querySelector('[name="message"]').value.trim() : '',
        anonymous: donateForm.querySelector('[name="anonymous"]') ? donateForm.querySelector('[name="anonymous"]').checked : false
      }

      if (!payload.amount) {
        setDonateMessage('Vui lòng nhập số tiền đóng góp.', 'error')
        return
      }

      if (payload.type === 'personal' && (!payload.name || !payload.className)) {
        setDonateMessage('Vui lòng nhập họ tên và lớp.', 'error')
        return
      }

      if (payload.type === 'organization' && (!payload.contactName || !payload.organizationName)) {
        setDonateMessage('Vui lòng nhập người liên hệ và tên tổ chức.', 'error')
        return
      }

      donateSubmit.disabled = true
      donateSubmit.textContent = 'ĐANG GỬI...'
      setDonateMessage('')

      fetch('/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json() })
        .then(function (result) {
          if (!result.ok) {
            setDonateMessage(result.message || 'Không thể lưu thông tin đóng góp lúc này.', 'error')
            return
          }

          setDonateMessage('Đã ghi nhận thông tin đóng góp. Đang chuyển tới trang thống kê...', 'success')
          donateForm.reset()
          amountButtons.forEach(function (item) { item.classList.remove('active') })
          activateDonateKind('personal')
          window.setTimeout(function () {
            window.location.href = '/donate'
          }, 700)
        })
        .catch(function () {
          setDonateMessage('Lỗi kết nối. Vui lòng thử lại.', 'error')
        })
        .finally(function () {
          donateSubmit.disabled = false
          donateSubmit.textContent = 'XÁC NHẬN ĐÓNG GÓP'
        })
    })
  }

  if (donateType) activateDonateKind(donateType.value || 'personal')
  donateBoardRoots.forEach(initDonateBoard)

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && donateModal && donateModal.classList.contains('active')) closeDonateModal()
  })
})()
