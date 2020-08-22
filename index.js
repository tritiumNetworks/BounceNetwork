const { readFileSync, appendFileSync, mkdirSync, writeFileSync, existsSync } = require('fs')
const momunt = require('moment')
if (!existsSync('./log')) mkdirSync('./log')
if (!existsSync('./log/log-' + momunt().format('YYYY-MM-DD') + '.log')) writeFileSync('./log/log-' + momunt().format('YYYY-MM-DD') + '.log', '')

// ---

let settings
const { parse } = require('yaml')
const bouncy = require('bouncy')
const uuid = require('uuid').v4
const s1 = bouncy(mtx)
const s2 = bouncy({ cert: './cert/trinets-cert.pem', key: './cert/trinets-key.pem' }, mtx)

s1.listen(80)
s2.listen(443)

// ---

function mtx (req, res, bounce) {
  const code = uuid().slice(0, 10)

  const ip =
    req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || (req.connection.socket ? req.connection.socket.remoteAddress : null)

  const host = req.headers.host
  const rstr = settings.locale[req.socket.localPort !== 443 ? 'log' : 'slog'].replace('$ip', ip).replace('$host', host).replace('$code', code)

  if (settings.blacklist.find((str) => ip.match(new RegExp(str)))) {
    res.end(settings.locale.blocked.replace('$ip', ip).replace('$host', host).replace('$code', code))
    log(rstr.replace('$togo', '[!blocked]'))
    return
  }

  const target = settings.bounce[host]

  if (!target) {
    res.end(settings.locale.notpermitted.replace('$ip', ip).replace('$host', host).replace('$code', code))
    log(rstr.replace('$togo', '[!no-permit]'))
    return
  }
  
  if (Number.isNaN(Number(target))) {
    res.end(target)
    log(rstr.replace('$togo', '[pre-written]'))
    return
  }

  bounce(target)
  log(rstr.replace('$togo', target))
}

// ---

getSetting()
setInterval(getSetting, 1000)

function getSetting () {
  const raw = readFileSync('./settings.yaml', 'utf-8')
  settings = parse(raw)
  if (!settings.bounce) settings.bounce = {}
  if (!settings.blacklist) settings.blacklist = []
}

// ---
function log (str) {
  console.log(str)
  appendFileSync('./log/log-' + momunt().format('YYYY-MM-DD') + '.log', str + '\n')
}
