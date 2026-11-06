'use strict';
const net = require('node:net');

function validateInput(input, content) {
  if (!input || typeof input !== 'object') throw Error('Не переданы данные фотографии.');
  if (typeof input.project !== 'string' || !Object.hasOwn(content.projects, input.project)) throw Error('Выберите существующий проект.');
  if (typeof input.url !== 'string' || input.url.length > 4096) throw Error('Укажите прямую ссылку на фотографию.');
  let url;
  try { url = new URL(input.url.trim()); } catch { throw Error('Некорректный URL фотографии.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw Error('Нужна HTTPS-ссылка без пароля и нестандартного порта.');
  if (!url.hostname.includes('.') || url.hostname.endsWith('.local') || url.hostname.endsWith('.localhost')) throw Error('Нужна общедоступная ссылка на фотографию.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && !isPublicAddress(host)) throw Error('Локальные адреса недоступны.');
  url.hash = '';
  const alt = typeof input.alt === 'string' ? input.alt.trim().replace(/\s+/g, ' ') : '';
  if (alt.length > 300 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(alt)) throw Error('Описание должно быть не длиннее 300 символов.');
  return { project: input.project, url: url.href, alt };
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || b === 88 && c === 99)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) || (a === 203 && b === 0 && c === 113));
  }
  // Only global unicast IPv6. Exclude transition and documentation networks.
  return family === 6 && /^[23][0-9a-f]{3}:/i.test(address) &&
    !/^2001:(0*:|0*db8:|0*2:)/i.test(address) && !/^2002:/i.test(address);
}

module.exports = {validateInput, isPublicAddress};
