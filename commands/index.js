module.exports = {
  help: context => {
    context.bot.sendMessage(context.msg.chat.id, '너가 알아서 해라')
  },
  anitable: require('./anitable.js')
}
