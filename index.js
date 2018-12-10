process.env.NTBA_FIX_319 = 1;
const TelegramBot = require('node-telegram-bot-api');
const Koa = require('koa');
const _ = require('koa-route');
const bodyParser = require('koa-bodyparser');

const TOKEN = process.env.TELEGRAM_TOKEN;
const url = process.env.URL;
const port = process.env.PORT;
const bot = new TelegramBot(TOKEN);

bot.setWebHook(`${url}/bot${TOKEN}`);

const app = new Koa();
app.use(bodyParser);

app.use(_.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
}));

app.listen(port, () => {
  console.log(`Express server is listening on ${port}`);
});

bot.on('message', msg => {
  bot.sendMessage(msg.chat.id, 'I am alive!');
});