const anitable = require('./anitable.js')

module.exports = [
  context => {
    context.program.command('help').action(() => {
      context.bot.sendMessage(context.msg.chat.id, context.program.commandHelp())
    }).description('도움말')
  },
  context => {
    context.program
      .command('anitable')
      .option('-w, --current_week [week_num]')
      .option('-l, --subtitle_list')
      .option('-g, --get_subtitle [anime_id]')
      .option('-d, --download_subtitle [subtitle_id]')
      .description('애니편성표 보기')
      .action(options => anitable(context, options))
  }
]
