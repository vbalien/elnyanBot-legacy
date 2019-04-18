const delBtnOption = require('../index').delBtnOption

module.exports = [
  context => {
    context.program.command('help').action(() => {
      context.bot.sendMessage(context.msg.chat.id, context.program.commandHelp(), delBtnOption())
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
      .action(options => require('./anitable.js')(context, options))
  },
  context => {
    context.program
      .command('memo [name]')
      .option('-d, --delete')
      .description('메모할 글을 먼저 작성 후 답글로 명령어 실행')
      .action((name, options) => require('./memo.js')(context, name, options))
  },
  context => {
    context.program
      .command('count [seconds] [last_msg]')
      .description('카운트다운 seconds <= 20')
      .action(async (seconds, last_msg = 0) => {
        if (typeof seconds !== 'number') seconds = parseInt(seconds)
        if (seconds > 20 || isNaN(seconds)) {
          context.bot.sendMessage(context.msg.chat.id, '20이하의 수를 입력해주세요.', delBtnOption())
          return
        }
        const tmr = async () => {
          await context.bot.sendMessage(context.msg.chat.id, seconds-- || last_msg)
          if (seconds >= 0) setTimeout(tmr, 1000)
        }
        tmr()
      })
  }
]