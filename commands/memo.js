const mongoose = require('mongoose')
const delBtnOption = require('../index').delBtnOption

const memoSchema = new mongoose.Schema({
  message_id: Number,
  from_id: Number,
  chat_id: Number,
  name: String
})
const Memo = mongoose.model('Memo', memoSchema)

module.exports = async (context, name, options) => {
  context.msg = context.msg || context.callbackQuery.message
  if (context.msg && context.msg.reply_to_message && name) {
    const res = await Memo.updateOne({
      chat_id: context.msg.chat.id,
      name
    }, {
      message_id: context.msg.reply_to_message.message_id,
      chat_id: context.msg.chat.id,
      name
    }, { upsert : true })
    context.bot.sendMessage(context.msg.chat.id, '메모를 저장했어요.', delBtnOption())
  } else if (options.delete && name) {
    await Memo.findOneAndDelete({ chat_id: context.msg.chat.id, name })
    context.bot.sendMessage(context.msg.chat.id, '메모를 지웠어요.', delBtnOption())
  } else if (name) {
    const memo = await Memo.findOne({ chat_id: context.msg.chat.id, name })
    if (memo) {
      context.bot.deleteMessage(context.msg.chat.id, context.msg.message_id)
      context.bot.forwardMessage(context.msg.chat.id, memo.chat_id, memo.message_id)
      // context.bot.sendMessage(context.msg.chat.id, name, {
      //  reply_to_message_id: memo.message_id,
      //  reply_markup: delBtnOption().reply_markup
      // })
    } else {
      context.bot.sendMessage(context.msg.chat.id, '메모를 찾지 못했어요.', delBtnOption())
    }
  } else {
    context.bot.sendMessage(context.msg.chat.id, '메모 목록', {
      reply_markup: {
        inline_keyboard: [
          ...(await Memo.find({ chat_id: context.msg.chat.id })).map(el => [{ text: el.name, callback_data: `/memo ${el.name}` }]),
          delBtnOption('취소').reply_markup.inline_keyboard[0]
        ]
      }
    })
  }
}