/* 28일 최종 리포트 이미지 — 순수 브라우저 Canvas (외부 CDN·라이브러리 없음)
 * 화면(HTML)과 같은 데이터(App.Model.finalReport)를 받아 요약 카드 PNG를 그립니다.
 * 그리기 명령을 먼저 plan()으로 만들기 때문에 DOM·Canvas 없이도 검증할 수 있습니다.
 */
(function (global) {
  'use strict';

  var W = 760, H = 1292;

  var C = {
    bg: '#EFF4EF',
    card: '#FFFFFF',
    line: '#E4EAE6',
    ink: '#16211C',
    ink2: '#33443B',
    muted: '#6E7B75',
    brand: '#1F7A5C',
    brandSoft: '#E7F3ED',
    brandNote: '#2D7A60',
    coral: '#D2543B',
    amber: '#B4681C',
    amberSoft: '#FFF8EC',
    amberLine: '#F0E3C8',
    track: '#EDF1EE',
    panel: '#F8FAF7'
  };

  var FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Noto Sans CJK KR", "Malgun Gothic", "Noto Color Emoji", sans-serif';

  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function clampPct(v) { return Math.max(0, Math.min(100, Math.round(n(v)))); }
  function fixed(v, digits) {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    var dg = digits === undefined ? 1 : digits;
    return dg > 0 ? v.toFixed(dg) : String(Math.round(v));
  }

  function M() { return global.App && global.App.Model; }
  function shortDate(v) {
    var m = M();
    if (m && m.fmtShort) return m.fmtShort(v);
    return String(v || '').slice(5).replace('-', '.');
  }
  function pctColor(pct) {
    if (pct === null || pct === undefined) return C.muted;
    return pct >= 80 ? C.brand : pct >= 50 ? C.amber : C.coral;
  }

  function isWide(ch) {
    var c = ch.codePointAt ? ch.codePointAt(0) : ch.charCodeAt(0);
    return (c >= 0x1100 && c <= 0x115F) || (c >= 0x2E80 && c <= 0xA4CF) ||
      (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) ||
      (c >= 0xFE30 && c <= 0xFE6F) || (c >= 0xFF00 && c <= 0xFF60) ||
      (c >= 0x1F000 && c <= 0x1FAFF);
  }

  /* 글자 폭 어림값 — Canvas 없이도 줄바꿈을 계산한다 */
  function textWidth(text, size) {
    var s = String(text || ''), w = 0;
    for (var i = 0; i < s.length; i++) {
      w += isWide(s.charAt(i)) ? size : size * 0.55;
    }
    return w;
  }

  function wrap(text, maxWidth, size) {
    var words = String(text || '').split(' ').filter(function (x) { return x !== ''; });
    var lines = [], line = '';
    words.forEach(function (word) {
      var cand = line ? line + ' ' + word : word;
      if (line && textWidth(cand, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = cand;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  /* ---------------- 그리기 명령 만들기 ---------------- */
  function plan(r) {
    r = r || {};
    var o = r.overall || {};
    var ib = r.inbody || { changes: {} };
    var ops = [];

    function rect(x, y, w, h, rad, fill, stroke) {
      ops.push({ type: 'rect', x: x, y: y, w: w, h: h, r: rad || 0, fill: fill || null, stroke: stroke || null });
    }
    function text(t, x, y, size, color, weight, align) {
      var s = String(t === null || t === undefined ? '' : t);
      if (!s) return;
      ops.push({ type: 'text', text: s, x: x, y: y, size: size, color: color || C.ink, weight: weight || '400', align: align || 'left' });
    }
    function bar(x, y, w, h, pct, color) {
      rect(x, y, w, h, h / 2, C.track);
      var fill = Math.round((w * clampPct(pct)) / 100);
      if (fill > 0) rect(x, y, Math.max(h, fill), h, h / 2, color || C.brand);
    }

    /* 배경 · 카드 */
    rect(0, 0, W, H, 0, C.bg);
    rect(24, 24, W - 48, H - 48, 34, C.card, C.line);

    /* 상단 헤더 */
    rect(48, 48, W - 96, 118, 24, C.brandSoft);
    rect(72, 74, 66, 66, 20, '#FFFFFF', C.line);
    text('🏆', 81, 120, 34, C.ink, '400');
    text('28일 최종 리포트', 156, 108, 29, C.ink, '800');
    text((r.nickname || r.name || '') + ' · ' + shortDate(r.startDate) + ' ~ ' + shortDate(r.endDate), 158, 138, 14, C.muted, '400');
    text('@yoyop_diet', W - 74, 108, 15, C.brand, '800', 'right');
    text(r.finished ? '28일 완주' : 'Day ' + n(r.currentDay || 1) + ' 미리보기', W - 74, 136, 12, C.brandNote, '700', 'right');

    /* 달성률 히어로 */
    rect(48, 182, W - 96, 152, 24, C.panel, C.line);
    text('28일 전체 달성률', 76, 214, 15, C.muted, '700');
    text(clampPct(o.rate) + '%', 72, 276, 54, C.brand, '800');
    text('기록 ' + n(o.recorded) + '일 · 모두 완료 ' + n(o.perfect) + '일', 78, 302, 12.5, C.brandNote, '700');

    var mini = [
      ['완료한 날', n(o.perfect) + '/28'],
      ['완료한 퀘스트', n(o.questsDone) + '개'],
      ['최장 연속 달성', o.streak ? n(o.streak) + '일' : '—'],
      ['단식 완료 (계획 ' + n(o.fastPlanned) + '회)', n(o.fastDone) + '회']
    ];
    mini.forEach(function (it, i) {
      var x = 424 + (i % 2) * 140;
      var y = 208 + Math.floor(i / 2) * 58;
      text(it[0], x, y, 11, C.muted, '700');
      text(it[1], x, y + 28, 21, C.ink, '800');
    });

    /* 최종 인바디 변화 */
    text('최종 인바디 변화', 48, 382, 18, C.ink, '800');
    if (ib.start && ib.latest) {
      text(shortDate(ib.start.date) + ' → ' + shortDate(ib.latest.date) + ' (Day ' + n(ib.latest.day) + ')', W - 48, 382, 12, C.muted, '400', 'right');
    }
    rect(48, 396, W - 96, 188, 22, C.panel, C.line);
    var rows = [
      ['몸무게', 'weight', 'kg', 1],
      ['골격근량', 'muscle', 'kg', 1],
      ['체지방량', 'fat', 'kg', 1],
      ['내장지방레벨', 'visceral', '레벨', 0]
    ];
    rows.forEach(function (row, i) {
      var key = row[1];
      var y = 434 + i * 42;
      var sv = ib.start && typeof ib.start[key] === 'number' ? ib.start[key] : null;
      var lv = ib.latest && typeof ib.latest[key] === 'number' ? ib.latest[key] : null;
      var d = ib.changes ? ib.changes[key] : null;
      text(row[0], 76, y, 14, C.ink2, '700');
      text((sv === null ? '—' : fixed(sv, row[3])) + '  →  ' + (lv === null ? '—' : fixed(lv, row[3])) + ' ' + row[2], 258, y, 16, C.ink, '700');
      if (d === null || d === undefined) {
        text('기록 부족', W - 76, y, 12, C.muted, '400', 'right');
      } else {
        var flat = Math.abs(d) < 0.05;
        var good = key === 'muscle' ? d > 0 : d < 0;
        text((flat ? '–' : d > 0 ? '▲ +' : '▼ ') + fixed(Math.abs(d), row[3]), W - 76, y, 15, flat ? C.muted : (good ? C.brand : C.coral), '800', 'right');
      }
    });

    /* 주차별 결과 */
    text('주차별 결과', 48, 622, 18, C.ink, '800');
    (r.periods || []).forEach(function (w, i) {
      var y0 = 636 + i * 62;
      var pct = w.rate === undefined ? null : w.rate;
      var future = pct === null;
      rect(48, y0, W - 96, 58, 16, future ? C.panel : C.card, C.line);
      text(w.label, 72, y0 + 22, 14.5, C.ink, '700');
      text(future ? '예정' : pct + '%', W - 72, y0 + 22, 14, pctColor(pct), '800', 'right');
      bar(72, y0 + 31, W - 144, 7, future ? 0 : pct, pctColor(pct));
      var metric = w.metric;
      var foot = metric
        ? ('몸무게 ' + fixed(metric.weight) + 'kg' + (w.weightDelta === null || w.weightDelta === undefined ? '' : ' (' + (w.weightDelta > 0 ? '+' : '') + fixed(w.weightDelta) + ')') +
           ' · 체지방 ' + fixed(metric.fat) + 'kg')
        : '인바디 기록 없음';
      text(foot, 72, y0 + 52, 11, C.muted, '400');
      if (w.fastPlanned) text('단식 ' + n(w.fastDone) + '/' + n(w.fastPlanned), W - 72, y0 + 52, 11, C.muted, '400', 'right');
    });

    /* 잘 지킨 루틴 · 아쉬웠던 루틴 */
    text('잘 지킨 루틴 vs 아쉬웠던 루틴', 48, 972, 18, C.ink, '800');
    var cols = [
      { x: 48, title: '✅ 잘 지킨 루틴', list: r.kept || [] },
      { x: 392, title: '🌱 아쉬웠던 루틴', list: r.missed || [] }
    ];
    cols.forEach(function (col) {
      rect(col.x, 986, 320, 108, 18, C.panel, C.line);
      text(col.title, col.x + 16, 1012, 13, C.ink, '800');
      var list = col.list.slice(0, 3);
      if (!list.length) {
        text('기록이 더 쌓이면 알려드려요', col.x + 16, 1042, 12, C.muted, '400');
        return;
      }
      list.forEach(function (it, k) {
        var y = 1036 + k * 22;
        text((it.emoji || '•') + ' ' + it.label, col.x + 16, y, 12.5, C.ink2, '700');
        text(clampPct(it.pct) + '%', col.x + 304, y, 12.5, pctColor(it.pct), '800', 'right');
      });
    });

    /* 격려 코멘트 */
    rect(48, 1106, W - 96, 96, 20, C.amberSoft, C.amberLine);
    var lines = wrap(r.comment, W - 96 - 56, 12.5).slice(0, 3);
    lines.forEach(function (line, i) {
      text(line, 76, 1136 + i * 21, 12.5, '#6B5520', i === 0 ? '700' : '400');
    });

    /* 푸터 */
    text('@yoyop_diet', W / 2, 1238, 15, C.brand, '800', 'center');
    text('마이옵티멀다이어트 28일 루틴 · 매일의 기록이 만든 28일', W / 2, 1258, 11, C.muted, '400', 'center');

    return { width: W, height: H, ops: ops };
  }

  /* ---------------- Canvas 그리기 ---------------- */
  function roundPath(ctx, x, y, w, h, r) {
    var rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  function draw(ctx, r) {
    var p = plan(r);
    if (!ctx) return p;
    if (ctx.clearRect) ctx.clearRect(0, 0, p.width, p.height);
    p.ops.forEach(function (o) {
      if (o.type === 'rect') {
        roundPath(ctx, o.x, o.y, o.w, o.h, o.r);
        if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
        if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1; ctx.stroke(); }
      } else if (o.type === 'text') {
        ctx.font = o.weight + ' ' + o.size + 'px ' + FONT;
        ctx.fillStyle = o.color;
        ctx.textAlign = o.align;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(o.text, o.x, o.y);
      }
    });
    return p;
  }

  function toDataURL(r, opt) {
    var doc = global.document;
    if (!doc || !doc.createElement) return null;
    var canvas = doc.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return null;
    var scale = (opt && opt.scale) || 2;
    try {
      canvas.width = W * scale;
      canvas.height = H * scale;
      var ctx = canvas.getContext('2d');
      if (!ctx) return null;
      if (ctx.scale) ctx.scale(scale, scale);
      draw(ctx, r);
      return canvas.toDataURL('image/png');
    } catch (e) {
      return null;
    }
  }

  function texts(r) {
    return plan(r).ops.filter(function (o) { return o.type === 'text'; }).map(function (o) { return o.text; });
  }

  global.App = global.App || {};
  global.App.Report = {
    width: W,
    height: H,
    plan: plan,
    draw: draw,
    toDataURL: toDataURL,
    texts: texts,
    wrap: wrap,
    textWidth: textWidth
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.App.Report; }
})(typeof window !== 'undefined' ? window : globalThis);
