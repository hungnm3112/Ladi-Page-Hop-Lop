require('dotenv').config()
const express = require('express')
const session = require('express-session')
const path = require('path')
const { startJsonBackupCron } = require('./services/backup.service')

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'data/content.json')

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

app.use(session({
  secret: process.env.SESSION_SECRET || 'ladipage-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}))

app.use('/', require('./routes/index'))
app.use('/admin', require('./routes/admin'))

startJsonBackupCron({
  sourceFile: DATA_FILE,
  backupDir: path.join(__dirname, 'data/backups')
})

app.listen(PORT, () => {
  console.log(`\n🚀 Server chạy tại: http://localhost:${PORT}`)
  console.log(`⚙️  Admin panel:     http://localhost:${PORT}/admin`)
  console.log(`   Mật khẩu admin: ${process.env.ADMIN_PASSWORD || 'admin123'}\n`)
})
