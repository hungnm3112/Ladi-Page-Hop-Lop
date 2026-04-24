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
  var donatePersonalOnly = Array.from(document.querySelectorAll('[data-donate-personal-only]'))
  var amountButtons = Array.from(document.querySelectorAll('[data-donate-amount]'))
  var boardTabs = Array.from(document.querySelectorAll('[data-donate-board-tab]'))
  var boardPanels = Array.from(document.querySelectorAll('[data-donate-board-panel]'))

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
    donatePersonalOnly.forEach(function (row) {
      row.hidden = kind !== 'personal'
    })
  }

  function activateBoardTab(kind) {
    boardTabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.getAttribute('data-donate-board-tab') === kind)
    })
    boardPanels.forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-donate-board-panel') === kind)
    })
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

  boardTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      activateBoardTab(tab.getAttribute('data-donate-board-tab'))
    })
  })

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
  if (boardTabs.length > 0) activateBoardTab('class')

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && donateModal && donateModal.classList.contains('active')) closeDonateModal()
  })
})()
