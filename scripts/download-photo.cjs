'use strict';
const https = require('node:https');
const dns = require('node:dns/promises');
const {isPublicAddress} = require('./photo-input.cjs');
const MAX_BYTES = 40 * 1024 * 1024;

async function downloadPhoto(value, redirects = 0) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw Error('Разрешены только общедоступные HTTPS-ссылки.');
  if (redirects > 4) throw Error('Слишком много переадресаций у фотографии.');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = await dns.lookup(hostname, {all: true});
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw Error('Источник фотографии использует закрытый сетевой адрес.');
  const response = await new Promise((resolve,reject) => {
    const req = https.get(url, {
      headers: {'User-Agent':'DenisVoloshinPhotoImport/1.0', Accept:'image/jpeg,image/png,image/webp'},
      // Pin the checked DNS result, including after each redirect.
      lookup(_host, options, callback) {
        const candidates = options.family ? addresses.filter(a => a.family === options.family) : addresses;
        if (!candidates.length) return callback(Error('Не удалось разрешить адрес фотографии.'));
        options.all ? callback(null,candidates) : callback(null,candidates[0].address,candidates[0].family);
      },
      signal: AbortSignal.timeout(45000)
    }, resolve);
    req.on('error',reject);
  });
  if ([301,302,303,307,308].includes(response.statusCode)) {
    const next = response.headers.location; response.destroy();
    if (!next) throw Error('Источник вернул переадресацию без адреса.');
    return downloadPhoto(new URL(next,url).href,redirects + 1);
  }
  if (response.statusCode !== 200) { response.destroy(); throw Error('Фотография недоступна: HTTP '+response.statusCode); }
  if (!/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers['content-type'] || '')) { response.destroy(); throw Error('Ссылка должна вести на JPEG, PNG или WebP.'); }
  if (Number(response.headers['content-length']) > MAX_BYTES) { response.destroy(); throw Error('Размер фотографии превышает 40 МБ.'); }
  const chunks = []; let size = 0;
  for await (const chunk of response) {
    size += chunk.length;
    if (size > MAX_BYTES) { response.destroy(); throw Error('Размер фотографии превышает 40 МБ.'); }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
module.exports = {downloadPhoto,MAX_BYTES};
