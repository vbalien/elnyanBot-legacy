process.env.NTBA_FIX_319 = 1
const TelegramBot = require('node-telegram-bot-api')
const Koa = require('koa')
const _ = require('koa-route')
const bodyParser = require('koa-bodyparser')
const commands = require('./commands')

const TOKEN = process.env.TELEGRAM_TOKEN
const url = process.env.URL
const port = process.env.PORT
const bot = new TelegramBot(TOKEN)

bot.setWebHook(`${url}/bot${TOKEN}`)

const app = new Koa()
app.use(bodyParser())

app.use(_.post(`/bot${TOKEN}`, ctx => {
  bot.processUpdate(ctx.request.body)
  ctx.status = 200
}))

app.listen(port, () => {
  console.log(`Express server is listening on ${port}`)
})

bot.on('message', msg => {
  const re1 = /\/(.*)(?:@(?:[^ ]*))(.*)/i
  const re2 = /\/([^ ]*)(.*)/i
  if (!msg.text) return
  const match = msg.text.match(re1) || msg.text.match(re2)
  const context = { msg, bot }
  if (match === null) return
  if (Object.keys(commands).find(el => el === match[1])) {
    commands[match[1]](context, match[2].trim())
  }
})

bot.on('callback_query', async function (callbackQuery) {
  const re = /\/([^ ]*)(.*)/i
  const match = callbackQuery.data.match(re)
  const context = { callbackQuery, bot }
  if (match && Object.keys(commands).find(el => el === match[1])) {
    commands[match[1]](context, match[2].trim())
  }
})
