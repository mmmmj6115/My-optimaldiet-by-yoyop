/* 화면 템플릿 — DOM을 직접 만지지 않고 HTML 문자열만 돌려줍니다. */
(function (global) {
  'use strict';

  var Program = global.App.Program;
  var M = global.App.Model;

  var ICONS = {
    today: '<circle cx="12" cy="12" r="8.4"/><path d="M8.3 12.3l2.5 2.6 5-5.4"/>',
    grid: '<rect x="4" y="4" width="6.6" height="6.6" rx="1.7"/><rect x="13.4" y="4" width="6.6" height="6.6" rx="1.7"/><rect x="4" y="13.4" width="6.6" height="6.6" rx="1.7"/><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.7"/>',
    tag: '<path d="M11.4 4.2H6.2A2 2 0 004.2 6.2v5.2c0 .5.2 1 .6 1.4l6.4 6.4a2 2 0 002.8 0l5.2-5.2a2 2 0 000-2.8L12.8 4.8a2 2 0 00-1.4-.6z"/><circle cx="8.2" cy="8.2" r="1.3"/>',
    book: '<path d="M5.2 5.4A1.6 1.6 0 016.8 4H19v16H6.8a1.6 1.6 0 01-1.6-1.6z"/><path d="M8.6 4v16"/><path d="M11.6 8.6h4.2M11.6 12h4.2"/>',
    compass: '<circle cx="12" cy="12" r="8.2"/><path d="M15.4 8.6l-2 4.8-4.8 2 2-4.8z"/>',
    chart: '<path d="M4 19.2h16"/><path d="M6.8 15.4l3.4-4.2 3 2.6 4.4-6"/><circle cx="17.6" cy="7.8" r="1.2"/>',
    users: '<circle cx="9.2" cy="8.8" r="3.1"/><path d="M4.2 19c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M16.4 6.8a3 3 0 010 5.6M17 14.2c2.1.6 3.6 2.5 3.6 4.8"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.6 4.6L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    cup: '<path d="M7 5h10l-1.2 14.2a1.6 1.6 0 01-1.6 1.5H9.8a1.6 1.6 0 01-1.6-1.5z"/>',
    link: '<path d="M10.5 13.5a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1.2 1.2"/><path d="M13.5 10.5a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1.2-1.2"/>',
    edit: '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 000-3L17 5a2.1 2.1 0 00-3 0L3.5 15.5z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4.5 7h15M9 7V5.2A1.2 1.2 0 0110.2 4h3.6A1.2 1.2 0 0115 5.2V7M6.5 7l.9 11.4A1.6 1.6 0 009 20h6a1.6 1.6 0 001.6-1.6L17.5 7"/>',
    download: '<path d="M12 4v10"/><path d="M8 10.5l4 4 4-4"/><path d="M5 19h14"/>',
    sparkle: '<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z"/>',
    sun: '<circle cx="12" cy="12" r="4.1"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
    bowl: '<path d="M4 11.2h16a8 8 0 01-16 0z"/><path d="M9.2 7.6c0-1.4 1.3-2.2 1.3-3.6M13.5 7.6c0-1.4 1.3-2.2 1.3-3.6"/>',
    apple: '<path d="M12 8.6c-2.6-2-6.4-.3-6.4 3.6 0 3.6 2.6 7.3 4.6 7.3.9 0 1.2-.5 1.8-.5s.9.5 1.8.5c2 0 4.6-3.7 4.6-7.3 0-3.9-3.8-5.6-6.4-3.6z"/><path d="M12 8.6V6.1a2.4 2.4 0 012.4-2.4"/>',
    moon: '<path d="M20 14.3A8.2 8.2 0 019.7 4 8.6 8.6 0 1020 14.3z"/>',
    drop: '<path d="M12 3.8s5.4 5.5 5.4 9.3a5.4 5.4 0 11-10.8 0C6.6 9.3 12 3.8 12 3.8z"/>',
    dumbbell: '<path d="M6.6 8.6v6.8M4.2 10.1v3.8M17.4 8.6v6.8M19.8 10.1v3.8M6.6 12h10.8"/>',
    bed: '<path d="M3.6 19V9.2M3.6 13.6h16.8V19M20.4 19v-3.4"/><path d="M7.6 10.2h4.1a2 2 0 012 2v1.4"/>',
    leaf: '<path d="M20 4.2c-8.6.4-13.1 4-13.1 9.2 0 2.4 1.4 4.4 3.6 5.2C15 19.6 19.4 14.6 20 4.2z"/><path d="M4 20c1.6-4.2 4.6-7.4 9-9.4"/>',
    ban: '<circle cx="12" cy="12" r="8"/><path d="M6.4 17.6L17.6 6.4"/>',
    clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.8v4.6l3 1.8"/>',
    quote: '<path d="M9.6 6.4C6.8 7.6 5.2 9.9 5.2 12.8c0 2.6 1.4 4.2 3.4 4.2 1.8 0 3-1.2 3-2.9 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.4-1.3 1.5-2.3 3-2.8zM18 6.4c-2.8 1.2-4.4 3.5-4.4 6.4 0 2.6 1.4 4.2 3.4 4.2 1.8 0 3-1.2 3-2.9 0-1.6-1.1-2.7-2.6-2.7-.3 0-.6 0-.8.1.4-1.3 1.5-2.3 3-2.8z"/>',
    camera: '<path d="M4.2 8.6h2.6l1.3-2h7.8l1.3 2h2.6a1.6 1.6 0 011.6 1.6v7.4a1.6 1.6 0 01-1.6 1.6H4.2a1.6 1.6 0 01-1.6-1.6v-7.4a1.6 1.6 0 011.6-1.6z"/><circle cx="12" cy="13.6" r="3.1"/>'
  };

  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /* ---------- 게이지 위를 달리는 요가복 캐릭터 (인라인 SVG, 외부 이미지 없음) ---------- */
  var RUNNER_BODY =
    '<g stroke="#A7DFCB" stroke-width="1.8" stroke-linecap="round" opacity=".95"><path d="M10.5 31.5h4"/><path d="M8 39h5"/><path d="M11 46h4"/></g>' +
    '<path d="M30.6 10.4C24.4 9.2 18.6 12.2 16.8 17.8 15.8 21 18 22.8 20 21.4 20.8 17.6 24.6 15.6 28.4 16.4Z" fill="#43312E"/>' +
    '<path d="M30.4 27.8C26.4 28.6 23.4 30.6 21.8 33.4" fill="none" stroke="#F2C6A8" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M30 26.4C28.6 26.9 27.3 27.6 26.2 28.2" fill="none" stroke="#FF9FB4" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M29.4 36.6C25 38.6 21.4 42 19.6 45.8" fill="none" stroke="#8E82DC" stroke-width="5.8" stroke-linecap="round"/>' +
    '<g transform="translate(19.2,46.4) rotate(52)"><path d="M-4.4-1q-.4-2.2 2-2.2h4.4q1.6 0 1.8 1.4l.2 1.4q.2 1.3-1.3 1.3h-5.6q-1.5 0-1.5-1.9Z" fill="#FDFBFF" stroke="#E0D6EA" stroke-width=".7"/><path d="M-4.5.8q4.4 1.3 8.8 0" fill="none" stroke="#FFB3C6" stroke-width="1.5" stroke-linecap="round"/></g>' +
    '<path d="M31.4 36.4C36.8 37.6 39.8 41.2 39.8 45.6" fill="none" stroke="#9F93E8" stroke-width="6" stroke-linecap="round"/>' +
    '<g transform="translate(40,47.6) rotate(-4)"><path d="M-3.2-1.4h2.6q1.8 0 2.2 1.5l.5 1.9q.4 1.4-1.2 1.4h-4.4q-1.6 0-1.6-1.6v-1.2q0-2 1.9-2Z" fill="#FDFBFF" stroke="#E0D6EA" stroke-width=".7"/><path d="M-3.4 2.9q3.4 1 6.6 0" fill="none" stroke="#FFB3C6" stroke-width="1.5" stroke-linecap="round"/></g>' +
    '<path d="M26.6 33C30 35.8 37 36.4 39.4 34L39 38C35.4 40.6 30 40.2 27 37Z" fill="#9F93E8"/>' +
    '<path d="M27 33.6C30.4 36 36.6 36.6 39 34.6" fill="none" stroke="#B6ACEE" stroke-width="1.4" stroke-linecap="round"/>' +
    '<g transform="rotate(-10 33 33.6)"><ellipse cx="33" cy="33" rx="6.8" ry="4" fill="#FFD9BE"/><ellipse cx="34.2" cy="33.8" rx=".62" ry=".78" fill="#E8A98B"/></g>' +
    '<path d="M36.6 24.4C39.8 22.6 42.8 22.6 45 24.2" fill="none" stroke="#FFD9BE" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M36.4 23.8C37.6 23 38.6 22.6 39.6 22.5" fill="none" stroke="#FF9FB4" stroke-width="4" stroke-linecap="round"/>' +
    '<g transform="rotate(-10 33 26)"><rect x="25.8" y="20.4" width="14" height="9.6" rx="3.8" fill="#FF9FB4"/><path d="M26.6 28.2C30.4 29.8 35.6 29.8 39 28.2" fill="none" stroke="#FFC7D3" stroke-width="1.2"/></g>' +
    '<rect x="32.6" y="18" width="4" height="4.8" rx="2" fill="#FFD9BE" transform="rotate(16 34.6 20.4)"/>' +
    '<circle cx="34.6" cy="13" r="8.7" fill="#43312E"/>' +
    '<circle cx="29.4" cy="5.6" r="3.1" fill="#43312E"/>' +
    '<ellipse cx="29.4" cy="8.4" rx="3.7" ry="1.3" fill="#FF9FB4" transform="rotate(-16 29.4 8.4)"/>' +
    '<ellipse cx="35.2" cy="15.8" rx="7.5" ry="6.9" fill="#FFD9BE"/>' +
    '<path d="M28 14.2C28.2 8.6 32.4 6.6 34.8 6.6 37.6 6.6 42 8.6 42.2 14.4 39.8 11.2 37.8 10.2 34.6 10.2 31.4 10.2 30 11.4 28 14.2Z" fill="#43312E"/>' +
    '<path d="M30.4 16.4q2-2.4 4 0" fill="none" stroke="#3A2A28" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M36.4 16.4q2-2.4 4 0" fill="none" stroke="#3A2A28" stroke-width="1.3" stroke-linecap="round"/>' +
    '<ellipse cx="29.6" cy="19.6" rx="1.9" ry="1.1" fill="#FFA8A8" opacity=".8"/>' +
    '<ellipse cx="41.2" cy="19.6" rx="1.9" ry="1.1" fill="#FFA8A8" opacity=".8"/>' +
    '<path d="M34.2 20.6q1.2 1.4 2.4 0" fill="none" stroke="#C4706A" stroke-width="1.2" stroke-linecap="round"/>';

  function runnerMark(pct, runId, small) {
    var p = Math.max(3, Math.min(97, n(pct)));
    return '<span class="g-runner' + (small ? ' sm' : '') + '"' + (runId ? ' id="' + esc(runId) + '"' : '') +
      ' style="left:' + p + '%" aria-hidden="true">' +
      '<svg viewBox="6 0.5 42 52" xmlns="http://www.w3.org/2000/svg" focusable="false">' + RUNNER_BODY + '</svg></span>';
  }

  /* 게이지 + 그 위를 달리는 캐릭터 + 결승 깃발 */
  function gaugeBlock(pct, opt) {
    opt = opt || {};
    var p = clampPct(pct);
    var done = p >= 100;
    return '<div class="gauge-wrap' + (opt.wrap ? ' ' + opt.wrap : '') + '">' +
      '<div class="gauge' + (opt.cls ? ' ' + opt.cls : '') + '"><i' + (opt.id ? ' id="' + esc(opt.id) + '"' : '') + ' style="width:' + p + '%"></i></div>' +
      runnerMark(p, opt.runId, opt.small) +
      '<span class="g-goal' + (opt.small ? ' sm' : '') + '"' + (opt.runId ? ' id="' + esc(opt.runId) + '-goal"' : '') + ' aria-hidden="true">' + (done ? '🏆' : '🏁') + '</span>' +
    '</div>';
  }

  /* 퀘스트 카드 컬러 · 이모지 */
  var QUEST_STYLE = {
    breakfast: { e: '🌅', t: 'sun' },
    lunch: { e: '🍚', t: 'rice' },
    snack: { e: '🍎', t: 'apple' },
    dinner: { e: '🌙', t: 'moon' },
    water: { e: '💧', t: 'water' },
    exercise: { e: '🏃‍♀️', t: 'fit' },
    sleep: { e: '😴', t: 'sleep' }
  };

  function foodIconOf(name) {
    return (Program.foodIcons && Program.foodIcons[name]) || '🥗';
  }

  function foodChipHTML(e, text, cls) {
    return '<span class="fc' + (cls ? ' ' + cls : '') + '"><b aria-hidden="true">' + e + '</b>' + esc(text) + '</span>';
  }

  function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function clampPct(v) { return Math.max(0, Math.min(100, Math.round(n(v)))); }
  function pctText(v) { return clampPct(v) + '%'; }

  function chip(typeKey, small) {
    var t = Program.types[typeKey] || Program.types.SHAKE;
    return '<span class="chip tone-' + t.tone + (small ? ' sm' : '') + '">' + esc(t.label) + '</span>';
  }

  function timeShort(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? Number(m[2]) + '.' + m[3] + ' ' + m[4] + ':' + m[5] : '';
  }

  function levelClass(pct) {
    var p = clampPct(pct);
    if (p >= 100) return 'lv-done';
    if (p >= 50) return 'lv-mid';
    return 'lv-low';
  }

  function itemStrip(items) {
    return '<span class="cell-strip" aria-hidden="true">' + items.map(function (it) {
      return '<i class="ci ' + it.status + '" title="' + esc(it.label) + ' ' + (it.status === 'done' ? 'O' : it.status === 'miss' ? 'X' : '미입력') + '"></i>';
    }).join('') + '</span>';
  }

  function itemGrid(items) {
    return '<span class="item-grid">' + items.map(function (it) {
      var mark = it.status === 'done' ? 'O' : it.status === 'miss' ? 'X' : '–';
      var title = it.status === 'na' ? '단식일 · 해당 없음' : (it.status === 'done' ? 'O' : it.status === 'miss' ? 'X' : '미입력');
      return '<span class="item ' + it.status + '" title="' + esc(it.label) + ' ' + title + '">' +
        '<b>' + esc(it.short) + '</b><i>' + mark + '</i>' +
      '</span>';
    }).join('') + '</span>';
  }

  function deltaBadge(delta, kind) {
    if (delta === null || delta === undefined) return '<span class="delta muted">이전 기록 없음</span>';
    var flat = Math.abs(delta) < 0.05;
    var good = kind === 'muscle' ? delta > 0 : delta < 0;
    var cls = flat ? 'delta flat' : (good ? 'delta good' : 'delta bad');
    var arrow = delta > 0 ? '▲' : (delta < 0 ? '▼' : '–');
    var num = kind === 'visceral' ? Math.round(Math.abs(delta)) : Math.abs(delta).toFixed(1);
    return '<span class="' + cls + '">' + arrow + ' ' + num + '</span>';
  }

  function segmented(name, items, current) {
    var out = '<div class="segmented" role="tablist">';
    items.forEach(function (it) {
      var on = String(it[0]) === String(current);
      out += '<button role="tab" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '" data-act="' + name + '" data-value="' + esc(it[0]) + '">' + esc(it[1]) + '</button>';
    });
    return out + '</div>';
  }

  function pageHead(title, sub, right) {
    return '<header class="page-head"><div><h1>' + esc(title) + '</h1><p>' + esc(sub) + '</p></div>' + (right || '') + '</header>';
  }

  function emptyState(title, text) {
    return '<div class="empty"><span class="empty-ic">' + icon('sparkle') + '</span><b>' + esc(title) + '</b><p>' + esc(text) + '</p></div>';
  }

  /* ---------------- 로그인 ---------------- */
  function gate(data) {
    data = data || {};
    var demoNote = data.authMode === 'demo'
      ? '<p class="gate-note">지금은 <b>데모 모드</b>예요. 배포하면 이 버튼이 카카오 계정으로 연결됩니다.</p>'
      : '<p class="gate-note">카카오 계정으로 로그인하면 참여 기록이 안전하게 저장돼요.</p>';
    return '' +
      '<div class="gate">' +
        '<div class="gate-top">' +
          '<span class="gate-mark">' + icon('sparkle') + '</span>' +
          '<p class="gate-brand">마이옵티멀다이어트</p>' +
          '<h1 class="gate-title">28일 루틴<br><span>데일리 체크보드</span></h1>' +
          '<p class="gate-desc">매일의 식단·운동·인바디를 기록하고<br>28일의 변화를 함께 봐요.</p>' +
        '</div>' +
        '<div class="gate-actions">' +
          '<button class="btn-kakao" data-act="kakao-login">' +
            '<span class="kakao-ic" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2c-4.9 0-8.8 3-8.8 6.7 0 2.4 1.6 4.5 4 5.8l-.9 3.2c-.1.3.2.5.4.3l3.8-2.5c.5.1 1 .1 1.5.1 4.9 0 8.8-3 8.8-6.9S16.9 3.2 12 3.2z"/></svg>' +
            '</span>카카오로 3초 만에 시작하기' +
          '</button>' +
          demoNote +
          '<div class="gate-demo">' +
            '<span class="gate-demo-label">체험하기</span>' +
            '<div class="gate-demo-row">' +
              '<button class="btn ghost sm" data-act="demo-login" data-role="participant">데모 참여자 체험</button>' +
            '</div>' +
          '</div>' +
          '<details class="gate-code">' +
            '<summary>참여코드로 입장</summary>' +
            '<form id="code-form" class="stack" autocomplete="off">' +
              '<input class="input" name="name" placeholder="이름" autocomplete="name">' +
              '<input class="input" name="code" placeholder="참여코드 (숫자 4자리)" inputmode="numeric" maxlength="8" autocomplete="one-time-code">' +
              '<button class="btn primary block" type="submit">입장하기</button>' +
            '</form>' +
            '<p class="hint">참여코드는 관리자에게 받은 코드예요. 데모 코드는 1234입니다.</p>' +
          '</details>' +
          '<details class="gate-code gate-admin">' +
            '<summary>관리자 로그인</summary>' +
            '<form id="admin-form" class="stack" autocomplete="off">' +
              '<input class="input" name="code" type="password" placeholder="관리자 코드" autocomplete="current-password" maxlength="32">' +
              '<button class="btn outline block" type="submit">관리자로 로그인</button>' +
            '</form>' +
            '<p class="hint">운영자에게 받은 관리자 코드를 입력하면 관리자 탭이 열려요.</p>' +
          '</details>' +
        '</div>' +
        '<p class="gate-foot">' + esc(Program.name) + ' · ' + esc(Program.title) + ' v' + esc(Program.version) + '</p>' +
      '</div>';
  }

  /* ---------------- 하단 탭 ---------------- */
  function tabbar(data) {
    var route = data.route;
    if (route === 'adminDetail') route = 'admin';
    var items = [
      ['tutorial', '튜토리얼', 'compass'],
      ['today', '오늘', 'today'],
      ['board', '보드', 'grid'],
      ['body', '인바디', 'chart'],
      ['promos', '공구', 'tag']
    ];
    /* 관리자 탭은 관리자 코드로 로그인한 세션에서만 만든다 */
    if (data.role === 'admin') items.push(['admin', '관리자', 'users']);
    return items.map(function (it) {
      var on = it[0] === route;
      return '<button class="tab ' + (on ? 'on' : '') + '" data-act="nav" data-route="' + it[0] + '" aria-current="' + (on ? 'page' : 'false') + '">' + icon(it[2]) + '<span>' + it[1] + '</span></button>';
    }).join('');
  }

  /* ---------------- 오늘 상세 공통 조각 ---------------- */
  function sponsorSlot(promo) {
    if (!promo) return '';
    var t = M.promoType(promo);
    return '<button class="sponsor-slot" data-act="nav" data-route="promos">' +
      '<span class="sponsor-badge tone-' + t.tone + '">' + esc(t.badge) + '</span>' +
      '<span class="sponsor-text"><b>' + esc(promo.title) + '</b><span>' + esc(promo.memo || t.label) + '</span></span>' +
      icon('chevron', 'sponsor-arrow') +
      '</button>';
  }

  function metricField(key, label, entry, delta, prevValue, unit, step) {
    var v = entry && typeof entry[key] === 'number' ? entry[key] : '';
    var ph = prevValue === null || prevValue === undefined ? '-' : prevValue;
    var foot;
    if (delta !== null && delta !== undefined) foot = deltaBadge(delta, key);
    else if (prevValue !== null && prevValue !== undefined) foot = '<span class="delta muted">이전 ' + Number(prevValue).toFixed(1) + '</span>';
    else foot = '<span class="delta muted">이전 기록 없음</span>';
    return '<label class="metric">' +
      '<span class="metric-label">' + esc(label) + '</span>' +
      '<span class="metric-input"><input type="number" inputmode="decimal" step="' + (step || '0.1') + '" min="0" data-field="' + key + '" value="' + esc(v) + '" placeholder="' + esc(ph) + '"><em>' + esc(unit || 'kg') + '</em></span>' +
      foot +
      '</label>';
  }

  function tick(on, label, extra) {
    return '<span class="tick ' + (on ? 'on' : '') + '" aria-hidden="true">' + (on ? icon('check') : '') + '</span>' +
      (extra || '') + '<span class="sr-only">' + esc(label) + '</span>';
  }

  function mealRow(plan, m, entry) {
    var typeKey = plan[m];
    var label = Program.mealLabel[m];
    var fast = typeKey === 'FAST';
    var on = !fast && !!(entry && entry.meals && entry.meals[m]);
    if (fast) {
      return '<div class="meal-row is-fast">' +
        '<span class="tick disabled">–</span>' +
        '<span class="meal-info"><span class="meal-name">' + label + '</span>' + chip(typeKey, true) + '</span>' +
        '<span class="meal-state">물·허브티</span>' +
        '</div>';
    }
    return '<button class="meal-row ' + (on ? 'on' : '') + '" data-act="toggle-meal" data-meal="' + m + '" aria-pressed="' + on + '">' +
      '<span class="tick ' + (on ? 'on' : '') + '" aria-hidden="true">' + (on ? icon('check') : '') + '</span>' +
      '<span class="meal-info"><span class="meal-name">' + label + '</span>' + chip(typeKey, true) + '</span>' +
      '<span class="meal-state">' + (on ? '완료' : '체크') + '</span>' +
      '<span class="sr-only">' + label + ' ' + Program.types[typeKey].label + ' ' + (on ? '완료' : '미체크') + '</span>' +
      '</button>';
  }

  function waterBlock(entry) {
    var cups = entry && typeof entry.water === 'number' ? entry.water : 0;
    var target = Program.check.waterTarget;
    var cupBtns = '';
    for (var i = 1; i <= target; i++) {
      cupBtns += '<button class="cup ' + (i <= cups ? 'filled' : '') + '" data-act="water-set" data-n="' + i + '" aria-label="' + i + '잔" aria-pressed="' + (i <= cups) + '"></button>';
    }
    var pct = Math.round(Math.min(cups / target, 1) * 100);
    return '<div class="water">' +
      '<div class="water-head">' +
        '<div><b>물</b> <span class="hint">하루 2L · ' + target + '잔</span></div>' +
        '<div class="water-count"><b>' + cups + '</b><span>/' + target + '잔</span></div>' +
      '</div>' +
      '<div class="cups" role="group" aria-label="물 섭취 잔 수">' + cupBtns + '</div>' +
      '<div class="water-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="water-actions">' +
        '<button class="mini-btn" data-act="water-dec" ' + (cups <= 0 ? 'disabled' : '') + '>− 1잔</button>' +
        '<button class="mini-btn" data-act="water-inc" ' + (cups >= target ? 'disabled' : '') + '>+ 1잔</button>' +
      '</div>' +
    '</div>';
  }

  function switchRow(field, title, sub, on) {
    return '<button class="switch-row" data-act="toggle-routine" data-field="' + field + '" role="switch" aria-checked="' + on + '">' +
      '<span class="switch-text"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span>' +
      '<span class="switch ' + (on ? 'on' : '') + '"><i></i></span>' +
      '</button>';
  }

  function feedbackList(list, canDelete) {
    if (!list || !list.length) return '';
    return '<div class="fb-list">' + list.map(function (f) {
      return '<div class="fb-item">' +
        '<div class="fb-head"><span class="fb-day">' + (f.day ? 'Day ' + f.day : '전체') + '</span>' +
        '<time>' + esc(timeShort(f.createdAt)) + '</time>' +
        (canDelete ? '<button class="icon-btn tiny" data-act="fb-delete" data-fid="' + esc(f.id) + '" aria-label="피드백 삭제">' + icon('close') + '</button>' : '') +
        '</div>' +
        '<p>' + esc(f.text) + '</p>' +
        '</div>';
    }).join('') + '</div>';
  }

  /* ---------------- 오늘: 히어로 · 타이머 · 명언 · 식품 · 퀘스트 ---------------- */
  function bodyNumber(v, unit) {
    if (typeof v !== 'number' || isNaN(v)) return '<b>—</b>';
    var text = Math.abs(v % 1) < 0.05 ? String(Math.round(v)) : v.toFixed(1);
    return '<b>' + esc(text) + '<em>' + esc(unit) + '</em></b>';
  }

  function heroBlock(d) {
    var p = d.participant;
    var nickname = d.nickname || p.nickname || p.name || '?';
    var body = d.body || {};
    var week = Program.weeks[d.week - 1] || {};
    function stat(label, key, unit) {
      var snap = body[key];
      return '<div class="hs"><span>' + esc(label) + '</span>' + bodyNumber(snap ? snap.value : null, unit) + '</div>';
    }
    var sub = [];
    if (nickname !== p.name) sub.push(p.name);
    sub.push((week.title || '') + ' · ' + M.fmtLong(d.date) + (d.isToday ? ' · 오늘' : ''));
    var bd = body.weight || body.fat || body.visceral;
    var stamp = bd && bd.date ? ' · ' + M.fmtShort(bd.date) + ' 기록' : '';

    return '<section class="hero">' +
      '<div class="hero-top">' +
        '<button class="hero-avatar" data-act="open-profile" aria-label="내 정보 · 계정 전환">' + esc(String(nickname).slice(0, 1)) + '</button>' +
        '<div class="hero-id">' +
          '<p class="hero-kicker">' + esc(Program.name) + ' · ' + esc(Program.title) + '</p>' +
          '<h1 class="hero-name">' + esc(nickname) + ' <span>님</span></h1>' +
          '<span class="hero-real">' + esc(sub.join(' · ')) + '</span>' +
        '</div>' +
        '<span class="hero-day">Day ' + d.day + '</span>' +
      '</div>' +
      '<div class="hero-stats">' +
        stat('몸무게', 'weight', 'kg') +
        stat('체지방량', 'fat', 'kg') +
        stat('내장지방', 'visceral', '레벨') +
      '</div>' +
      '<div class="hero-progress">' +
        '<div class="hp-top"><span>28일 달성률</span><b>' + pctText(d.overall) + '</b></div>' +
        gaugeBlock(d.overall) +
        '<div class="hp-foot"><span>기록 ' + d.checkedDays + '일 / 28일' + stamp + '</span><span>오늘 달성 ' + pctText(score_pct(d)) + '</span></div>' +
      '</div>' +
    '</section>';
  }

  function score_pct(d) {
    return d.score ? d.score.pct : 0;
  }

  function timerCardFasting(d) {
    var f = d.fasting;
    if (!f) return '';
    var cap = f.done ? '공복 ' + f.hours + '시간 달성' : '공복 ' + f.hours + '시간까지';
    var val = f.done
      ? '<span class="big-num">' + f.hours + '시간 공복 달성!</span> 🎉'
      : '<span class="big-num">' + esc(f.leftText) + '</span> <em>남았어요</em>';
    var f24 = d.fasting24;
    var line24 = (d.fast && f24)
      ? '<p class="tc-sub" id="t-fast-24">24시간 단식 기준 ' + (f24.done ? '24시간 달성 · 물·허브티만 🎉' : esc(f24.leftText) + ' 남았어요') + '</p>'
      : '';
    return '<article class="timer-card fast">' +
      '<div class="tc-head">' +
        '<span class="tc-label">' + icon('clock') + '공복 타이머</span>' +
        '<span class="tc-pill" id="t-fast-state">' + (f.done ? '달성' : '진행 중') + '</span>' +
      '</div>' +
      '<p class="tc-cap" id="t-fast-cap">' + esc(cap) + '</p>' +
      '<p class="tc-big" id="t-fast-value">' + val + '</p>' +
      gaugeBlock(f.pct, { id: 't-fast-bar', runId: 't-fast-run' }) +
      '<div class="tc-meta"><span id="t-fast-elapsed">공복 ' + esc(f.elapsedText) + ' 경과</span><span id="t-fast-pct">' + f.pct + '%</span></div>' +
      '<p class="tc-note" id="t-fast-note">' + esc((f.startToday ? '오늘 ' : '어제 ') + f.startClock + ' 마지막 식사 · ' + f.hours + '시간 공복까지') + '</p>' +
      line24 +
      '<label class="time-row"><span>전날 마지막 식사</span><input type="time" data-field="lastMeal" value="' + esc(d.prefs.lastMeal) + '" aria-label="전날 마지막 식사 시각"></label>' +
    '</article>';
  }

  function timerCardDinner(d) {
    var t = d.dinner;
    if (!t) return '';
    var cap = t.done ? '마감 시각이 지났어요' : '저녁 식사는 ' + t.deadlineClock + '까지';
    var val = t.done
      ? '<span class="big-num">마감 ' + esc(t.overText) + ' 지났어요</span>'
      : '<span class="big-num">' + esc(t.leftText) + '</span> <em>남았어요</em>';
    var note = t.done
      ? '취침 ' + t.bedClock + ' ' + t.offsetHours + '시간 전(' + t.deadlineClock + ')을 넘었어요. 다음엔 조금 더 일찍 먹어봐요.'
      : t.label + '을 취침 ' + t.offsetHours + '시간 전(' + t.deadlineClock + ')까지 끝내요.';
    var modes = ['shake', 'meal'].map(function (k) {
      var m = M.dinnerModes[k];
      var on = t.mode === k;
      return '<button class="' + (on ? 'on' : '') + '" data-act="dinner-mode" data-value="' + k + '" aria-pressed="' + on + '">' +
        m.emoji + ' ' + esc(m.short) + ' (' + esc(m.tag) + ')</button>';
    }).join('');
    return '<article class="timer-card dinner">' +
      '<div class="tc-head">' +
        '<span class="tc-label">' + icon('clock') + '마지막 저녁식사</span>' +
        '<span class="tc-pill" id="t-dinner-state">' + esc(t.emoji + ' ' + t.tag) + '</span>' +
      '</div>' +
      '<p class="tc-cap" id="t-dinner-cap">' + esc(cap) + '</p>' +
      '<p class="tc-big" id="t-dinner-value">' + val + '</p>' +
      gaugeBlock(t.pct, { id: 't-dinner-bar', runId: 't-dinner-run', cls: 'amber' }) +
      '<div class="tc-meta"><span id="t-dinner-meta">취침 ' + esc(t.bedClock) + ' · ' + t.offsetHours + '시간 전</span><span id="t-dinner-pct">' + t.pct + '%</span></div>' +
      '<p class="tc-note" id="t-dinner-note">' + esc(note) + '</p>' +
      '<div class="segmented dinner-mode" role="tablist">' + modes + '</div>' +
    '</article>';
  }

  function timerCardSleep(d) {
    var s = d.sleep;
    if (!s) return '';
    var cap = s.done ? '권장 취침 시각이 지났어요' : '잠자기까지';
    var val = s.done
      ? '<span class="big-num">지금이 취침 시각!</span>'
      : '<span class="big-num">' + esc(s.leftText) + '</span> <em>남았어요</em>';
    var note = s.done
      ? '권장 취침 ' + s.bedClock + '에서 ' + esc(s.overText) + ' 지났어요. 지금 자면 ' + s.hours + '시간을 못 채워요.'
      : s.hours + '시간 이상 자려면 ' + s.bedClock + '까지 잠들어야 해요';
    return '<article class="timer-card sleep">' +
      '<div class="tc-head">' +
        '<span class="tc-label">' + icon('bed') + '수면 카운트다운</span>' +
        '<span class="tc-pill" id="t-sleep-state">' + s.hours + '시간 기준</span>' +
      '</div>' +
      '<p class="tc-cap" id="t-sleep-cap">' + esc(cap) + '</p>' +
      '<p class="tc-big" id="t-sleep-value">' + val + '</p>' +
      gaugeBlock(s.pct, { id: 't-sleep-bar', runId: 't-sleep-run', cls: 'blue' }) +
      '<div class="tc-meta"><span id="t-sleep-meta">권장 취침 ' + s.bedClock + '</span><span id="t-sleep-wake">기상 ' + s.wake + '</span></div>' +
      '<p class="tc-note" id="t-sleep-note">' + esc(note) + '</p>' +
      '<label class="time-row"><span>내일 기상 목표</span><input type="time" data-field="wake" value="' + esc(d.prefs.wake) + '" aria-label="내일 기상 목표 시각"></label>' +
    '</article>';
  }

  function quoteBanner(q, day) {
    if (!q) return '';
    return '<section class="quote-card">' +
      '<span class="quote-ic">' + icon('quote') + '</span>' +
      '<div class="quote-body">' +
        '<p class="quote-tag">' + esc(q.tag) + ' · Day ' + day + '</p>' +
        '<p class="quote-text">' + esc(q.text) + '</p>' +
      '</div>' +
    '</section>';
  }

  function isDetoxDay(day) {
    return !!(Program.detox && Program.detox.days.indexOf(Number(day)) >= 0);
  }

  /* Day에 해당하는 기간별 안내 (D1~3 · D4~7 · 2~4주차) */
  function periodFor(day) {
    var d = Number(day);
    var list = [Program.detox, Program.w1Plan, Program.w2Plan, Program.w3Plan, Program.w4Plan];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].days.indexOf(d) >= 0) return list[i];
    }
    return null;
  }

  function foodBar(d) {
    var w = Program.weeks[d.week - 1] || {};
    var detox = isDetoxDay(d.day);
    var period = detox ? null : periodFor(d.day);
    var allow = detox ? Program.detox.chips : (period && period.chips ? period.chips : (w.foodChips || []).slice(0, 8));
    var avoid = detox
      ? Program.detox.forbiddenChips
      : (period && period.forbiddenChips
        ? period.forbiddenChips
        : Program.forbidden.map(function (g) { return { e: g.emoji, t: g.chip }; }));
    if (!allow.length && !avoid.length) return '';
    return '<section class="food-bar' + (detox ? ' detox' : '') + '">' +
      '<div class="food-grid">' +
        '<div class="food-side allow">' +
          '<div class="fb-head">' + icon('leaf') + '<b>허용식품</b><em>' + esc(detox ? 'D1~3 당질 제한' : (period ? period.badge : (w.title || ''))) + '</em></div>' +
          '<div class="fb-chips">' + allow.map(function (c) { return foodChipHTML(c.e, c.t, 'ok'); }).join('') + '</div>' +
        '</div>' +
        '<div class="food-side avoid">' +
          '<div class="fb-head">' + icon('ban') + '<b>금기식품</b><em>' + esc(detox ? 'D1~3 기준' : (period && period.forbiddenChips ? period.badge + ' 기준' : '전 주차')) + '</em></div>' +
          '<div class="fb-chips">' + avoid.map(function (g) { return foodChipHTML(g.e, g.t, 'no'); }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="food-more" data-act="nav" data-route="tutorial">튜토리얼에서 허용식품 · 금기식 전체 보기 →</button>' +
    '</section>';
  }

  function timeOnly(iso) {
    var m = String(iso || '').match(/T(\d{2}):(\d{2})/);
    return m ? m[1] + ':' + m[2] : '';
  }

  function photoControl(key, entry, hint) {
    var photo = M.photoOf(entry, key);
    var label = M.photoLabel[key] || key;
    var inputId = 'photo-' + key;
    var input = '<input id="' + inputId + '" class="q-file" type="file" accept="image/*" capture="environment" data-photo="' + esc(key) + '" aria-label="' + esc(label) + ' 인증사진 올리기">';
    if (photo) {
      return '<div class="q-photo has">' +
        '<button class="q-thumb" data-act="view-photo" data-key="' + esc(key) + '" aria-label="' + esc(label) + ' 인증사진 크게 보기">' +
          '<img src="' + esc(photo.dataUrl) + '" alt="' + esc(label) + ' 인증사진">' +
        '</button>' +
        '<span class="q-photo-info">' +
          '<span class="q-time">' + esc(timeOnly(photo.at)) + ' 촬영</span>' +
          '<label class="q-retake" for="' + inputId + '">' + icon('camera') + '다시 찍기</label>' +
        '</span>' +
        input +
      '</div>';
    }
    return '<div class="q-photo">' +
      '<label class="q-mini" for="' + inputId + '">' + icon('camera') + (hint || '인증사진') + '</label>' +
      input +
    '</div>';
  }

  function questSection(d) {
    var q = d.quests;
    if (!q) return '';
    var entry = d.entry || {};
    var cards = q.list.map(function (it, i) {
      var st = QUEST_STYLE[it.key] || { e: '✨', t: 'etc' };
      var cls = 'quest-card t-' + st.t + (it.done ? ' done' : '') + (it.na ? ' is-na' : '');
      var inner = '<span class="q-top">' +
          '<span class="q-num">' + (i + 1) + '</span>' +
          '<span class="q-ic" aria-hidden="true">' + st.e + '</span>' +
          '<b class="q-title">' + esc(it.label) + '</b>' +
          '<span class="q-check" aria-hidden="true">' + (it.done ? icon('check') : '') + '</span>' +
        '</span>' +
        '<span class="q-sub">' + esc(it.sub) + '</span>';
      var main;
      if (it.na) {
        main = '<div class="quest-main" aria-label="' + esc(it.label + ' ' + it.sub) + '">' + inner + '</div>';
      } else {
        main = '<button class="quest-main" data-act="toggle-quest" data-quest="' + esc(it.key) + '" aria-pressed="' + it.done + '" aria-label="' + esc(it.label + ' ' + (it.done ? '완료 취소' : '완료 처리')) + '">' + inner + '</button>';
      }
      var extra = '';
      if (it.key === 'water') {
        extra = '<div class="q-extra"><span>' + it.cups + '/' + it.target + '잔</span>' +
          '<button class="q-mini" data-act="water-inc"' + (it.cups >= it.target ? ' disabled' : '') + ' aria-label="물 한 잔 추가">+1잔</button></div>';
      }
      if (M.photoKeys.indexOf(it.key) >= 0 && !it.na) {
        extra += photoControl(it.key, entry, it.key === 'exercise' ? '운동 인증' : '인증사진');
      }
      return '<div class="' + cls + '">' + main + extra + '</div>';
    }).join('');

    return '<section class="quest-wrap">' +
      '<div class="quest-head">' +
        '<div><h2>오늘의 퀘스트</h2><p class="hint">눌러서 완료!</p></div>' +
        '<span class="quest-count">퀘스트 <b>' + q.done + '</b>/' + q.total + ' 완료</span>' +
      '</div>' +
      gaugeBlock(q.pct, { id: 'q-bar', cls: 'qbar', wrap: 'quest-gauge', small: true }) +
      '<div class="quest-grid">' + cards + '</div>' +
      '<p class="quest-foot">운동은 웨이트 20분+ 또는 유산소 40분+면 완료예요. 퀘스트는 28일 체크보드 · 관리자 기록과 바로 연결되고, 영양제 · 공복 · 생리 · 대변은 아래 세부 기록에서 체크해요.</p>' +
    '</section>';
  }

  function today(d) {
    var p = d.participant;
    var plan = d.plan;
    var entry = d.entry || {};
    var week = Program.weeks[d.week - 1] || {};
    var score = d.score;
    var fast = M.isFastDay(plan);

    var hero = heroBlock(d);

    var daynav = '<div class="daynav">' +
      '<button class="icon-btn" data-act="prev-day" aria-label="이전 날"' + (d.day <= 1 ? ' disabled' : '') + '>' + icon('back') + '</button>' +
      '<div class="daynav-center">' +
        '<strong>Day ' + d.day + '</strong>' +
        '<span>' + esc(M.fmtLong(d.date)) + (fast ? ' · 단식일' : (isDetoxDay(d.day) ? ' · D1~3 당질 제한' : '')) + '</span>' +
      '</div>' +
      '<button class="icon-btn" data-act="next-day" aria-label="다음 날"' + (d.day >= 28 ? ' disabled' : '') + '>' + icon('chevron') + '</button>' +
      (!d.isToday ? '<button class="daynav-today" data-act="go-today">오늘로</button>' : '') +
    '</div>';

    var timers = d.isToday
      ? '<div class="timer-grid">' + timerCardFasting(d) + timerCardDinner(d) + timerCardSleep(d) + '</div>'
      : '<p class="note-line">공복·저녁식사·수면 타이머는 오늘 화면에서 실시간으로 보여요.</p>';

    var quote = quoteBanner(d.quote, d.day);
    var foods = foodBar(d);
    var quests = questSection(d);

    var metrics = '<section class="card">' +
      '<div class="card-head"><h2>인바디 · 신체</h2><button class="link-btn" data-act="nav" data-route="body">주차별 인바디</button></div>' +
      '<div class="date-line">' +
        '<input class="date-input" type="date" data-field="date" value="' + esc(entry.date || d.date) + '" aria-label="측정 날짜">' +
        '<span class="hint">몸무게는 같은 시간에 재요</span>' +
      '</div>' +
      '<div class="metrics">' +
        metricField('weight', '몸무게', entry, d.deltas.weight, d.prevMetrics.weight) +
        metricField('muscle', '골격근량', entry, d.deltas.muscle, d.prevMetrics.muscle) +
        metricField('fat', '체지방량', entry, d.deltas.fat, d.prevMetrics.fat) +
        metricField('visceral', '내장지방레벨', entry, d.deltas.visceral, d.prevMetrics.visceral, '레벨', '1') +
      '</div>' +
    '</section>';

    var details = '<details class="card fold"' + (d.foldOpen ? ' open' : '') + '>' +
      '<summary><span>세부 기록</span><em>식단 · 영양 · 생활 루틴</em></summary>' +
      '<div class="fold-body">' +
        '<div class="subhead"><h2>식단 · 영양</h2><button class="link-btn" data-act="edit-plan">계획 수정</button></div>' +
        (fast ? '<p class="fast-note">' + icon('cup') + '<span>24시간 단식일이에요. 물·허브티만 마시고 영양제는 쉬어가요.</span></p>' : '') +
        '<div class="meal-list">' + Program.meals.map(function (m) { return mealRow(plan, m, entry); }).join('') + '</div>' +
        (function () {
          var pd = periodFor(d.day);
          return pd && pd.mealNote ? '<p class="note-line">' + esc(pd.mealNote) + '</p>' : '';
        })() +
        '<div class="sub-list">' +
          ['morning', 'evening'].map(function (k) {
            var on = !!(entry.supplements && entry.supplements[k]);
            var label = k === 'morning' ? '아침 영양제' : '저녁 영양제';
            var supHint = (Program.w1Plan && Program.w1Plan.days.indexOf(Number(d.day)) >= 0)
              ? Program.w1Plan.supplementShort[k] : '';
            if (fast) {
              return '<div class="switch-row compact is-na">' +
                '<span class="switch-text"><b>' + label + '</b><small>단식일엔 쉬어가요</small></span>' +
                '<span class="tick disabled" aria-hidden="true">–</span>' +
                '</div>';
            }
            return '<button class="switch-row compact" data-act="toggle-supp" data-supp="' + k + '" role="switch" aria-checked="' + on + '">' +
              '<span class="switch-text"><b>' + label + '</b>' + (supHint ? '<small>' + esc(supHint) + '</small>' : '') + '</span>' +
              '<span class="tick ' + (on ? 'on' : '') + '" aria-hidden="true">' + (on ? icon('check') : '') + '</span>' +
              '</button>';
          }).join('') +
        '</div>' +
        waterBlock(entry) +
        '<div class="subhead"><h2>생활 루틴</h2><span class="hint">자동 저장</span></div>' +
        '<div class="switch-list">' +
          switchRow('fasting14', '공복시간 유지', Program.check.fastingHours + '시간 · 저녁은 취침 4시간 전', !!entry.fasting14) +
          switchRow('sleep', '수면', Program.check.sleepHours + '시간 이상 · 밤 12~4시 포함', !!entry.sleep) +
          '<div class="switch-row static">' +
            '<span class="switch-text"><b>운동</b><small>웨이트 20분+ · 유산소 40분+</small></span>' +
            '<span class="ex-chips">' +
              '<button class="chip-btn ' + (entry.exercise && entry.exercise.weight ? 'on' : '') + '" data-act="toggle-exercise" data-kind="weight" aria-pressed="' + !!(entry.exercise && entry.exercise.weight) + '">웨이트</button>' +
              '<button class="chip-btn ' + (entry.exercise && entry.exercise.cardio ? 'on' : '') + '" data-act="toggle-exercise" data-kind="cardio" aria-pressed="' + !!(entry.exercise && entry.exercise.cardio) + '">유산소</button>' +
            '</span>' +
          '</div>' +
          switchRow('menstruation', '생리', '기록용', !!entry.menstruation) +
          switchRow('bowel', '대변', '기록', !!entry.bowel) +
        '</div>' +
      '</div>' +
    '</details>';

    var memo = '<section class="card">' +
      '<div class="card-head"><h2>오늘 메모</h2><span class="hint">입력 후 바깥을 누르면 저장</span></div>' +
      '<textarea class="memo" data-field="memo" rows="3" placeholder="컨디션, 식사 내용, 힘들었던 점을 적어두세요.">' + esc(entry.memo || '') + '</textarea>' +
      '<div class="memo-foot"><span class="hint">' + (entry.updatedAt ? '마지막 저장 ' + esc(timeShort(entry.updatedAt)) : '아직 저장 전') + '</span><button class="btn ghost sm" data-act="save-memo">메모 저장</button></div>' +
    '</section>';

    var feedback = (d.feedback && d.feedback.length)
      ? '<section class="card"><div class="card-head"><h2>관리자 피드백</h2></div>' + feedbackList(d.feedback.slice().reverse(), false) + '</section>'
      : '';

    return hero + daynav + timers + quote + quests + foods + sponsorSlot(d.promo) + metrics + details + memo + feedback;
  }

  /* ---------------- 28일 보드 ---------------- */
  function cell(day) {
    var st = M.dayStatus(day);
    var mark = st === 'done' ? '✓' : st === 'partial' ? '!' : '';
    var text = st === 'future' ? '예정' : st === 'miss' ? '미입력' : day.score.pct + '%';
    var label = 'Day ' + day.day + ', ' + M.fmtLong(day.date) + ', ' +
      (st === 'future' ? '예정' : st === 'miss' ? '미입력' : (st === 'done' ? '모두 완료' : '일부 완료 ' + day.score.pct + '%')) +
      (day.fast ? ', 단식일' : '');
    return '<button class="cell st-' + st + ' ' + (day.isToday ? 'is-today' : '') + '" data-act="open-day" data-day="' + day.day + '" aria-label="' + esc(label) + '">' +
      '<span class="cell-top"><b>D' + day.day + '</b>' + (day.fast ? '<i class="fast-dot"></i>' : '') + '</span>' +
      '<span class="cell-pct">' + (mark ? '<em>' + mark + '</em>' : '') + text + '</span>' +
      itemStrip(day.items) +
      '</button>';
  }

  function weekdaysRow() {
    return '<div class="weekdays" aria-hidden="true">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>';
  }

  function dayCard(day) {
    var done = !!(day.entry && day.entry.updatedAt);
    var st = M.dayStatus(day);
    var meals = Program.meals.map(function (m) {
      return '<i class="dot tone-' + Program.types[day.plan[m]].tone + '" title="' + Program.mealLabel[m] + ' ' + Program.types[day.plan[m]].label + '"></i>';
    }).join('');
    return '<button class="day-card ' + (day.isToday ? 'is-today' : '') + '" data-act="open-day" data-day="' + day.day + '">' +
      '<span class="day-card-top"><strong>Day ' + day.day + '</strong><span class="day-date">' + esc(M.fmtShort(day.date)) + '</span>' +
      (day.fast ? '<span class="mini-chip fast">단식</span>' : '') +
      '<span class="day-pct st-' + st + '">' + (day.isFuture ? '예정' : (done ? day.score.pct + '%' : '미입력')) + '</span></span>' +
      '<span class="day-card-meals">' + meals + '</span>' +
      itemGrid(day.items) +
      '<span class="mini-bar"><i style="width:' + (day.isFuture ? 0 : clampPct(day.score.pct)) + '%"></i></span>' +
      '<span class="day-card-foot"><span>' + (done ? '기록 완료' : (day.isFuture ? '아직 오지 않은 날' : '기록 전')) + '</span><span>' + esc(day.isToday ? '오늘' : '') + '</span></span>' +
      '</button>';
  }

  /* 주차별 핵심 안내 (미션 · 식단 · 단식 · 운동) — 보드의 각 주차 블록 상단 */
  function briefCard(p) {
    if (!p) return '';
    var b = p.brief || {};
    var rows = [['미션', b.mission], ['식단', b.diet], ['단식', b.fasting], ['운동', b.exercise]];
    return '<div class="wk-brief" data-badge="' + esc(p.badge) + '">' +
      '<div class="wk-brief-head"><span class="wk-badge">' + esc(p.badge) + '</span><b>' + esc(p.title) + '</b>' +
        (p.emoji ? '<em aria-hidden="true">' + p.emoji + '</em>' : '') + '</div>' +
      '<dl class="wk-brief-rows">' + rows.map(function (r) {
        return r[1] ? '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>' : '';
      }).join('') + '</dl>' +
    '</div>';
  }

  function weekBriefs(week) {
    var periods = Program.periods || [];
    var list = week === 1 ? [Program.detox, Program.w1Plan] : [periods[week]];
    return '<div class="wk-briefs">' + list.map(briefCard).join('') + '</div>';
  }

  function board(d) {
    var days = d.days;
    var cur = d.currentDay;
    var head = pageHead('28일 체크보드', 'Day ' + (cur || 1) + ' 진행 중 · 전체 달성률 ' + d.overall + '%');

    var seg = segmented('board-week', [['all', '전체'], ['1', '1주'], ['2', '2주'], ['3', '3주'], ['4', '4주']], d.week);

    var legend = '<div class="legend">' +
      '<span class="legend-item"><i class="sw st-done">✓</i>완료</span>' +
      '<span class="legend-item"><i class="sw st-partial">!</i>일부·미달</span>' +
      '<span class="legend-item"><i class="sw st-miss">–</i>미입력</span>' +
      '<span class="legend-item"><i class="sw st-future"></i>예정</span>' +
      '<span class="legend-item"><i class="sw today-sw"></i>오늘</span>' +
      '<span class="legend-item"><i class="fast-dot"></i>단식일</span>' +
    '</div>' +
    '<p class="legend-note">셀 아래 6칸은 <b>식단 · 물 · 영양제 · 공복 · 수면 · 운동</b> 순서예요. 초록 O, 코랄 X, 회색 미입력.</p>';

    var body = '';
    if (String(d.week) === 'all') {
      Program.weeks.forEach(function (w) {
        var cells = days.filter(function (x) { return x.week === w.week; }).map(cell).join('');
        body += '<section class="week-block">' +
          '<div class="week-block-head"><span class="week-title">' + esc(w.title) + '</span><span class="week-sub">' + esc(w.subtitle) + '</span></div>' +
          weekBriefs(w.week) +
          weekdaysRow() +
          '<div class="board-grid">' + cells + '</div>' +
        '</section>';
      });
    } else {
      var wk = Number(d.week);
      var w = Program.weeks[wk - 1];
      var list = days.filter(function (x) { return x.week === wk; });
      body += '<section class="week-block">' +
        '<div class="week-block-head"><span class="week-title">' + esc(w.title) + '</span><span class="week-sub">' + esc(w.summary) + '</span></div>' +
        weekBriefs(wk) +
        '<div class="board-grid big">' + list.map(cell).join('') + '</div>' +
        '<div class="day-cards">' + list.map(dayCard).join('') + '</div>' +
      '</section>';
      if (w.fastingDays && w.fastingDays.length) {
        body += '<p class="note-line">이 주의 단식일: ' + w.fastingDays.map(function (x) { return 'Day ' + x; }).join(', ') + ' — 개인 일정에 맞게 옮길 수 있어요(연속 단식 금지).</p>';
      }
    }

    var jump = '<div class="board-jump"><button class="btn ghost sm" data-act="go-today">오늘 기록하러 가기</button><button class="btn ghost sm" data-act="nav" data-route="tutorial">주차별 허용식품</button></div>';

    return head + seg + legend + body + jump;
  }

  /* ---------------- 주차별 인바디 ---------------- */
  function metricColor(key) {
    return key === 'weight' ? '#1F7A5C' : key === 'muscle' ? '#2F6FB0' : key === 'fat' ? '#D0793F' : '#C2694C';
  }

  function fmtNum(v, digits) {
    var dg = digits === undefined ? 1 : digits;
    return typeof v === 'number' && !isNaN(v) ? v.toFixed(dg) : '—';
  }

  function seriesBlock(key, label, values, showX, unit, digits) {
    var dg = digits === undefined ? 1 : digits;
    var u = unit || 'kg';
    var labels = ['시작', '1주', '2주', '3주', '4주'];
    var nums = values.filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    var color = metricColor(key);
    var head = '<div class="cs-head"><span class="cs-name"><i style="background:' + color + '"></i>' + label + '</span>';
    if (nums.length < 2) {
      return '<div class="chart-series"><div class="cs-head">' + head + '<span class="cs-now muted">기록 부족</span></div>' +
        '<p class="chart-mini-empty">2회 이상 기록하면 추이가 보여요.</p></div>';
    }
    var lastVal = nums[nums.length - 1];
    head += '<span class="cs-now" style="color:' + color + '">' + lastVal.toFixed(dg) + '<em>' + u + '</em></span></div>';

    var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
    if (max - min < 1) { var mid = (max + min) / 2; min = mid - 0.5; max = mid + 0.5; }
    var pad = (max - min) * 0.18;
    min = Math.round((min - pad) * 10) / 10;
    max = Math.round((max + pad) * 10) / 10;

    var W = 320, H = showX ? 92 : 72, pl = 30, pr = 14, pt = 8, pb = showX ? 18 : 8;
    var iw = W - pl - pr, ih = H - pt - pb;
    function x(i) { return pl + (iw * i) / 4; }
    function y(v) { return pt + ih - ((v - min) / (max - min)) * ih; }

    var grid = '<line x1="' + pl + '" y1="' + y(max).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y(max).toFixed(1) + '" class="chart-grid"/>' +
      '<line x1="' + pl + '" y1="' + y(min).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y(min).toFixed(1) + '" class="chart-grid"/>' +
      '<text x="' + (pl - 5) + '" y="' + (y(max) + 3).toFixed(1) + '" class="chart-tick" text-anchor="end">' + max.toFixed(dg) + '</text>' +
      '<text x="' + (pl - 5) + '" y="' + (y(min) + 3).toFixed(1) + '" class="chart-tick" text-anchor="end">' + min.toFixed(dg) + '</text>';

    var path = '', started = false;
    values.forEach(function (v, i) {
      if (typeof v !== 'number' || isNaN(v)) { started = false; return; }
      path += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' ';
      started = true;
    });
    var dots = '';
    values.forEach(function (v, i) {
      if (typeof v !== 'number' || isNaN(v)) return;
      dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.6" fill="#fff" stroke="' + color + '" stroke-width="1.8"/>';
    });
    var axis = '';
    if (showX) {
      labels.forEach(function (lb, i) {
        axis += '<line x1="' + x(i).toFixed(1) + '" y1="' + pt + '" x2="' + x(i).toFixed(1) + '" y2="' + (pt + ih) + '" class="chart-vgrid"/>' +
          '<text x="' + x(i).toFixed(1) + '" y="' + (H - 5) + '" class="chart-xlabel" text-anchor="middle">' + lb + '</text>';
      });
    }
    return '<div class="chart-series">' + head +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img" aria-label="' + label + ' 주차별 추이">' +
      grid + axis + '<path d="' + path.trim() + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' + dots +
      '</svg></div>';
  }

  function metricChart(wm) {
    var pts = [wm.start ? { weight: wm.start.weight, muscle: wm.start.muscle, fat: wm.start.fat, visceral: wm.start.visceral } : {}];
    wm.weeks.forEach(function (w) {
      if (w.value && !w.excluded) pts.push({ weight: w.value.weight, muscle: w.value.muscle, fat: w.value.fat, visceral: w.value.visceral });
      else pts.push({});
    });
    var pointCount = pts.filter(function (p) {
      return ['weight', 'muscle', 'fat', 'visceral'].some(function (k) { return typeof p[k] === 'number' && !isNaN(p[k]); });
    }).length;
    if (pointCount < 2) {
      return '<div class="chart-box"><div class="chart-empty">' + icon('sparkle') + '<p>인바디를 2회 이상 기록하면<br>주차별 그래프가 그려져요.</p></div></div>';
    }
    return '<div class="chart-box">' +
      seriesBlock('weight', '몸무게', pts.map(function (p) { return p.weight; }), false, 'kg', 1) +
      seriesBlock('muscle', '골격근량', pts.map(function (p) { return p.muscle; }), false, 'kg', 1) +
      seriesBlock('fat', '체지방량', pts.map(function (p) { return p.fat; }), true, 'kg', 1) +
      seriesBlock('visceral', '내장지방레벨', pts.map(function (p) { return p.visceral; }), false, '레벨', 0) +
      '</div>';
  }

  function changeCard(label, key, wm, unit, digits) {
    var dg = digits === undefined ? 1 : digits;
    var start = wm.start, latest = wm.latest;
    var sv = start && typeof start[key] === 'number' ? start[key] : null;
    var lv = latest && typeof latest[key] === 'number' ? latest[key] : null;
    var delta = wm.changes[key];
    return '<div class="change-card">' +
      '<span class="cc-label">' + label + '</span>' +
      '<span class="cc-val">' + (lv === null ? '—' : '<b>' + lv.toFixed(dg) + '</b><em>' + (unit || 'kg') + '</em>') + '</span>' +
      '<span class="cc-foot">' + (sv === null ? '시작 기록 전' : '시작 ' + sv.toFixed(dg)) +
        (delta === null ? '' : ' ' + deltaBadge(delta, key)) + '</span>' +
    '</div>';
  }

  function weekRow(data) {
    var v = data.value || {};
    var disabled = !data.editable;
    var badges = '';
    if (data.excluded) badges += '<span class="tiny-badge warn">단식 다음날 · 제외</span>';
    if (data.isThisWeek) badges += '<span class="tiny-badge">이번 주</span>';
    var meta = data.value
      ? 'Day ' + data.value.day + ' · ' + M.fmtShort(data.value.date) + ' 기록'
      : (disabled ? '아직 시작 전' : '미입력');
    var inputs = ['weight', 'muscle', 'fat', 'visceral'].map(function (k) {
      var val = typeof v[k] === 'number' ? v[k] : '';
      var lab = k === 'weight' ? '몸무게' : k === 'muscle' ? '골격근' : k === 'fat' ? '체지방' : '내장지방';
      var step = k === 'visceral' ? '1' : '0.1';
      return '<label class="wk-field"><span>' + lab + '</span>' +
        '<input type="number" inputmode="decimal" step="' + step + '" min="0" data-wk="' + data.wk + '" data-metric="' + k + '" value="' + esc(val) + '" placeholder="-"' + (disabled ? ' disabled' : '') + '>' +
        '</label>';
    }).join('');
    return '<div class="wk-row ' + (disabled ? 'is-disabled' : '') + '">' +
      '<div class="wk-head"><b>' + esc(data.label) + '</b><span>' + esc(meta) + '</span>' + badges + '</div>' +
      '<div class="wk-inputs">' + inputs + '</div>' +
      '<div class="wk-target">' + (disabled ? '아직 시작 전' : 'Day ' + data.targetDay + ' (' + esc(M.fmtShort(data.targetDate)) + ') 기록에 저장') + '</div>' +
    '</div>';
  }

  function inbodyView(d) {
    var wm = d.weekly;
    var p = d.participant;
    var changes = '<div class="change-grid">' + changeCard('몸무게', 'weight', wm) + changeCard('골격근량', 'muscle', wm) + changeCard('체지방량', 'fat', wm) + changeCard('내장지방레벨', 'visceral', wm, '레벨', 0) + '</div>';
    var notice = '<section class="notice-bar">' + icon('sparkle') + '<div><b>주 1회 인바디 체크</b><p>' + esc(wm.notice) + '</p></div></section>';

    var rows = weekRow({ wk: 0, label: '시작 · 1일차', value: wm.start, editable: true, targetDay: 1, targetDate: M.dayDate(p.startDate, 1) });
    wm.weeks.forEach(function (w) {
      rows += weekRow({
        wk: w.week, label: w.label, value: w.value, editable: w.editable,
        targetDay: w.targetDay, targetDate: w.targetDate, excluded: w.excluded,
        isThisWeek: w.startDay <= wm.currentDay && wm.currentDay <= w.endDay
      });
    });

    return notice + changes +
      '<section class="card"><div class="card-head"><h2>주차별 추이</h2><span class="hint">kg · 레벨</span></div>' + metricChart(wm) + '</section>' +
      '<section class="card"><div class="card-head"><h2>주차별 인바디 입력</h2><span class="hint">주 1회</span></div>' +
        '<p class="hint">값을 고치면 그 주에 기록된 날짜에 저장되고, 비어 있으면 이번 주는 오늘·지난 주는 주 마지막 날에 저장돼요.</p>' +
        '<div class="wk-list">' + rows + '</div>' +
      '</section>' +
      '<p class="disclaimer">단식일 다음날 측정값은 수분 영향으로 골격근량이 낮게 나올 수 있어 주차 인바디 집계에서 제외해요.</p>';
  }

  function weeklyReadTable(wm) {
    var head = '<tr><th>구분</th><th>기록일</th><th>몸무게</th><th>골격근량</th><th>체지방량</th><th>내장지방</th></tr>';
    var rows = '<tr><td><b>시작</b></td><td>' + (wm.start ? M.fmtShort(wm.start.date) : '—') + '</td>' +
      '<td>' + fmtNum(wm.start && wm.start.weight) + '</td><td>' + fmtNum(wm.start && wm.start.muscle) + '</td><td>' + fmtNum(wm.start && wm.start.fat) + '</td><td>' + fmtNum(wm.start && wm.start.visceral, 0) + '</td></tr>';
    wm.weeks.forEach(function (w) {
      var badge = w.excluded ? ' <span class="tiny-badge warn">제외</span>' : '';
      rows += '<tr class="' + (!w.value ? 'empty-row' : '') + '"><td><b>' + w.label + '</b>' + badge + '</td>' +
        '<td>' + (w.value ? M.fmtShort(w.value.date) : (w.editable ? '미입력' : '예정')) + '</td>' +
        '<td>' + fmtNum(w.value && w.value.weight) + '</td><td>' + fmtNum(w.value && w.value.muscle) + '</td><td>' + fmtNum(w.value && w.value.fat) + '</td><td>' + fmtNum(w.value && w.value.visceral, 0) + '</td></tr>';
    });
    return '<div class="table-wrap"><table class="data-table weekly-table"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  }

  function inbodyCard(wm) {
    return '<section class="card">' +
      '<div class="card-head"><h2>주차별 인바디</h2><span class="hint">시작 대비</span></div>' +
      '<div class="change-grid">' + changeCard('몸무게', 'weight', wm) + changeCard('골격근량', 'muscle', wm) + changeCard('체지방량', 'fat', wm) + changeCard('내장지방레벨', 'visceral', wm, '레벨', 0) + '</div>' +
      metricChart(wm) +
      weeklyReadTable(wm) +
      '<p class="hint center">' + esc(wm.notice) + '</p>' +
    '</section>';
  }

  /* ---------------- 공구 · 추천 ---------------- */
  function promoThumb(promo, big) {
    if (promo.imageUrl) {
      return '<span class="promo-thumb' + (big ? ' big' : '') + '"><img src="' + esc(promo.imageUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'broken\')"></span>';
    }
    var t = M.promoType(promo);
    return '<span class="promo-thumb fallback tone-' + t.tone + (big ? ' big' : '') + '">' + icon(t.key === 'coupang' ? 'link' : 'tag') + '</span>';
  }

  function promoCard(promo) {
    var t = M.promoType(promo);
    var c = M.promoCategory(promo);
    var disclosure = promo.disclosure || promo.type === 'coupang'
      ? '<p class="disclosure">' + esc(Program.promos.coupangDisclosure) + '</p>' : '';
    return '<article class="promo-card">' +
      '<div class="promo-card-top">' + promoThumb(promo) +
        '<div class="promo-card-head">' +
          '<div class="promo-badges"><span class="badge tone-' + t.tone + '">' + esc(t.badge) + '</span><span class="badge cat">' + esc(c.label) + '</span></div>' +
          '<h3>' + esc(promo.title) + '</h3>' +
          '<p class="promo-memo">' + esc(promo.memo || '') + '</p>' +
        '</div>' +
      '</div>' +
      (promo.benefit ? '<div class="promo-benefit">' + '<span class="benefit-label">혜택</span><span>' + esc(promo.benefit) + '</span></div>' : '') +
      '<a class="btn primary block sm" href="' + esc(promo.link) + '" target="_blank" rel="noopener noreferrer sponsored">' + esc(t.cta) + ' ' + icon('chevron') + '</a>' +
      disclosure +
    '</article>';
  }

  function promos(d) {
    var list = d.promos;
    var typeSeg = segmented('promo-type', [['all', '전체'], ['groupbuy', '공구'], ['coupang', '쿠팡'], ['ad', '광고']], d.type);
    var catItems = [['all', '전체']].concat(Object.keys(Program.promos.categories).map(function (k) { return [k, Program.promos.categories[k].label]; }));
    var catChips = '<div class="chips-row">' + catItems.map(function (it) {
      var on = String(it[0]) === String(d.category);
      return '<button class="chip-btn ' + (on ? 'on' : '') + '" data-act="promo-cat" data-value="' + esc(it[0]) + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';

    var filtered = list.filter(function (p) {
      if (d.type !== 'all' && p.type !== d.type) return false;
      if (d.category !== 'all' && p.category !== d.category) return false;
      return true;
    });

    var body = filtered.length
      ? '<div class="promo-list">' + filtered.map(promoCard).join('') + '</div>'
      : emptyState('아직 등록된 공구가 없어요', '관리자가 공구·광고를 등록하면 여기에 보여요.');

    var head = pageHead('공구 · 추천', '진행 중인 공구와 추천 제품을 모았어요');
    var foot = '<p class="disclaimer">공구·광고는 참여자분들을 위해 골라둔 정보예요. 구매는 외부 링크에서 이루어지고, 일부 링크는 수수료가 발생할 수 있어요.</p>';
    return head + typeSeg + catChips + body + foot;
  }

  /* ---------------- 튜토리얼 (첫 화면) ---------------- */
  function tutStep(step) {
    return '<li class="tut-step"><span class="tut-num" aria-hidden="true">' + esc(step.n) + '</span><span><b>' + esc(step.title) + '</b><small>' + esc(step.desc) + '</small></span></li>';
  }

  function tutMetric(name, label, value, unit, opt) {
    opt = opt || {};
    return '<label class="tut-field"><span>' + esc(label) + '</span>' +
      '<span class="tut-input"><input type="number" inputmode="decimal" step="' + (opt.step || '0.1') + '"' +
        (opt.min !== undefined ? ' min="' + opt.min + '"' : '') +
        (opt.max !== undefined ? ' max="' + opt.max + '"' : '') +
        ' name="' + name + '" data-tut="' + name + '" value="' + esc(value) + '" placeholder="-">' +
      '<em>' + esc(unit) + '</em></span></label>';
  }

  function proteinCard(weight) {
    var p = Program.protein;
    if (!p) return '';
    var shake = p.shake.map(function (s) {
      return '<div class="detox-item"><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></div>';
    }).join('');
    function g(v) { return Math.round(v) + 'g'; }
    var intake = p.intake.map(function (s) {
      var calc = '';
      if (weight) {
        var lo = Array.isArray(s.perKg) ? s.perKg[0] : s.perKg;
        var hi = Array.isArray(s.perKg) ? s.perKg[1] : s.perKg;
        calc = g(weight * lo) + (hi !== lo ? '~' + g(weight * hi) : '');
      }
      return '<div class="detox-item"><b>' + esc(s.title) + '</b><p>' + esc(s.text) +
        (calc ? '<em class="prot-calc">현재 체중 기준 ' + calc + '</em>' : '') + '</p></div>';
    }).join('');
    return '<section class="card guide-card">' +
      '<div class="card-head"><h2>단백질셰이크 선택 기준</h2><span class="hint">' +
        (weight ? '현재 체중 ' + weight.toFixed(1) + 'kg 기준' : '체중을 기록하면 권장량을 계산해드려요') + '</span></div>' +
      '<div class="detox-grid">' + shake + '</div>' +
      '<div class="food-group"><h3>하루 단백질 섭취 권장량</h3><div class="detox-grid">' + intake + '</div></div>' +
      '<p class="note-line">감량기에는 1.2~1.6g/kg를 기본으로, 운동량이 많으면 최대 2g/kg까지예요.</p>' +
    '</section>';
  }

  function tutorial(d) {
    var T = Program.tutorial || {};
    var start = d.start || {};
    var done = !!d.done;
    var nick = d.nickname || '';

    var head = pageHead('튜토리얼', T.sub || '시작 전에 5분만 읽어두면 28일이 쉬워져요',
      '<span class="week-chip' + (done ? ' is-done' : '') + '">' + (done ? '완료' : '시작 전') + '</span>');

    var intro = '<section class="tut-intro">' +
      '<div class="tut-intro-top"><span class="tut-mark" aria-hidden="true">' + icon('compass') + '</span>' +
        '<div><b>' + esc(T.title || '시작 튜토리얼') + '</b>' +
        '<p class="hint">순서대로 읽으면 28일 동안 뭘 먹고 어떻게 움직일지 다 정리돼요.</p></div></div>' +
      '<ol class="tut-steps">' + (T.steps || []).map(tutStep).join('') + '</ol>' +
    '</section>';

    var info = '<section class="card tut-card">' +
      '<div class="card-head"><span class="week-chip">01</span><h2>내 정보 &amp; 시작 인바디</h2></div>' +
      '<div class="tut-profile"><span class="avatar">' + esc(String(nick || '?').slice(0, 1)) + '</span>' +
        '<div><b>' + esc(nick || '닉네임을 넣어주세요') + '</b>' +
        '<p class="hint">여기서 저장하면 오늘 화면 프로필 · Day 1 인바디 · 단백질 권장량에 바로 반영돼요.</p></div></div>' +
      '<form id="tutorial-form" class="tut-form" autocomplete="off">' +
        '<label class="tut-field wide"><span>닉네임</span>' +
          '<span class="tut-input"><input type="text" name="nickname" data-tut="nickname" maxlength="12" value="' + esc(nick) + '" placeholder="예: 유니"></span></label>' +
        '<div class="tut-grid">' +
          tutMetric('weight', '시작 체중', start.weight, 'kg') +
          tutMetric('muscle', '골격근량', start.muscle, 'kg') +
          tutMetric('fat', '체지방량', start.fat, 'kg') +
          tutMetric('visceral', '내장지방 레벨', start.visceral, '레벨', { step: '1', min: 1, max: 20 }) +
        '</div>' +
        '<button class="btn outline block" type="submit">입력 저장</button>' +
        '<p class="hint">내장지방 레벨은 1~20 사이 숫자로 넣어주세요. 수치는 나중에 언제든 고칠 수 있어요.</p>' +
      '</form>' +
    '</section>';

    var core = [], rest = [];
    Program.rules.forEach(function (r) { (r.core ? core : rest).push(r); });
    var rules = '<section class="card tut-card">' +
      '<div class="card-head"><span class="week-chip">02</span><h2>기본 규칙</h2><span class="hint">매일 지키는 4가지</span></div>' +
      '<div class="tut-rules">' + core.map(function (r) {
        return '<div class="tut-rule"><span class="tut-rule-ic" aria-hidden="true">' + esc(r.emoji || '•') + '</span>' +
          '<div><b>' + esc(r.title) + '</b><p>' + esc(r.text) + '</p></div></div>';
      }).join('') + '</div>' +
      '<details class="tut-more"><summary>그 외 공통 수칙 ' + rest.length + '개</summary>' +
        '<div class="rule-list">' + rest.map(function (r) {
          return '<div class="rule-item"><b>' + esc(r.title) + '</b><span>' + esc(r.text) + '</span></div>';
        }).join('') + '</div>' +
      '</details>' +
    '</section>';

    var forbidden = '<section class="card tut-card">' +
      '<div class="card-head"><span class="week-chip">03</span><h2>전 주차 금기식품</h2><span class="hint">한 입도 안 돼요</span></div>' +
      '<div class="tut-chips">' + Program.forbidden.map(function (g) { return foodChipHTML(g.emoji, g.chip, 'no'); }).join('') + '</div>' +
      '<details class="tut-more"><summary>항목별로 자세히 보기</summary><div class="forbid-list">' + Program.forbidden.map(function (g) {
        return '<div class="forbid-item">' +
          '<div class="fi-top"><span class="fi-emoji" aria-hidden="true">' + g.emoji + '</span><b>' + esc(g.title) + '</b></div>' +
          '<span>' + esc(g.items.join(' · ')) + '</span></div>';
      }).join('') + '</div></details>' +
      '<p class="note-line">한 입이라도 먹으면 몸은 먹은 음식을 모두 지방으로 쌓으려 해요. 애매하면 먹지 않는 쪽을 골라요.</p>' +
    '</section>';

    var periods = Program.periods || [];
    var allowed = '<section class="card tut-card">' +
      '<div class="card-head"><span class="week-chip">04</span><h2>주차별 허용식품</h2><span class="hint">앞 주차에 더해져요</span></div>' +
      periods.map(function (p, i) {
        var chips = i === 0 ? (p.chips || []) : (p.additions || []);
        var note = i === 0 ? 'D1~3 기본 허용' : '이전 주차 허용식품 + 추가';
        return '<div class="tut-period">' +
          '<div class="tut-period-head"><span class="wk-badge">' + esc(p.badge) + '</span><b>' + esc(p.title) + '</b><small>' + esc(note) + '</small></div>' +
          '<div class="tut-chips">' + chips.map(function (c) { return foodChipHTML(c.e, c.t, 'ok'); }).join('') + '</div>' +
        '</div>';
      }).join('') +
    '</section>';

    var eating = '<section class="card tut-card">' +
      '<div class="card-head"><h2>외식 추천 메뉴</h2><span class="hint">외식할 땐 이렇게</span></div>' +
      '<div class="tut-chips">' + Program.eatingOut.recommend.map(function (it) { return '<span class="food-chip good">' + esc(it) + '</span>'; }).join('') + '</div>' +
      '<div class="avoid-line"><span class="hint">피하기</span><div class="tut-chips">' + Program.eatingOut.avoid.map(function (it) { return '<span class="food-chip bad">' + esc(it) + '</span>'; }).join('') + '</div></div>' +
    '</section>';

    var cta = '<div class="tut-cta">' +
      '<button class="btn primary block" data-act="tutorial-start">' + esc(done ? (T.ctaDone || '저장하고 오늘로 이동 →') : (T.cta || '입력 저장하고 1일차 시작하기 →')) + '</button>' +
      '<p class="hint center">' + (done
        ? '튜토리얼은 언제든 이 탭에서 다시 볼 수 있어요.'
        : '저장하면 오늘 탭으로 이동해요. 튜토리얼은 언제든 다시 볼 수 있어요.') + '</p>' +
    '</div>';

    return head + intro + info + rules + proteinCard(d.weight) + forbidden + allowed + eating + cta +
      '<p class="disclaimer">' + esc(Program.disclaimer) + '</p>';
  }

  /* ---------------- 인바디 (독립 탭) ---------------- */
  function body(d) {
    return pageHead('인바디', '주 1회 측정 · 시작 대비 변화') + inbodyView(d);
  }

  /* ---------------- 관리자 ---------------- */
  function adminTabs(tab) {
    return '<div class="segmented wide">' +
      '<button class="' + (tab === 'participants' ? 'on' : '') + '" data-act="admin-tab" data-tab="participants">참여자 관리</button>' +
      '<button class="' + (tab === 'promos' ? 'on' : '') + '" data-act="admin-tab" data-tab="promos">공구·광고 관리</button>' +
    '</div>';
  }

  function changeText(s, kind) {
    if (!s) return '<span class="delta muted">기록 부족</span>';
    var v = s.delta;
    var flat = Math.abs(v) < 0.05;
    var good = kind === 'muscle' ? v > 0 : v < 0;
    var cls = flat ? 'delta flat' : (good ? 'delta good' : 'delta bad');
    var arrow = v > 0 ? '▲' : (v < 0 ? '▼' : '–');
    var num = kind === 'visceral' ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1);
    return '<span class="' + cls + '">' + arrow + ' ' + num + '</span>';
  }

  function participantCard(s) {
    var badge = s.finished
      ? '<span class="pill ok">28일 완주</span>'
      : (s.currentDay === 0
        ? '<span class="pill">시작 전</span>'
        : (s.todayChecked ? '<span class="pill ok">오늘 체크</span>' : '<span class="pill warn">오늘 미체크</span>'));
    var recent = s.lastDate ? '최근 ' + M.fmtShort(s.lastDate) : '기록 없음';
    return '<button class="p-card" data-act="admin-open" data-id="' + esc(s.id) + '">' +
      '<span class="avatar">' + esc((s.name || '?').slice(0, 1)) + '</span>' +
      '<span class="p-main">' +
        '<span class="p-line1"><strong>' + esc(s.name) + '</strong>' + (s.nickname ? '<span class="nick-chip">' + esc(s.nickname) + '</span>' : '') + '<span class="code-chip">' + esc(s.code) + '</span>' + badge + '</span>' +
        '<span class="p-line2">Day ' + s.currentDay + ' · ' + recent + '</span>' +
        '<span class="p-line3"><span class="mini-bar"><i style="width:' + clampPct(s.rate) + '%"></i></span><b>' + s.rate + '%</b></span>' +
        '<span class="p-line4"><span class="m-label">몸무게</span>' + changeText(s.weight) +
          '<span class="m-label">골격근</span>' + changeText(s.muscle, 'muscle') +
          '<span class="m-label">체지방</span>' + changeText(s.fat) +
          '<span class="m-label">내장지방</span>' + changeText(s.visceral, 'visceral') + '</span>' +
      '</span>' +
    '</button>';
  }

  function admin(d) {
    var sums = d.summaries;
    var total = sums.length;
    var active = sums.filter(function (s) { return !s.finished && s.currentDay > 0; });
    var checked = active.filter(function (s) { return s.todayChecked; }).length;
    var avg = total ? Math.round(sums.reduce(function (a, s) { return a + s.rate; }, 0) / total) : 0;

    var head = '<header class="page-head admin-head"><div><p class="kicker">관리자 대시보드</p><h1>참여자 관리</h1></div><span class="admin-badge">' + (d.role === 'admin' ? '관리자' : '데모') + '</span></header>';
    var stats = '<div class="stat-grid">' +
      '<div class="stat"><span>참여자</span><b>' + total + '</b><small>명</small></div>' +
      '<div class="stat"><span>오늘 체크</span><b>' + checked + '</b><small>/ ' + active.length + '</small></div>' +
      '<div class="stat"><span>평균 달성률</span><b>' + avg + '</b><small>%</small></div>' +
    '</div>';

    if (d.tab === 'promos') {
      return head + adminTabs('promos') + adminPromosBody(d);
    }

    var list = total ? '<div class="p-list">' + sums.map(participantCard).join('') + '</div>' : emptyState('참여자가 없어요', '참여자를 추가하고 참여코드를 전달해주세요.');

    var tools = '<section class="card tools-card">' +
      '<div class="card-head"><h2>참여자 추가 · 내보내기</h2></div>' +
      '<div class="tool-row">' +
        '<button class="btn primary sm" data-act="open-add">' + icon('plus') + ' 참여자 추가</button>' +
        '<button class="btn outline sm" data-act="export-summary">' + icon('download') + ' 전체 CSV</button>' +
      '</div>' +
      '<p class="hint">참여자 추가 시 4자리 참여코드가 자동 생성돼요. 코드는 참여자 상세에서 복사할 수 있어요.</p>' +
    '</section>';

    var footer = '<section class="card muted-card">' +
      '<div class="card-head"><h2>데모 · 설정</h2></div>' +
      '<p class="hint">지금은 로컬 데모 데이터로 동작해요. 실제 배포에서는 관리자 로그인과 서버 저장(Supabase)을 붙여야 합니다.</p>' +
      '<div class="tool-row">' +
        '<button class="btn ghost sm" data-act="nav" data-route="promos">참여자 화면의 공구 탭 보기</button>' +
        '<button class="btn danger-ghost sm" data-act="reset-demo">데모 데이터 초기화</button>' +
      '</div>' +
    '</section>';

    return head + adminTabs('participants') + stats + tools + list + footer;
  }

  function promoRow(p) {
    var t = M.promoType(p);
    var c = M.promoCategory(p);
    var host = '';
    try { host = String(p.link || '').replace(/^https?:\/\//, '').split('/')[0]; } catch (e) { host = ''; }
    return '<div class="promo-row ' + (p.active ? '' : 'is-off') + '">' +
      promoThumb(p) +
      '<div class="promo-row-main">' +
        '<div class="promo-badges"><span class="badge tone-' + t.tone + '">' + esc(t.badge) + '</span><span class="badge cat">' + esc(c.label) + '</span>' + (p.featured ? '<span class="badge feat">배너</span>' : '') + '</div>' +
        '<strong>' + esc(p.title) + '</strong>' +
        '<span class="hint">' + esc(host) + (p.memo ? ' · ' + esc(p.memo) : '') + '</span>' +
      '</div>' +
      '<div class="promo-row-actions">' +
        '<button class="switch sm ' + (p.active ? 'on' : '') + '" data-act="promo-toggle" data-id="' + esc(p.id) + '" role="switch" aria-checked="' + !!p.active + '" aria-label="노출 ' + (p.active ? '끄기' : '켜기') + '"><i></i></button>' +
        '<button class="icon-btn" data-act="promo-edit" data-id="' + esc(p.id) + '" aria-label="수정">' + icon('edit') + '</button>' +
        '<button class="icon-btn danger" data-act="promo-delete" data-id="' + esc(p.id) + '" aria-label="삭제">' + icon('trash') + '</button>' +
      '</div>' +
    '</div>';
  }

  function adminPromosBody(d) {
    var list = d.promos || [];
    var active = list.filter(function (p) { return p.active; }).length;
    var body = list.length
      ? '<div class="promo-admin-list">' + list.map(promoRow).join('') + '</div>'
      : emptyState('등록된 공구·광고가 없어요', '새 공구를 등록하면 참여자 화면에 바로 보여요.');
    return '<section class="stat-grid">' +
        '<div class="stat"><span>전체</span><b>' + list.length + '</b><small>개</small></div>' +
        '<div class="stat"><span>노출 중</span><b>' + active + '</b><small>개</small></div>' +
        '<div class="stat"><span>배너</span><b>' + list.filter(function (p) { return p.featured && p.active; }).length + '</b><small>개</small></div>' +
      '</section>' +
      '<div class="tool-row promo-tools">' +
        '<button class="btn primary sm" data-act="promo-new">' + icon('plus') + ' 새 공구·광고</button>' +
      '</div>' +
      '<p class="hint promo-hint">여기서 등록·수정한 내용이 참여자 화면의 배너와 공구 탭에 바로 반영돼요. ON/OFF로 노출을 끌 수 있어요.</p>' +
      body +
      '<p class="disclaimer">샘플 3건이 들어 있어요. 실제 링크로 수정하거나 삭제한 뒤 사용하세요. 쿠팡 파트너스 링크는 고지 문구 노출을 켜두는 게 좋아요.</p>';
  }

  function adminDetail(d) {
    var p = d.participant;
    var s = d.summary;
    var back = '<button class="back-btn" data-act="admin-back">' + icon('back') + ' 참여자 목록</button>';
    var head = '<section class="card detail-head">' +
      '<div class="detail-top">' +
        '<span class="avatar lg">' + esc((p.name || '?').slice(0, 1)) + '</span>' +
        '<div class="detail-name"><h1>' + esc(p.name) + '</h1><span class="hint">' + (p.nickname ? '닉네임 ' + esc(p.nickname) + ' · ' : '') + '참여코드 ' + esc(p.code) + ' · 시작 ' + esc(p.startDate) + '</span></div>' +
        '<div class="ring" style="--p:' + clampPct(s.rate) + '%"><b>' + s.rate + '%</b><small>28일</small></div>' +
      '</div>' +
      '<div class="detail-chips">' +
        '<span class="pill">Day ' + s.currentDay + '</span>' +
        '<button class="pill copy" data-act="copy-code" data-code="' + esc(p.code) + '">참여코드 ' + esc(p.code) + ' 복사</button>' +
        (s.finished ? '<span class="pill ok">28일 완주</span>' : (s.todayChecked ? '<span class="pill ok">오늘 체크 완료</span>' : '<span class="pill warn">오늘 미체크</span>')) +
        '<span class="pill">최근 ' + (s.lastDate ? M.fmtShort(s.lastDate) : '기록 없음') + '</span>' +
      '</div>' +
      '<div class="detail-metrics">' +
        '<div><span>몸무게</span>' + changeText(s.weight) + '</div>' +
        '<div><span>골격근량</span>' + changeText(s.muscle, 'muscle') + '</div>' +
        '<div><span>체지방량</span>' + changeText(s.fat) + '</div>' +
        '<div><span>내장지방레벨</span>' + changeText(s.visceral, 'visceral') + '</div>' +
      '</div>' +
    '</section>';

    var heat = '<section class="card">' +
      '<div class="card-head"><h2>28일 체크 현황</h2><span class="hint">색이 진할수록 달성률 높음</span></div>' +
      '<div class="board-grid compact">' + d.days.map(cell).join('') + '</div>' +
      '<div class="legend">' +
        '<span class="legend-item"><i class="sw st-done">✓</i>완료</span>' +
        '<span class="legend-item"><i class="sw st-partial">!</i>일부</span>' +
        '<span class="legend-item"><i class="sw st-miss">–</i>미입력</span>' +
        '<span class="legend-item"><i class="sw st-future"></i>예정</span>' +
        '<span class="legend-item"><i class="fast-dot"></i>단식일</span>' +
      '</div>' +
    '</section>';

    var rows = d.days.filter(function (x) { return !x.isFuture; }).map(function (x) {
      var e = x.entry || {};
      var done = e.updatedAt ? '기록' : '—';
      return '<tr class="' + (e.updatedAt ? '' : 'empty-row') + '">' +
        '<td><b>D' + x.day + '</b><br><span class="hint">' + esc(M.fmtShort(e.date || x.date)) + '</span></td>' +
        '<td><span class="pct-tag lv' + (x.score.pct >= 75 ? '3' : x.score.pct >= 50 ? '2' : x.score.pct > 0 ? '1' : '0') + '">' + (e.updatedAt ? x.score.pct + '%' : '—') + '</span></td>' +
        '<td>' + (typeof e.weight === 'number' ? e.weight : '—') + '</td>' +
        '<td>' + (typeof e.visceral === 'number' ? e.visceral : '—') + '</td>' +
        '<td>' + (M.photoCount(e) ? M.photoCount(e) + '장' : '—') + '</td>' +
        '<td>' + done + '</td>' +
        '<td class="memo-cell">' + esc(e.memo || '') + '</td>' +
        '</tr>';
    }).join('');
    var table = '<section class="card">' +
      '<div class="card-head"><h2>일별 기록</h2></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Day</th><th>달성률</th><th>몸무게</th><th>내장지방</th><th>사진</th><th>기록</th><th>메모</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</section>';

    var photos = '<section class="card">' +
      '<div class="card-head"><h2>인증사진</h2><span class="hint">' + (d.photos ? d.photos.length : 0) + '장</span></div>' +
      photoGallery(d.photos) +
    '</section>';

    var dayOptions = '<option value="">전체 피드백</option>' + d.days.filter(function (x) { return !x.isFuture; }).reverse().map(function (x) {
      return '<option value="' + x.day + '">Day ' + x.day + ' · ' + M.fmtShort(x.date) + '</option>';
    }).join('');

    var fb = '<section class="card">' +
      '<div class="card-head"><h2>피드백</h2><span class="hint">참여자 오늘 화면에 보여요</span></div>' +
      feedbackList((d.feedback || []).slice().reverse(), true) +
      '<form id="feedback-form" class="stack" data-id="' + esc(p.id) + '">' +
        '<select class="input" name="day">' + dayOptions + '</select>' +
        '<textarea class="memo" name="text" rows="3" placeholder="예: 물 8잔 잘 지켰어요. 내일 단식일은 일정 확인해보세요."></textarea>' +
        '<button class="btn primary block sm" type="submit">피드백 남기기</button>' +
      '</form>' +
    '</section>';

    var exportBtn = '<div class="tool-row"><button class="btn outline block" data-act="export-detail" data-id="' + esc(p.id) + '">' + icon('download') + ' 이 참여자 기록 CSV</button></div>';

    return back + head + heat + (d.weekly ? inbodyCard(d.weekly) : '') + photos + table + fb + exportBtn;
  }

  function photoGallery(list) {
    if (!list || !list.length) {
      return '<p class="hint">아직 올린 인증사진이 없어요. 참여자가 퀘스트 카드에서 사진을 올리면 여기에 보여요.</p>';
    }
    return '<div class="photo-grid">' + list.map(function (x) {
      return '<button class="photo-cell" data-act="view-photo" data-key="' + esc(x.key) + '" data-day="' + x.day + '" aria-label="Day ' + x.day + ' ' + esc(x.label) + ' 인증사진">' +
        '<img src="' + esc(x.photo.dataUrl) + '" alt="Day ' + x.day + ' ' + esc(x.label) + ' 인증사진" loading="lazy">' +
        '<span>D' + x.day + ' · ' + esc(x.label) + ' ' + esc(timeShort(x.photo.at)) + '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function photoSheet(d) {
    var ph = d.photo || {};
    var kb = Math.max(1, Math.round((ph.bytes || 0) / 1024));
    return sheetWrap(
      sheetHead(d.label + ' 인증사진', 'Day ' + d.day + ' · ' + M.fmtLong(d.date)) +
      '<figure class="photo-view"><img src="' + esc(ph.dataUrl) + '" alt="' + esc(d.label) + ' 인증사진"></figure>' +
      '<div class="photo-meta"><span>' + esc(timeShort(ph.at)) + ' 촬영</span><span>' + kb + 'KB · ' + (ph.w || 0) + '×' + (ph.h || 0) + '</span></div>' +
      (d.canDelete ? '<button class="btn danger-ghost block" data-act="photo-delete">사진 삭제</button>' : '<p class="hint center">관리자 화면에서는 사진을 확인만 할 수 있어요.</p>')
    );
  }

  /* ---------------- 시트(모달) ---------------- */
  function sheetWrap(inner, cls) {
    return '<div class="sheet-backdrop" data-act="close-sheet"></div>' +
      '<div class="sheet ' + (cls || '') + '" role="dialog" aria-modal="true">' +
        '<span class="sheet-grab"></span>' + inner +
      '</div>';
  }

  function sheetHead(title, sub) {
    return '<div class="sheet-head"><div><h2>' + esc(title) + '</h2>' + (sub ? '<p class="hint">' + esc(sub) + '</p>' : '') + '</div>' +
      '<button class="icon-btn" data-act="close-sheet" aria-label="닫기">' + icon('close') + '</button></div>';
  }

  function planSheet(d) {
    var options = ['SHAKE', 'LOW', 'ZERO', 'FAST'];
    var rows = Program.meals.map(function (m) {
      var cur = d.draft[m];
      return '<label class="plan-row"><span>' + Program.mealLabel[m] + '</span>' +
        '<select class="input" data-plan-meal="' + m + '">' +
          options.map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + Program.types[k].label + '</option>'; }).join('') +
        '</select></label>';
    }).join('');

    var warn = '';
    if (d.conflict && d.conflict.length) {
      warn = '<div class="warn-banner">' + icon('sparkle') +
        '<div><b>연속 단식이에요</b><p>Day ' + d.conflict.join(', Day ') + '도 단식일이라 이틀 연속 단식이 됩니다. 프로그램은 연속 단식을 금지하고 있어요. 그래도 저장할까요?</p></div></div>';
    }

    return sheetWrap(
      sheetHead('Day ' + d.day + ' 식단 계획', '이 참여자에게만 적용돼요') +
      '<div class="plan-edit">' + rows + '</div>' +
      warn +
      '<div class="sheet-actions between">' +
        '<button class="btn ghost sm" data-act="plan-fast">24시간 단식일로</button>' +
        '<button class="btn ghost sm" data-act="plan-reset">기본값으로</button>' +
      '</div>' +
      '<button class="btn primary block" data-act="plan-save">이 계획으로 저장</button>'
    );
  }

  function promoSheet(d) {
    var p = d.promo || {};
    var typeOpts = Object.keys(Program.promos.types).map(function (k) {
      return '<option value="' + k + '"' + ((p.type || 'groupbuy') === k ? ' selected' : '') + '>' + Program.promos.types[k].label + '</option>';
    }).join('');
    var catOpts = Object.keys(Program.promos.categories).map(function (k) {
      return '<option value="' + k + '"' + ((p.category || 'shake') === k ? ' selected' : '') + '>' + Program.promos.categories[k].label + '</option>';
    }).join('');
    var checked = function (b) { return b ? ' checked' : ''; };

    return sheetWrap(
      sheetHead(d.isNew ? '새 공구 · 광고' : '공구 · 광고 수정', '등록하면 참여자 화면에 바로 반영돼요') +
      '<form id="promo-form" class="stack" data-id="' + esc(p.id || '') + '" data-new="' + (d.isNew ? '1' : '0') + '">' +
        '<div class="field-row">' +
          '<label class="field"><span>유형</span><select class="input" name="type">' + typeOpts + '</select></label>' +
          '<label class="field"><span>카테고리</span><select class="input" name="category">' + catOpts + '</select></label>' +
        '</div>' +
        '<label class="field"><span>제품명</span><input class="input" name="title" maxlength="60" placeholder="예: 단백질 쉐이크 2주 세트" value="' + esc(p.title || '') + '" required></label>' +
        '<label class="field"><span>한 줄 메모</span><input class="input" name="memo" maxlength="80" placeholder="예: 순탄수 15g↓ · 1회 20g 단백질" value="' + esc(p.memo || '') + '"></label>' +
        '<label class="field"><span>혜택 · 할인코드</span><input class="input" name="benefit" maxlength="80" placeholder="예: 참여코드 입력 시 10% 할인" value="' + esc(p.benefit || '') + '"></label>' +
        '<label class="field"><span>링크 URL</span><input class="input" name="link" inputmode="url" placeholder="https://..." value="' + esc(p.link || '') + '" required></label>' +
        '<label class="field"><span>썸네일 이미지 URL <em class="hint">(비우면 기본 아이콘)</em></span><input class="input" name="imageUrl" inputmode="url" placeholder="https://.../image.jpg" value="' + esc(p.imageUrl || '') + '"></label>' +
        '<div class="check-line"><label class="check-field"><input type="checkbox" name="active"' + checked(p.active !== false) + '><span>참여자에게 노출</span></label>' +
        '<label class="check-field"><input type="checkbox" name="featured"' + checked(p.featured) + '><span>오늘 화면 배너에 노출</span></label></div>' +
        '<label class="check-field"><input type="checkbox" name="disclosure"' + checked(p.disclosure) + '><span>쿠팡 파트너스 고지 문구 표시</span></label>' +
        '<p class="hint">쿠팡 추천 상품은 고지 문구를 켜두는 게 안전해요.</p>' +
        '<div class="sheet-actions">' +
          (d.isNew ? '' : '<button type="button" class="btn danger-ghost sm" data-act="promo-delete" data-id="' + esc(p.id || '') + '">삭제</button>') +
          '<button type="button" class="btn ghost sm" data-act="close-sheet">취소</button>' +
          '<button type="submit" class="btn primary sm">저장</button>' +
        '</div>' +
      '</form>'
    );
  }

  function addParticipantSheet() {
    return sheetWrap(
      sheetHead('참여자 추가', '4자리 참여코드가 자동 생성돼요') +
      '<form id="add-p-form" class="stack">' +
        '<label class="field"><span>이름</span><input class="input" name="name" placeholder="이름" required></label>' +
        '<label class="field"><span>닉네임 <em class="hint">(비우면 이름으로 표시)</em></span><input class="input" name="nickname" maxlength="12" placeholder="예: 유니"></label>' +
        '<label class="field"><span>시작일</span><input class="input" type="date" name="startDate" value="' + M.todayStr() + '" required></label>' +
        '<label class="field"><span>참여코드 <em class="hint">(비우면 자동)</em></span><input class="input" name="code" inputmode="numeric" maxlength="8" placeholder="예: 5821"></label>' +
        '<button class="btn primary block" type="submit">참여자 만들기</button>' +
        '<p class="hint">참여자는 이름 + 참여코드로 입장할 수 있어요.</p>' +
      '</form>'
    );
  }

  function profileSheet(d) {
    var p = d.participant;
    var provider = d.provider === 'supabase' || d.provider === 'kakao' ? '카카오 로그인'
      : (d.provider === 'code' ? '참여코드 입장' : (d.provider === 'admin' || d.role === 'admin' ? '관리자 코드' : '데모 체험'));
    return sheetWrap(
      sheetHead('내 정보') +
      '<div class="profile-head"><span class="avatar lg">' + esc(String(p.nickname || p.name || '?').slice(0, 1)) + '</span>' +
        '<div><h3>' + esc(p.name) + '</h3><p class="hint">' + (p.nickname ? '닉네임 ' + esc(p.nickname) + ' · ' : '') + '참여코드 ' + esc(p.code) + ' · 시작 ' + esc(p.startDate) + '</p></div>' +
      '</div>' +
      '<div class="profile-rows">' +
        '<div><span>진행</span><b>Day ' + d.currentDay + ' / 28</b></div>' +
        '<div><span>28일 달성률</span><b>' + d.rate + '%</b></div>' +
        '<div><span>로그인 방식</span><b>' + esc(provider) + '</b></div>' +
      '</div>' +
      '<form id="profile-form" class="nick-form" data-id="' + esc(p.id || '') + '">' +
        '<label class="field"><span>닉네임 <em class="hint">(오늘 화면에 표시)</em></span>' +
          '<input class="input" name="nickname" maxlength="12" placeholder="예: 유니" value="' + esc(p.nickname || '') + '"></label>' +
        '<button class="btn ghost sm" type="submit">닉네임 저장</button>' +
      '</form>' +
      (d.role === 'admin' ? '<button class="btn outline block" data-act="nav" data-route="admin">관리자 대시보드 열기</button>' : '') +
      '<button class="btn ghost block" data-act="signout">계정 전환 / 로그아웃</button>' +
      '<p class="hint center">' + esc(Program.name) + ' · v' + esc(Program.version) + (d.authMode === 'demo' ? ' · 데모 모드' : '') + '</p>'
    );
  }

  function confirmSheet(d) {
    return sheetWrap('<div class="confirm">' +
      '<span class="confirm-ic ' + (d.tone || '') + '">' + icon(d.icon || 'sparkle') + '</span>' +
      '<h2>' + esc(d.title) + '</h2>' +
      '<p>' + esc(d.message) + '</p>' +
      '<div class="sheet-actions">' +
        '<button class="btn ghost" data-act="close-sheet">취소</button>' +
        '<button class="btn primary" data-act="confirm-run" data-key="' + esc(d.key) + '">' + esc(d.confirmLabel || '확인') + '</button>' +
      '</div></div>', 'small');
  }

  function kakaoSheet(d) {
    if (d.authMode !== 'demo') {
      return sheetWrap(sheetHead('카카오 로그인') +
        '<p class="sheet-text">카카오 로그인을 시작할게요. 잠시만 기다려주세요.</p>');
    }
    return sheetWrap(
      sheetHead('카카오로 시작하기', '지금은 데모 모드예요') +
      '<div class="kakao-demo">' +
        '<span class="kakao-circle">' + '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2c-4.9 0-8.8 3-8.8 6.7 0 2.4 1.6 4.5 4 5.8l-.9 3.2c-.1.3.2.5.4.3l3.8-2.5c.5.1 1 .1 1.5.1 4.9 0 8.8-3 8.8-6.9S16.9 3.2 12 3.2z"/></svg>' + '</span>' +
        '<p>배포하면 이 버튼이 카카오 계정과 연결됩니다.<br>(Supabase Auth · Kakao OAuth)<br>지금은 아래 체험 계정으로 시작해요.</p>' +
      '</div>' +
      '<button class="btn primary block" data-act="demo-login" data-role="participant">데모 참여자(김유니)로 시작</button>' +
      '<p class="hint center">관리자 화면은 로그인 화면의 ‘관리자 로그인’에서 코드로 들어갈 수 있어요.</p>'
    );
  }

  global.App.Views = {
    gate: gate,
    tabbar: tabbar,
    today: today,
    board: board,
    body: body,
    promos: promos,
    promoCard: promoCard,
    tutorial: tutorial,
    admin: admin,
    adminDetail: adminDetail,
    planSheet: planSheet,
    promoSheet: promoSheet,
    addParticipantSheet: addParticipantSheet,
    profileSheet: profileSheet,
    photoSheet: photoSheet,
    photoGallery: photoGallery,
    confirmSheet: confirmSheet,
    kakaoSheet: kakaoSheet,
    sheetWrap: sheetWrap,
    icon: icon,
    esc: esc
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.App.Views; }
})(typeof window !== 'undefined' ? window : globalThis);
