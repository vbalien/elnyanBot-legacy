process.env.NTBA_FIX_319 = 1
const TelegramBot = require('node-telegram-bot-api')
const Koa = require('koa')
const _ = require('koa-route')
const bodyParser = require('koa-bodyparser')
const parse = require('shell-quote').parse
const commands = require('./commands')

const TOKEN = process.env.TELEGRAM_TOKEN
const url = process.env.URL
const port = process.env.PORT
const bot = new TelegramBot(TOKEN)
const program = require('commander')


bot.setWebHook(`${url}/bot${TOKEN}`)

const app = new Koa()
app.use(bodyParser())

app.use(_.post(`/bot${TOKEN}`, ctx => {
  bot.processUpdate(ctx.request.body)
  ctx.status = 200
}))

app.listen(port, () => {
  console.log(`Koa server is listening on ${port}`)
})

bot.on('message', msg => {
  const context = { msg, bot, program: new program.Command() }
  for (cmd of commands) {
    cmd(context)
  }

  const re1 = /\/(.*)(?:@(?:[^ ]*))(.*)/i
  const re2 = /\/([^ ]*)(.*)/i
  if (!msg.text) return
  const match = msg.text.match(re1) || msg.text.match(re2)
  let tmp_argv = parse(context.msg.text)
  if (match) {
    tmp_argv[0] = match[1]
    const argv = [
      process.argv[0],
      process.argv[1],
      ...tmp_argv
    ]
    context.program.parse(argv)
  }
})

bot.on('callback_query', async function (callbackQuery) {
  const context = { callbackQuery, bot, program: new program.Command() }
  for (cmd of commands) {
    cmd(context)
  }

  const re = /\/([^ ]*)(.*)/i
  const match = callbackQuery.data.match(re)

  let tmp_argv = parse(callbackQuery.data)
  tmp_argv[0] = match[1]
  const argv = [
    process.argv[0],
    process.argv[1],
    ...tmp_argv
  ]
  context.program.parse(argv)
})
