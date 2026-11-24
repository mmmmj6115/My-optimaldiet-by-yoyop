/* 인증사진 처리 — 선택/촬영한 사진을 900px 이하 JPEG(약 80KB 이하)로 압축하고
 * 오른쪽 아래에 촬영 날짜·시각과 항목명을 찍어 데이터 URL로 돌려줍니다.
 * (이미지·캔버스는 함수 안에서만 쓰므로 DOM 없이도 파일을 불러올 수 있습니다.)
 */
(function (global) {
  'use strict';

  var MAX_SIDE = 900;
  var MAX_BYTES = 80000;                 // 약 80KB
  var QUALITY = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function stampText(date) {
    var d = date instanceof Date ? date : new Date(date || Date.now());
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* 로컬 시간대를 붙인 ISO 문자열 (앱의 다른 기록 시각과 같은 형식) */
  function isoLocal(d) {
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? '+' : '-';
    var abs = Math.abs(off);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':00' +
      sign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60);
  }

  function dataUrlBytes(dataUrl) {
    var s = String(dataUrl || '');
    var i = s.indexOf(',');
    if (i < 0) return 0;
    return Math.round((s.length - i - 1) * 0.75);
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  var FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';

  function drawStamp(ctx, w, h, text) {
    var fs = Math.max(13, Math.round(w * 0.036));
    ctx.font = '700 ' + fs + 'px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var padX = Math.round(fs * 0.6);
    var padY = Math.round(fs * 0.42);
    var tw = ctx.measureText(text).width;
    var bw = Math.min(w - 12, tw + padX * 2);
    var bh = fs + padY * 2;
    var m = Math.round(Math.max(8, w * 0.026));
    var x = Math.max(6, w - bw - m);
    var y = Math.max(6, h - bh - m);
    ctx.fillStyle = 'rgba(10, 22, 16, 0.58)';
    roundRect(ctx, x, y, bw, bh, Math.round(bh * 0.34));
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x + padX, y + bh / 2 + 1);
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(String(file.type || ''))) {
        reject(new Error('이미지 파일만 올릴 수 있어요'));
        return;
      }
      var URLObj = global.URL || global.webkitURL;
      var url = null;
      try { url = URLObj.createObjectURL(file); } catch (e) { url = null; }
      if (!url) { reject(new Error('사진을 열지 못했어요')); return; }
      var img = new global.Image();
      img.onload = function () {
        try { URLObj.revokeObjectURL(url); } catch (e) { /* 무시 */ }
        resolve(img);
      };
      img.onerror = function () {
        try { URLObj.revokeObjectURL(url); } catch (e) { /* 무시 */ }
        reject(new Error('사진을 읽지 못했어요. 다른 사진으로 다시 시도해주세요.'));
      };
      img.src = url;
    });
  }

  /* file → { dataUrl, at, label, w, h, bytes } */
  function compress(file, label, when) {
    var date = when instanceof Date ? when : new Date();
    var text = stampText(date) + ' · ' + (label || '인증');
    return loadImage(file).then(function (img) {
      var srcW = img.naturalWidth || img.width;
      var srcH = img.naturalHeight || img.height;
      var scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
      var w0 = Math.max(1, Math.round(srcW * scale));
      var h0 = Math.max(1, Math.round(srcH * scale));

      function render(cw, ch) {
        var canvas = global.document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        drawStamp(ctx, cw, ch, text);
        return canvas;
      }

      return new Promise(function (resolve) {
        var cw = w0, ch = h0, qi = 0, guard = 0;
        function step() {
          guard++;
          var url = render(cw, ch).toDataURL('image/jpeg', QUALITY[qi]);
          var bytes = dataUrlBytes(url);
          if (bytes <= MAX_BYTES || guard > 14) {
            resolve({ dataUrl: url, at: isoLocal(date), label: label || '인증', w: cw, h: ch, bytes: bytes });
            return;
          }
          if (qi < QUALITY.length - 1) { qi++; step(); return; }
          if (cw > 420) {
            cw = Math.max(320, Math.round(cw * 0.82));
            ch = Math.max(320, Math.round(ch * 0.82));
            qi = 0;
            step();
            return;
          }
          resolve({ dataUrl: url, at: isoLocal(date), label: label || '인증', w: cw, h: ch, bytes: bytes });
        }
        step();
      });
    });
  }

  global.App = global.App || {};
  global.App.Photo = {
    MAX_SIDE: MAX_SIDE,
    MAX_BYTES: MAX_BYTES,
    stampText: stampText,
    isoLocal: isoLocal,
    dataUrlBytes: dataUrlBytes,
    compress: compress
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.App.Photo; }
})(typeof window !== 'undefined' ? window : globalThis);
