const fs = require('fs')
const path = require('path')

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

function formatTimestamp(date) {
  const pad = value => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + '_' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('-')
}

function backupJsonFile(options = {}) {
  const sourceFile = options.sourceFile
  const backupDir = options.backupDir || path.join(path.dirname(sourceFile), 'backups')

  if (!sourceFile || !fs.existsSync(sourceFile)) {
    console.warn('[backup] Data file not found, skipped backup.')
    return null
  }

  const raw = fs.readFileSync(sourceFile, 'utf8')
  JSON.parse(raw)

  fs.mkdirSync(backupDir, { recursive: true })

  const ext = path.extname(sourceFile) || '.json'
  const baseName = path.basename(sourceFile, ext)
  const backupFile = path.join(backupDir, `${baseName}-${formatTimestamp(new Date())}${ext}`)

  fs.writeFileSync(backupFile, raw, 'utf8')
  console.log(`[backup] Created JSON backup: ${backupFile}`)
  return backupFile
}

function startJsonBackupCron(options = {}) {
  const intervalMs = Number(options.intervalMs) || FOUR_HOURS_MS

  const runBackup = () => {
    try {
      backupJsonFile(options)
    } catch (error) {
      console.error('[backup] Failed to create JSON backup:', error.message)
    }
  }

  const timer = setInterval(runBackup, intervalMs)
  if (typeof timer.unref === 'function') timer.unref()

  console.log(`[backup] JSON backup cron started, interval: ${Math.round(intervalMs / 3600000)}h`)
  return timer
}

module.exports = {
  backupJsonFile,
  startJsonBackupCron
}
