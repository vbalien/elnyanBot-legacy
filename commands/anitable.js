const axios = require('axios')
const mongoose = require('mongoose')
const moment = require('moment')
const url = require('url')
const path = require('path')

mongoose.connect('mongodb://localhost/anitable', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  // Connected
})
const subtitleSchema = new mongoose.Schema({
  i: Number,
  author: String,
  episode: Number,
  releaseDate: Date,
  fileUrl: String
})
const Subtitle = mongoose.model('Subtitle', subtitleSchema)

setInterval(() => {
  const now = moment()
  const begin = now.clone().add(-10, 'hours')
  const callback = date => res => {
    const data = res.data
    for (const el of data) {
      const elTime = date.clone().hour(parseInt(el.t.slice(0, 2)))
        .minute(parseInt(el.t.slice(2, 4)))
      if (begin <= elTime && now >= elTime) {
        axios.get(`http://www.anissia.net/anitime/cap?i=${el.i}`).then(res => {
          const data = res.data.map(el => ({
            url: el.a,
            date: moment(el.d, 'YYYYMMDDHHmmss'),
            author: el.n,
            episode: parseInt(el.s)
          }))
          Subtitle.find({ i: el.i, episode: data[0].episode }, (err, res) => {
            if (res.length === 0) {
              Subtitle.create({
                i: el.i,
                author: data[0].author,
                episode: data[0].episode,
                releaseDate: data[0].date,
                fileUrl: data[0].url
              }, (err, res) => {
                if (err) console.log(err)
              })
            }
            if (err) console.log(err)
          })
        })
      }
    }
  }
  axios.get(`http://www.anissia.net/anitime/list?w=${begin.day()}`).then(callback(begin))
  if (begin.day() !== now.day()) {
    axios.get(`http://www.anissia.net/anitime/list?w=${now.day()}`).then(callback(now))
  }
}, 1000 * 60 * 5)

const dayList = ['일', '월', '화', '수', '목', '금', '토']
const buttons = currentDay => ({
  inline_keyboard: [
    dayList.map((el, idx) => ({
      text: idx === currentDay ? `*${el}` : el,
      callback_data: `/anitable ${idx}`
    })),
    [{ text: '자막받기', callback_data: `/anitable sublist ${currentDay}` }]
  ]
})
const getAnitable = async function (arg) {
  const day = parseInt(arg || moment().day())
  const res = await axios.get(`http://www.anissia.net/anitime/list?w=${day}`)
  const data = res.data
  return {
    text: `*${dayList[day]}요일 애니 편성표*
━━━━━━━━━━━━━━━
${data.reduce((prev, curr) => `${prev}${curr.t.slice(0, 2).concat(':', curr.t.slice(2, 4))} │ ${curr.s}\n`, '')}`,
    options: {
      reply_markup: {
        ...buttons(day)
      },
      parse_mode: 'markdown'
    }
  }
}

const getSublist = async function (day) {
  const res = await axios.get(`http://www.anissia.net/anitime/list?w=${day}`)
  const data = res.data
  return {
    text: '자막받을 애니를 선택해주세요.',
    options: {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [
          ...data.map(el => [{ text: `${el.t.slice(0, 2).concat(':', el.t.slice(2, 4))} - ${el.s}`, callback_data: `/anitable selsub ${el.i}` }]),
          [{ text: '돌아가기', callback_data: `/anitable ${day}` }]
        ]
      }
    }
  }
}

const parseBlog = async function (url) {
  const res = await axios.get(url)
  const reNaverScreen = /<frame id="screenFrame" name="screenFrame" src='([^']*)'/
  const reNaverMain = /<iframe id="mainFrame" name="mainFrame" src="([^"]*)"/
  const reGoogleOpenToken = /http(?:s|):\/\/drive\.google\.com\/open\?(?:[^&]*|)(?:&|&amp;|)id(?:&#61;|=)([^'"&]*)/gi
  const reGoogleUcToken = /http(?:|s):\/\/drive\.google\.com\/uc\?(?:[^&]*|)(?:&|&amp;|)id(?:&#61;|=)([^'"&]*)/gi
  const reGoogleFileToken = /http(?:s|):\/\/drive\.google\.com\/file\/d\/([^'"&/]*)/gi
  const reNaverFile = /'encodedAttachFileUrl': '([^']*)'/g
  const reEgloosFIle = /(http(?:s|):\/\/pds[^.]*\.egloos\.com\/pds[^'"]*)/gi
  const reTistoryFile = /(http(?:s|):\/\/[^.]*\.tistory\.com\/attachment\/[^'"]*)/gi
  const naverScreen = res.data.match(reNaverScreen)
  const naverMain = res.data.match(reNaverMain)
  if (naverScreen) {
    return parseBlog(naverScreen[1])
  } else if (naverMain) {
    return parseBlog(`http://blog.naver.com${naverMain[1]}`)
  } else {
    const getLinks = (re, isGoogle = false) => {
      let match
      let results = []
      while ((match = re.exec(res.data)) !== null) {
        if (isGoogle) results.push(`https://drive.google.com/uc?id=${match[1]}`)
        else results.push(match[1])
      }
      return results.length === 0 ? null : results
    }
    let result = getLinks(reGoogleOpenToken, true) ||
      getLinks(reGoogleFileToken, true) ||
      getLinks(reGoogleUcToken, true) ||
      getLinks(reNaverFile) ||
      getLinks(reEgloosFIle) ||
      getLinks(reTistoryFile)
    return result
  }
}

const selSub = async function (i) {
  return {
    text: '에피소드를 선택해주세요.',
    options: {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [
          ...(await Subtitle.find({ i })).map(el => [{ text: `${el.episode / 10}화 - ${el.author} ${moment(el.releaseDate).locale('ko').fromNow()}`, callback_data: `/anitable downsub ${el._id}` }]),
          [{ text: '처음으로', callback_data: `/anitable` }]
        ]
      }
    }
  }
}

const downSub = async function (_id) {
  const fileUrl = (await Subtitle.findById(_id)).fileUrl
  const urls = await parseBlog(encodeURI(fileUrl))
  const buttons = await Promise.all(urls.filter(el => path.extname(url.parse(el).pathname).match(/\.(jpg|jpeg|gif|png)/i) === null).map(async function (el) {
    const re1 = /filename\*=UTF-8''(.*)/i
    const re2 = /filename="(.*)"/i
    let text = (await axios.head(el)).headers['content-disposition']
    if (text === undefined) {
      text = path.basename(url.parse(el).pathname)
    } else {
      let match = text.match(re1)
      if (!match) match = text.match(re2)
      if (match) text = decodeURIComponent(match[1])
    }
    return [{
      text,
      url: el
    }]
  }))
  return {
    text: '파일 목록',
    options: {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [
          ...buttons,
          [{ text: '처음으로', callback_data: `/anitable` }]
        ]
      }
    }
  }
}

module.exports = async function (context, arg) {
  const args = arg.split(' ')
  if (args[0] === 'sublist') {
    const outmsg = await getSublist(args[1])
    context.bot.editMessageText(outmsg.text, {
      chat_id: context.callbackQuery.message.chat.id,
      message_id: context.callbackQuery.message.message_id,
      ...outmsg.options
    })
  } else if (args[0] === 'selsub') {
    const outmsg = await selSub(args[1])
    context.bot.editMessageText(outmsg.text, {
      chat_id: context.callbackQuery.message.chat.id,
      message_id: context.callbackQuery.message.message_id,
      ...outmsg.options
    })
  } else if (args[0] === 'downsub') {
    const outmsg = await downSub(args[1])
    context.bot.editMessageText(outmsg.text, {
      chat_id: context.callbackQuery.message.chat.id,
      message_id: context.callbackQuery.message.message_id,
      ...outmsg.options
    })
  } else {
    const outmsg = await getAnitable(arg)
    context.msg
      ? context.bot.sendMessage(context.msg.chat.id, outmsg.text, outmsg.options)
      : context.bot.editMessageText(outmsg.text, {
        chat_id: context.callbackQuery.message.chat.id,
        message_id: context.callbackQuery.message.message_id,
        ...outmsg.options
      })
  }
}
