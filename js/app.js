/* 앱 컨트롤러 — 라우팅, 이벤트, 저장 */
(function (global) {
  'use strict';

  var Program = global.App.Program;
  var M = global.App.Model;
  var Views = global.App.Views;
  var CFG = global.App.Config;
  var Auth = global.App.Auth;

  var storage = global.localStorage;
  var store = CFG.dataMode === 'rest'
    ? global.App.Store.createRest({ baseUrl: CFG.rest.baseUrl })
    : global.App.Store.createLocal({ storage: storage, namespace: 'mod.v2' });

  /* 이전 버전(mod.v1)의 데모 데이터·세션 정리 — 실제 개인 데이터가 남지 않도록 */
  (function purgeLegacyStorage() {
    try {
      ['mod.v1.session', 'mod.v1.participants', 'mod.v1.promos', 'mod.v1.seeded'].forEach(function (k) { storage.removeItem(k); });
    } catch (e) { /* 저장소를 쓸 수 없으면 그냥 넘어간다 */ }
  })();

  /* 관리자 전용 동작: 관리자 코드로 로그인한 세션에서만 처리한다 */
  var ADMIN_ACTS = {
    'admin-tab': 1, 'admin-open': 1, 'admin-back': 1, 'open-add': 1,
    'export-summary': 1, 'export-detail': 1, 'copy-code': 1, 'reset-demo': 1,
    'promo-new': 1, 'promo-edit': 1, 'promo-toggle': 1, 'promo-delete': 1
  };

  var state = {
    route: 'today',
    day: null,
    boardWeek: 'all',
    foldOpen: true,
    promoType: 'all',
    promoCat: 'all',
    adminTab: 'participants',
    adminId: null,
    sheet: null,
    reportRound: null,
    session: null,
    participant: null,
    participants: [],
    promos: [],
    toastTimer: null,
    lastKey: '',
    pendingActions: {}
  };

  function today() { return M.todayStr(); }

  function isAdminSession() { return !!(state.session && state.session.role === 'admin'); }

  function $(id) { return global.document.getElementById(id); }

  function activePromos() {
    return M.activePromos(state.promos);
  }

  function participantById(id) {
    for (var i = 0; i < state.participants.length; i++) {
      if (state.participants[i].id === id) return state.participants[i];
    }
    return null;
  }

  function applyParticipant(updated) {
    if (!updated) return;
    if (state.participant && state.participant.id === updated.id) state.participant = updated;
    for (var i = 0; i < state.participants.length; i++) {
      if (state.participants[i].id === updated.id) state.participants[i] = updated;
    }
  }

  /* ---------------- 토스트 ---------------- */
  function toast(msg, tone) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (tone ? ' ' + tone : '');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      el.className = 'toast';
    }, msg.length > 34 ? 4200 : 2400);
  }

  /* ---------------- 라우팅 ---------------- */
  function parseRoute() {
    var h = String(global.location.hash || '').replace(/^#\/?/, '');
    var wantsAdmin = h === 'admin' || h === 'admin/promos' || h.indexOf('admin/') === 0;
    /* 관리자 코드로 들어온 세션이 아니면 주소로도 관리자 화면을 열 수 없다 */
    if (wantsAdmin && !isAdminSession()) { state.route = 'today'; state.adminId = null; return; }
    if (h === 'tutorial' || h === 'guide') { state.route = 'tutorial'; return; }
    if (h === 'board') { state.route = 'board'; return; }
    if (h === 'body') { state.route = 'body'; return; }
    if (h === 'promos') { state.route = 'promos'; return; }
    if (h === 'admin/promos') { state.route = 'admin'; state.adminTab = 'promos'; return; }
    if (h.indexOf('admin/') === 0) { state.route = 'adminDetail'; state.adminId = h.slice(6); return; }
    if (h === 'admin') { state.route = 'admin'; state.adminTab = 'participants'; return; }
    state.route = 'today';
  }

  function go(route) {
    var hash = '#/' + route;
    if (global.location.hash === hash) { parseRoute(); render(); return; }
    global.location.hash = hash;
  }

  function onHashChange() {
    parseRoute();
    render();
  }

  /* ---------------- 부트 ---------------- */
  async function boot() {
    try {
      await store.init({ participants: global.App.Seed.build(today()), promos: global.App.Seed.promos(today()) });
    } catch (e) {
      console.error(e);
    }
    state.session = Auth.readSession();
    if (CFG.authMode !== 'demo') {
      try {
        var resumed = await Auth.resume();
        if (resumed) state.session = resumed;
      } catch (e) { /* 로그인 세션 복구 실패는 게이트로 안내 */ }
    }
    await reloadAll();
    /* v15까지 개인 시작은 데모 참여자에 붙었으니, 내 기록으로 한 번 옮겨준다 */
    try { await migrateLegacyPersonal(); } catch (e) { /* 이동 실패는 무시하고 그대로 연다 */ }
    parseRoute();
    /* 처음 접속(튜토리얼 미완료)이면 튜토리얼 탭이 먼저 열린다 */
    if (state.participant && !M.tutorialDone(state.participant) && state.route === 'today') state.route = 'tutorial';
    render();
    global.document.addEventListener('click', onClick);
    global.document.addEventListener('change', onChange);
    global.document.addEventListener('submit', onSubmit);
    global.document.addEventListener('toggle', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('fold')) state.foldOpen = !!t.open;
    }, true);
    global.addEventListener('hashchange', onHashChange);

    if ('serviceWorker' in global.navigator && /^https?:$/.test(global.location.protocol)) {
      global.navigator.serviceWorker.register('./sw.js').catch(function () { /* 오프라인 캐시는 배포 시에만 */ });
    }

    /* 공복 · 수면 타이머는 1초마다 직접 갱신 (입력 중인 화면을 다시 그리지 않음) */
    if (global.setInterval) {
      state.timerId = global.setInterval(function () { tickTimers(); }, 1000);
    }
  }

  async function reloadAll() {
    try {
      state.participants = await store.listParticipants();
      state.promos = await store.listPromos();
    } catch (e) {
      state.participants = [];
      state.promos = [];
      toast('데이터를 불러오지 못했어요: ' + e.message, 'error');
    }
    if (state.session && !state.session.participantId && (state.session.authUserId || state.session.email)) {
      for (var i = 0; i < state.participants.length; i++) {
        var cand = state.participants[i];
        if ((state.session.authUserId && cand.authUserId === state.session.authUserId) ||
            (state.session.email && cand.email === state.session.email)) {
          state.session.participantId = cand.id;
          Auth.writeSession(state.session);
          break;
        }
      }
    }
    if (state.session && state.session.participantId) {
      var p = participantById(state.session.participantId);
      if (!p) { state.session = null; Auth.signOut(); }
      state.participant = p || null;
    } else {
      state.participant = null;
    }
  }

  /* ---------------- 렌더 ---------------- */
  function render() {
    var view = $('view');
    var nav = $('nav');
    var app = $('app');
    if (!view) return;

    if (!state.participant && !isAdminSession()) {
      app.classList.add('gate-mode');
      view.innerHTML = Views.gate({ authMode: CFG.authMode });
      nav.innerHTML = '';
      nav.hidden = true;
      renderSheet();
      return;
    }
    app.classList.remove('gate-mode');
    nav.hidden = false;

    /* 참여자 세션은 관리자 화면·관리자 상세로 갈 수 없다 */
    if (!isAdminSession() && (state.route === 'admin' || state.route === 'adminDetail')) {
      state.route = 'today';
      state.adminId = null;
    }
    /* 관리자 세션에 참여자 프로필이 없으면 관리자 화면만 보여준다 */
    if (!state.participant && isAdminSession() && state.route !== 'admin' && state.route !== 'adminDetail') {
      state.route = 'admin';
      state.adminTab = 'participants';
    }

    var html = '';
    try {
      if (state.route === 'tutorial') {
        html = Views.tutorial(tutorialData());
      } else if (state.route === 'board') {
        html = Views.board(boardData());
      } else if (state.route === 'body') {
        html = Views.body(boardData());
      } else if (state.route === 'promos') {
        html = Views.promos(promosData());
      } else if (state.route === 'admin') {
        html = Views.admin(adminData());
      } else if (state.route === 'adminDetail') {
        var dd = adminDetailData();
        if (!dd) { go('admin'); return; }
        html = Views.adminDetail(dd);
      } else {
        html = Views.today(todayData());
      }
    } catch (e) {
      console.error(e);
      html = '<div class="card"><h2>화면을 그리지 못했어요</h2><p class="hint">' + Views.esc(e.message) + '</p></div>';
    }

    view.innerHTML = html;
    nav.innerHTML = Views.tabbar({ route: state.route, role: state.session ? state.session.role : 'participant' });

    var key = state.route + '|' + state.adminTab + '|' + state.adminId + '|' + state.promoType + '|' + state.promoCat;
    if (state.lastKey && key !== state.lastKey) {
      try { global.scrollTo(0, 0); } catch (e) { /* 무시 */ }
    }
    state.lastKey = key;
    renderSheet();
    tickTimers();
  }

  function viewDay() {
    var p = state.participant;
    var cur = M.currentDay(p, today());
    var day = state.day || cur || 1;
    if (day < 1) day = 1;
    if (day > Program.totalDays) day = Program.totalDays;
    return day;
  }

  function todayData() {
    var p = state.participant;
    var day = viewDay();
    var cur = M.currentDay(p, today());
    var plan = M.getPlan(p, day);
    var entry = M.getEntry(p, day);
    var score = M.scoreDay(plan, entry);
    var prev = { weight: null, muscle: null, fat: null, visceral: null };
    var deltas = { weight: null, muscle: null, fat: null, visceral: null };
    ['weight', 'muscle', 'fat', 'visceral'].forEach(function (k) {
      var pv = M.lastMetricBefore(p, day, k);
      if (pv) {
        prev[k] = pv.value;
        if (entry && typeof entry[k] === 'number') deltas[k] = M.round1(entry[k] - pv.value);
      }
    });
    var prefs = M.timerPrefs(p);
    var now = new Date();
    var curDay = M.currentDay(p, today());
    return {
      participant: p,
      nickname: p.nickname || p.name,
      day: day,
      week: Math.ceil(day / 7),
      date: M.dayDate(p.startDate, day),
      isToday: day === cur,
      currentDay: curDay,
      beforeStart: curDay === 0,
      daysToStart: curDay === 0 ? Math.max(0, M.diffDays(M.todayStr(), M.dayDate(p.startDate, 1))) : 0,
      startDate: M.dayDate(p.startDate, 1),
      round: M.roundNumber(p),
      finished: curDay >= Program.totalDays,
      plan: plan,
      entry: entry,
      score: score,
      overall: M.overallRate(p, today()),
      checkedDays: M.checkedDays(p),
      prevMetrics: prev,
      deltas: deltas,
      body: M.latestValues(p, day, ['weight', 'muscle', 'fat', 'visceral']),
      prefs: prefs,
      fasting: M.fastingDayState(p, day, now, Program.check.fastingHours),
      fast24: M.fast24State(p, day, now, Program.check.fast24Hours),
      fastPrev: M.fastPrevMeal(p, day),
      prevFast: M.prevFastInfo(p, day, today()),
      sleep: M.sleepState(prefs.wake, now, Program.check.sleepHours),
      dinner: M.dinnerDayState(p, day, now, M.dinnerMode(p, day)),
      quote: M.quoteFor(day),
      fast: M.isFastDay(plan),
      photos: (entry && entry.photos) || {},
      foldOpen: state.foldOpen,
      questTimes: M.questTimes(p),
      quests: M.quests(plan, entry, day),
      feedback: (p.feedback || []).slice(-3)
    };
  }

  function boardData() {
    var p = state.participant;
    return {
      participant: p,
      days: M.boardDays(p, today()),
      week: state.boardWeek,
      currentDay: M.currentDay(p, today()),
      overall: M.overallRate(p, today()),
      round: M.roundNumber(p),
      weekly: M.weeklyMetrics(p, today())
    };
  }

  /* 시작일 미리보기 — 과거·오늘·미래를 모두 자연스러운 말로 */
  function startPreviewText(startDate) {
    if (!startDate || !M.isDateStr(startDate)) return '시작일을 골라주세요.';
    var t = today();
    var day = M.dayNumberFor(startDate, t);
    if (day < 1) return M.fmtLong(startDate) + '부터 시작해요 · D-' + (1 - day) + ' (시작 전)';
    if (day === 1) return '오늘(' + M.fmtLong(t) + ')이 Day 1이에요';
    if (day > Program.totalDays) return M.fmtLong(startDate) + '에 시작한 기록이에요 · 28일이 이미 지났어요';
    return M.fmtLong(startDate) + '에 시작했어요 · 오늘은 Day ' + day + ' (' + Math.ceil(day / 7) + '주차)';
  }

  /* 튜토리얼: 시작 인바디(Day 1) 값과 단백질 권장량 계산용 체중 */
  function tutorialData() {
    var p = state.participant;
    var d1 = M.getEntry(p, 1) || {};
    var latest = M.latestValues(p, Program.totalDays, ['weight', 'muscle', 'fat', 'visceral']);
    function pick(key) {
      if (typeof d1[key] === 'number') return d1[key];
      var lv = latest[key];
      return lv && typeof lv.value === 'number' ? lv.value : '';
    }
    var weight = pick('weight');
    var cs = M.cycleSettings(p);
    var startDate = p.startDate || M.todayStr();
    var round = M.roundNumber(p);
    var history = M.roundSummaries(p, today()).filter(function (r) { return !r.current; });
    return {
      participant: p,
      nickname: p.nickname || '',
      startDate: startDate,
      startPreview: startPreviewText(startDate),
      done: M.tutorialDone(p),
      currentDay: M.currentDay(p, today()),
      round: round,
      roundHistory: history,
      gender: cs.gender,
      cycle: { start: cs.cycleStart || '', length: cs.cycleLength, days: cs.periodDays },
      start: {
        weight: weight,
        muscle: pick('muscle'),
        fat: pick('fat'),
        visceral: pick('visceral')
      },
      weight: typeof weight === 'number' && weight > 0 ? weight : null
    };
  }

  function promosData() {
    return {
      promos: activePromos(),
      type: state.promoType,
      category: state.promoCat
    };
  }

  /* 28일 최종 리포트 데이터 — 회차 탭·누적 비교 포함 */
  function reportData(round) {
    var p = state.participant;
    if (!p) return { report: null, round: 1, total: 1, rounds: [] };
    var total = M.roundNumber(p);
    var viewed = Number(round) || Number(state.reportRound) || total;
    if (viewed < 1 || viewed > total) viewed = total;
    var rounds = M.roundSummaries(p, today());
    var subject = M.roundAt(p, viewed);
    var summary = rounds[viewed - 1] || null;
    return {
      report: summary ? summary.report : M.finalReport(subject, today()),
      round: viewed,
      total: total,
      rounds: rounds,
      subject: subject
    };
  }

  /* ---------------- 회차 (1차 · 2차 · N차 누적) ---------------- */
  function currentRoundSummary() {
    var p = state.participant;
    if (!p) return null;
    return M.roundSummary(p, M.roundNumber(p), today());
  }

  function roundSheetData(s) {
    var p = state.participant || {};
    var cs = M.cycleSettings(p);
    return {
      participant: p,
      round: M.roundNumber(p),
      current: currentRoundSummary() || {},
      gender: cs.gender,
      startDate: (s && s.startDate) || today()
    };
  }

  function openRoundSheet() {
    if (!state.participant) return;
    openSheet({ type: 'round', startDate: today() });
  }

  /* 지금 회차를 보관하고 다음 회차 Day 1을 시작한다 (기록은 지우지 않는다) */
  async function startNextRound(form) {
    var p = state.participant;
    if (!p) return false;
    var els = form && form.elements;
    var rawDate = els && els.namedItem('startDate') ? String(els.namedItem('startDate').value || '').trim() : '';
    var startDate = rawDate || today();
    if (!M.isDateStr(startDate)) { toast('시작일을 날짜로 넣어주세요', 'error'); return false; }
    var nickEl = els && els.namedItem('nickname');
    var nick = nickEl ? String(nickEl.value || '').trim().slice(0, 12) : '';
    var n = M.roundNumber(p);
    try {
      var rounds = (p.rounds || []).slice();
      rounds.push({
        round: n,
        startDate: p.startDate,
        endDate: M.dayDate(p.startDate, Program.totalDays),
        entries: JSON.parse(JSON.stringify(p.entries || {})),
        planOverrides: JSON.parse(JSON.stringify(p.planOverrides || {})),
        feedback: JSON.parse(JSON.stringify(p.feedback || [])),
        archivedAt: new Date().toISOString()
      });
      /* 이어받기: 닉네임·성별·생리주기 + 직전 최신 인바디. Day 기준 타이머 값은 새로 시작 */
      var settings = Object.assign({}, p.settings || {});
      delete settings.fastStarts;
      delete settings.fastPrevMeal;
      delete settings.lastMeals;
      var entries = {};
      var latest = M.latestValues(p, Program.totalDays, ['weight', 'muscle', 'fat', 'visceral']);
      var carried = {};
      ['weight', 'muscle', 'fat', 'visceral'].forEach(function (k) {
        if (latest[k] && typeof latest[k].value === 'number') carried[k] = latest[k].value;
      });
      if (Object.keys(carried).length) {
        entries['1'] = { date: M.dayDate(startDate, 1), meals: {}, supplements: {}, exercise: {}, updatedAt: new Date().toISOString() };
        Object.keys(carried).forEach(function (k) { entries['1'][k] = carried[k]; });
      }
      var patch = { rounds: rounds, startDate: startDate, entries: entries, planOverrides: {}, feedback: [], settings: settings };
      if (nick && nick !== p.nickname) { patch.nickname = nick; if (!p.name) patch.name = nick; }
      var updated = await store.updateParticipant(p.id, patch);
      applyParticipant(updated);
      state.day = null;
      state.reportRound = null;
      closeSheet();
      go('today');
      render();
      toast(M.roundLabel(n) + ' 기록을 보관하고 ' + M.roundLabel(n + 1) + ' Day 1을 시작했어요');
      return true;
    } catch (e) {
      toast('회차를 시작하지 못했어요: ' + e.message, 'error');
      return false;
    }
  }

  function adminData() {
    var sums = state.participants.map(function (p) { return M.summary(p, today()); });
    sums.sort(function (a, b) { return b.rate - a.rate; });
    return {
      summaries: sums,
      tab: state.adminTab,
      promos: state.promos,
      role: state.session ? state.session.role : 'participant'
    };
  }

  function adminDetailData() {
    var p = participantById(state.adminId);
    if (!p) return null;
    return {
      participant: p,
      summary: M.summary(p, today()),
      days: M.boardDays(p, today()),
      currentDay: M.currentDay(p, today()),
      feedback: p.feedback || [],
      photos: M.photoDays(p, today()),
      weekly: M.weeklyMetrics(p, today())
    };
  }

  /* ---------------- 시트 ---------------- */
  function openSheet(sheet) {
    state.sheet = sheet;
    renderSheet();
  }

  function closeSheet() {
    state.sheet = null;
    renderSheet();
  }

  /* 추천템 시트: 분류(공구/쿠팡/광고)에 따라 일정·하위 카테고리 입력란을 보인다 */
  function syncPromoSheetFields(type) {
    var form = global.document.getElementById('promo-form');
    if (!form) return;
    var t = form.querySelector ? form.querySelector('#promo-type-sel') : null;
    var v = type || (t && t.value) || 'groupbuy';
    var list = form.querySelectorAll ? form.querySelectorAll('[data-promo-schedule]') : [];
    for (var i = 0; i < list.length; i++) list[i].hidden = v !== 'groupbuy';
    var sub = form.querySelectorAll ? form.querySelectorAll('[data-promo-subcat]') : [];
    for (var j = 0; j < sub.length; j++) sub[j].hidden = v !== 'coupang';
  }

  function renderSheet() {
    var layer = $('sheet');
    if (!layer) return;
    var s = state.sheet;
    if (!s) {
      layer.hidden = true;
      layer.innerHTML = '';
      return;
    }
    var html = '';
    if (s.type === 'plan') {
      html = Views.planSheet({ day: s.day, draft: s.draft, conflict: s.conflict });
    } else if (s.type === 'fastMove') {
      html = Views.fastMoveSheet(fastMoveData(s.week, s.fromDay));
    } else if (s.type === 'promo') {
      html = Views.promoSheet({ promo: s.promo, isNew: s.isNew });
    } else if (s.type === 'report') {
      html = Views.report(reportData(s.round));
    } else if (s.type === 'round') {
      html = Views.roundSheet(roundSheetData(s));
    } else if (s.type === 'add') {
      html = Views.addParticipantSheet();
    } else if (s.type === 'profile') {
      var pp = state.participant;
      html = Views.profileSheet({
        participant: pp,
        currentDay: M.currentDay(pp, today()),
        rate: M.overallRate(pp, today()),
        round: M.roundNumber(pp),
        provider: state.session ? state.session.provider : 'demo',
        role: state.session ? state.session.role : 'participant',
        authMode: CFG.authMode
      });
    } else if (s.type === 'photo') {
      html = Views.photoSheet(s);
    } else if (s.type === 'confirm') {
      html = Views.confirmSheet(s);
    } else if (s.type === 'kakao') {
      html = Views.kakaoSheet({ authMode: CFG.authMode });
    }
    layer.hidden = false;
    layer.innerHTML = html;
  }

  function confirmAction(key, opts) {
    state.pendingActions[key] = opts.onConfirm;
    openSheet({
      type: 'confirm',
      key: key,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel || '확인',
      tone: opts.tone || '',
      icon: opts.icon || 'sparkle'
    });
  }

  function runPending(key) {
    var fn = state.pendingActions[key];
    delete state.pendingActions[key];
    closeSheet();
    if (typeof fn === 'function') return fn();
    return null;
  }

  /* ---------------- 저장 ---------------- */
  async function updateEntry(patch, dayArg) {
    var p = state.participant;
    var day = dayArg || viewDay();
    var entry = M.getEntry(p, day);
    var base = entry ? JSON.parse(JSON.stringify(entry)) : { date: M.dayDate(p.startDate, day) };
    var next = Object.assign({}, base, patch);
    if (patch.meals) next.meals = Object.assign({}, base.meals || {}, patch.meals);
    if (patch.supplements) next.supplements = Object.assign({}, base.supplements || {}, patch.supplements);
    if (patch.exercise) next.exercise = Object.assign({}, base.exercise || {}, patch.exercise);
    if (patch.photos) {
      var merged = Object.assign({}, base.photos || {});
      Object.keys(patch.photos).forEach(function (k) {
        if (patch.photos[k]) merged[k] = patch.photos[k];
        else delete merged[k];
      });
      next.photos = merged;
    }
    next.date = next.date || M.dayDate(p.startDate, day);
    next.updatedAt = new Date().toISOString();
    try {
      var updated = await store.putEntry(p.id, day, next);
      applyParticipant(updated);
      render();
    } catch (e) {
      var quota = e && /quota/i.test(String((e.name || '') + ' ' + (e.message || '')));
      toast(quota ? '저장 공간이 부족해요. 지난 인증사진을 지우고 다시 시도해주세요.' : '저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* ---------- 인증사진 ---------- */
  async function handlePhotoInput(el) {
    var key = el.getAttribute('data-photo');
    var file = el.files && el.files[0];
    if (!file) return;
    var label = M.photoLabel[key] || '인증';
    var Photo = global.App.Photo;
    if (!Photo) { toast('이 브라우저에서는 사진을 처리할 수 없어요', 'error'); return; }
    toast(label + ' 사진을 준비하고 있어요...');
    try {
      var shot = await Photo.compress(file, label, new Date());
      var day = viewDay();
      var patch = { photos: {} };
      patch.photos[key] = shot;
      /* 사진의 촬영(첨부) 시각에 맞춰 해당 항목을 알아서 체크하고, 아침·저녁은 타이머 기록에도 남긴다 */
      var plan = M.getPlan(state.participant, day);
      if (Program.meals.indexOf(key) >= 0 && plan[key] !== 'FAST') {
        patch.meals = {};
        patch.meals[key] = true;
      }
      if (key === 'exercise') patch.exercise = { weight: true, cardio: true };
      var shotAt = shot.at ? new Date(shot.at) : new Date();
      var shotHM = isNaN(shotAt.getTime()) ? M.clockOf(new Date()) : M.clockOf(shotAt);
      var sameDay = isNaN(shotAt.getTime()) ? true : M.fmtDate(shotAt) === M.dayDate(state.participant.startDate, day);
      var linked = null;
      if (key === 'breakfast' && sameDay && plan.breakfast !== 'FAST') {
        patch.breakfastAt = shotHM;
        linked = '아침 식사';
      }
      if (key === 'dinner' && sameDay) {
        patch.lastMealAt = shotHM;
        linked = '저녁 식사 시작';
      }
      await updateEntry(patch);
      if (key === 'dinner' && sameDay) {
        var settings = Object.assign({}, state.participant.settings || {});
        settings.lastMeals = Object.assign({}, (settings.lastMeals && typeof settings.lastMeals === 'object') ? settings.lastMeals : {});
        settings.lastMeals[String(day)] = shotHM;
        try {
          var updated = await store.updateParticipant(state.participant.id, { settings: settings });
          applyParticipant(updated);
          render();
        } catch (e2) { /* 사진은 이미 저장됐으니 설정 실패는 넘긴다 */ }
      }
      toast(label + ' 인증사진 저장 완료 · ' + Math.max(1, Math.round((shot.bytes || 0) / 1024)) + 'KB' +
        (linked ? ' · ' + shotHM + ' ' + linked + ' 체크' : ''));
    } catch (e) {
      toast((e && e.message) || '사진을 저장하지 못했어요', 'error');
    } finally {
      try { el.value = ''; } catch (e2) { /* 무시 */ }
    }
  }

  async function saveMetric(field, raw) {
    var p = state.participant;
    var day = viewDay();
    var entry = M.getEntry(p, day);
    if (!entry && (raw === '' || raw === null)) return;
    var num = raw === '' ? null : Number(raw);
    var max = field === 'visceral' ? 60 : 400;
    if (num !== null && (isNaN(num) || num < 0 || num > max)) {
      toast(field === 'visceral' ? '내장지방레벨은 0~60 사이 숫자로 넣어주세요' : '숫자를 확인해주세요', 'error');
      return;
    }
    var next = entry ? JSON.parse(JSON.stringify(entry)) : { date: M.dayDate(p.startDate, day), meals: {}, supplements: {}, exercise: {} };
    next[field] = num;
    next.date = next.date || M.dayDate(p.startDate, day);
    next.updatedAt = new Date().toISOString();
    try {
      var updated = await store.putEntry(p.id, day, next);
      applyParticipant(updated);
      render();
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* 타이머 시각(마지막 식사 · 기상 목표)은 참여자 설정으로 저장해 매일 써요 */
  function paintDinner(t) {
    if (!t) return;
    setHtmlIfChanged($('t-dinner-cap'), Views.esc(t.done ? '마감 시각이 지났어요' : '저녁 식사는 ' + t.deadlineClock + '까지'));
    if (t.mealChecked) {
      setHtmlIfChanged($('t-dinner-value'), '<span class="big-num">' + Views.esc(t.dinnerAt) + '</span> <em>저녁 식사 시작</em>');
      setHtmlIfChanged($('t-dinner-note'), Views.esc('여기서부터 공복이 시작돼요 · 다음 날 공복 타이머도 이 시각부터 계산해요.'));
    } else {
      setHtmlIfChanged($('t-dinner-value'), t.done
        ? '<span class="big-num">마감 ' + Views.esc(t.overText) + ' 지났어요</span>'
        : '<span class="big-num">' + Views.esc(t.leftText) + '</span> <em>남았어요</em>');
      setHtmlIfChanged($('t-dinner-note'), Views.esc(t.done
        ? '취침 ' + t.bedClock + ' ' + t.offsetHours + '시간 전(' + t.deadlineClock + ')을 넘었어요. 다음엔 조금 더 일찍 먹어봐요.'
        : t.label + '을 취침 ' + t.offsetHours + '시간 전(' + t.deadlineClock + ')까지 끝내요.'));
    }
    setHtmlIfChanged($('t-dinner-state'), Views.esc(t.emoji + ' ' + t.tag));
    setHtmlIfChanged($('t-dinner-meta'), '취침 ' + t.bedClock + ' · ' + t.offsetHours + '시간 전');
    setHtmlIfChanged($('t-dinner-pct'), t.pct + '%');
    setWidth('t-dinner-bar', t.pct);
    setRunner('t-dinner-run', t.pct);
  }

  async function saveSetting(key, value, message) {
    var p = state.participant;
    if (!p) return;
    var settings = Object.assign({}, p.settings || {});
    settings[key] = value;
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      render();
      tickTimers();
      if (message) toast(message);
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  async function saveTimerPref(key, value) {
    var p = state.participant;
    if (!p) return;
    var norm = M.normHM(value, '');
    if (!norm) { toast('시각을 확인해주세요', 'error'); return; }
    var settings = Object.assign({}, p.settings || {});
    settings[key] = norm;
    /* 그 날의 마지막 식사 시각을 남겨두면 다음 날 단식일 24시간 타이머가 자동으로 맞춰진다 */
    if (key === 'lastMeal') {
      settings.lastMeals = Object.assign({}, (settings.lastMeals && typeof settings.lastMeals === 'object') ? settings.lastMeals : {});
      settings.lastMeals[String(viewDay())] = norm;
    }
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      tickTimers();
      toast(key === 'lastMeal' ? '마지막 식사 시각을 ' + norm + '으로 저장했어요' : '기상 목표를 ' + norm + '으로 저장했어요');
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* 퀘스트(투두) 시간대 저장 */
  async function saveQuestTime(key, value) {
    var p = state.participant;
    if (!p || !key) return;
    var settings = Object.assign({}, p.settings || {});
    var times = Object.assign({}, M.questTimes(p));
    var norm = M.normHM(value, '');
    if (!norm) { toast('시각을 확인해주세요', 'error'); return; }
    times[key] = norm;
    settings.questTimes = times;
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      render();
      toast('시간대를 ' + norm + '으로 바꿨어요');
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* 아침 · 저녁 퀘스트 체크 ↔ 공복 · 저녁 타이머 기록을 함께 맞춘다 */
  async function toggleMealByQuest(kind, on) {
    if (on) { await saveMealClock(kind, M.clockOf(new Date())); return; }
    await toggleMealClock(kind);
  }

  /* 아침 식사 · 저녁 식사 체크: 누른 순간의 시각을 그 날 기록에 남긴다 */
  async function toggleMealClock(kind) {
    var p = state.participant;
    if (!p) return;
    var day = viewDay();
    var entry = M.getEntry(p, day) || {};
    var field = kind === 'breakfast' ? 'breakfastAt' : 'lastMealAt';
    var saved = M.hmToMinutes(entry[field]) !== null ? M.normHM(entry[field], '') : null;
    if (saved) {
      var off = {};
      off[field] = null;
      if (!(M.getPlan(p, day)[kind] === 'FAST')) {
        off.meals = {};
        off.meals[kind] = false;
      }
      await updateEntry(off);
      if (kind === 'dinner') await clearDayLastMeal(day);
      toast(kind === 'breakfast' ? '아침 식사 기록을 지웠어요' : '저녁 식사 기록을 지웠어요');
      return;
    }
    await saveMealClock(kind, M.clockOf(new Date()));
  }

  async function clearDayLastMeal(day) {
    var p = state.participant;
    if (!p) return;
    var settings = Object.assign({}, p.settings || {});
    if (!settings.lastMeals || typeof settings.lastMeals !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(settings.lastMeals, String(day))) return;
    settings.lastMeals[String(day)] = null;
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      render();
    } catch (e) { /* 해제 실패는 아래 토스트로만 알린다 */ }
  }

  async function saveMealClock(kind, hm) {
    var p = state.participant;
    if (!p) return;
    var day = viewDay();
    var norm = M.normHM(hm, '');
    if (!norm) { toast('시각을 확인해주세요', 'error'); return; }
    var mealSlot = kind === 'breakfast' ? 'breakfast' : 'dinner';
    var patch = {};
    patch[kind === 'breakfast' ? 'breakfastAt' : 'lastMealAt'] = norm;
    if (M.getPlan(p, day)[mealSlot] !== 'FAST') {
      patch.meals = {};
      patch.meals[mealSlot] = true;
    }
    await updateEntry(patch);
    if (kind === 'dinner') {
      /* 그 날의 마지막 식사 시각을 설정에도 남겨 다음 날 공복·단식 타이머가 그대로 쓴다 */
      var settings = Object.assign({}, p.settings || {});
      settings.lastMeals = Object.assign({}, (settings.lastMeals && typeof settings.lastMeals === 'object') ? settings.lastMeals : {});
      settings.lastMeals[String(day)] = norm;
      try {
        var updated = await store.updateParticipant(p.id, { settings: settings });
        applyParticipant(updated);
        render();
      } catch (e) {
        toast('저장하지 못했어요: ' + e.message, 'error');
        return;
      }
      toast(norm + ' 저녁 식사 시작으로 저장했어요 · 다음 날 공복 타이머에 반영돼요');
    } else {
      toast(norm + ' 아침 식사로 저장했어요');
    }
  }

  /* 단식일 24시간 타이머의 기준 시각(전날 마지막 식사)은 그 날짜에만 적용해 저장한다 */
  async function saveFastPrevMeal(value) {
    var p = state.participant;
    if (!p) return;
    var norm = M.normHM(value, '');
    if (!norm) { toast('시각을 확인해주세요', 'error'); return; }
    var day = viewDay();
    var settings = Object.assign({}, p.settings || {});
    settings.fastPrevMeal = Object.assign({}, (settings.fastPrevMeal && typeof settings.fastPrevMeal === 'object') ? settings.fastPrevMeal : {});
    settings.fastPrevMeal[String(day)] = norm;
    /* 전날 '단식 시작하기'로 시작한 날이면 그 시작 시각을 같이 고쳐야 화면과 계산이 맞는다 */
    if (M.fastStartOf(p, day)) {
      settings.fastStarts = Object.assign({}, (settings.fastStarts && typeof settings.fastStarts === 'object') ? settings.fastStarts : {});
      settings.fastStarts[String(day)] = norm;
    }
    settings.fastingPrevMealAt = norm;
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      render();
      tickTimers();
      toast('Day ' + day + ' 단식 기준 시각을 ' + norm + '으로 맞췄어요');
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* ---------- 단식일 전날 '단식 시작하기' ---------- */
  /* 누른 순간의 시각을 그 단식일의 시작 시각으로 저장한다 (settings.fastStarts[단식일]) */
  async function writeFastStart(day, hm) {
    var p = state.participant;
    if (!p || !day) return false;
    var norm = M.normHM(hm, '');
    if (!norm) { toast('시각을 확인해주세요', 'error'); return false; }
    var settings = Object.assign({}, p.settings || {});
    settings.fastStarts = Object.assign({}, (settings.fastStarts && typeof settings.fastStarts === 'object') ? settings.fastStarts : {});
    settings.fastStarts[String(day)] = norm;
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      render();
      tickTimers();
      return true;
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
      return false;
    }
  }

  async function startFastNow(dayAttr) {
    var p = state.participant;
    if (!p) return;
    var day = Number(dayAttr) || (viewDay() + 1);
    var hm = M.clockOf(new Date());
    if (!(await writeFastStart(day, hm))) return;
    var nextDate = M.dayDate(p.startDate, day);
    toast(hm + '부터 단식 시작! · ' + M.fmtShort(nextDate) + ' ' + hm + '까지 24시간이에요 ⏱️');
  }

  async function saveFastStart(dayAttr, value) {
    var day = Number(dayAttr) || (viewDay() + 1);
    var norm = M.normHM(value, '');
    if (!norm) { toast('시각을 확인해주세요', 'error'); return; }
    if (!(await writeFastStart(day, norm))) return;
    toast('Day ' + day + ' 단식 시작을 ' + norm + '으로 저장했어요');
  }

  async function cancelFastStart(dayAttr) {
    var p = state.participant;
    if (!p) return;
    var day = Number(dayAttr) || (viewDay() + 1);
    var settings = Object.assign({}, p.settings || {});
    if (!settings.fastStarts || typeof settings.fastStarts !== 'object') return;
    if (!Object.prototype.hasOwnProperty.call(settings.fastStarts, String(day))) return;
    settings.fastStarts = Object.assign({}, settings.fastStarts);
    delete settings.fastStarts[String(day)];
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      render();
      tickTimers();
      toast('Day ' + day + ' 단식 시작을 취소했어요 · 전날 기록 시각으로 계산해요');
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* 단식일이 아닌 날에 남은 '단식 시작' 시각을 정리한다 (단식일을 옮기거나 해제했을 때) */
  async function pruneFastStarts() {
    var p = state.participant;
    if (!p) return;
    var map = p.settings && p.settings.fastStarts;
    if (!map || typeof map !== 'object') return;
    var next = {};
    var changed = false;
    Object.keys(map).forEach(function (k) {
      var d = Number(k);
      if (d && M.isFastDay(M.getPlan(p, d))) next[k] = map[k];
      else changed = true;
    });
    if (!changed) return;
    var settings = Object.assign({}, p.settings || {});
    settings.fastStarts = next;
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
    } catch (e) { /* 정리는 실패해도 화면 흐름은 계속 */ }
  }

  /* ---------- 실시간 타이머 (1초마다) ---------- */
  function setHtmlIfChanged(el, html) {
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  function setWidth(id, pct) {
    var el = $(id);
    if (!el || !el.style) return;
    el.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  /* 게이지 위 캐릭터 위치도 함께 이동 */
  function setRunner(id, pct) {
    var el = $(id);
    if (!el || !el.style) return;
    var v = Math.max(3, Math.min(100, pct));
    el.style.left = v + '%';
    var goal = $(id + '-goal');
    if (goal && 'textContent' in goal) goal.textContent = pct >= 100 ? '🏆' : '🏁';
  }

  function paintFasting(f) {
    if (!f) return;
    var cap, val, pill, metaLeft, note;
    if (f.mealChecked) {
      cap = '아침 식사 시각을 기록했어요 · 공복 ' + f.hours + '시간 기준';
      val = '<span class="big-num">공복 ' + Views.esc(f.heldText) + ' 완료</span> <em>· ' + Views.esc(f.breakfastAt) + ' 아침 식사</em>';
      pill = f.heldDone ? '달성' : '기록 완료';
      metaLeft = '공복 ' + Views.esc(f.heldText) + ' 유지';
      note = f.heldDone
        ? f.hours + '시간 목표를 채웠어요. 다음 식사 전까지 공복이 이어져요.'
        : f.hours + '시간까지 ' + f.heldShortText + ' 모자랐어요. 다음엔 마지막 식사를 조금 더 일찍 마쳐봐요.';
    } else {
      cap = f.done ? '공복 ' + f.hours + '시간 달성' : '공복 ' + f.hours + '시간까지';
      val = f.done
        ? '<span class="big-num">' + f.hours + '시간 공복 달성!</span> 🎉'
        : '<span class="big-num">' + Views.esc(f.leftText) + '</span> <em>남았어요</em>';
      pill = f.done ? '달성' : '진행 중';
      metaLeft = '공복 ' + Views.esc(f.elapsedText) + ' 경과';
      note = (f.startToday ? '오늘 ' : '어제 ') + f.startClock + ' 마지막 식사 · ' + f.hours + '시간 공복까지';
    }
    setHtmlIfChanged($('t-fast-cap'), Views.esc(cap));
    setHtmlIfChanged($('t-fast-value'), val);
    setHtmlIfChanged($('t-fast-state'), Views.esc(pill));
    setHtmlIfChanged($('t-fast-elapsed'), metaLeft);
    setHtmlIfChanged($('t-fast-pct'), f.pct + '%');
    setHtmlIfChanged($('t-fast-note'), Views.esc(note));
    setWidth('t-fast-bar', f.pct);
    setRunner('t-fast-run', f.pct);
  }

  /* 단식일 24시간 타이머 1초 갱신 */
  function paintFasting24(s) {
    if (!s) return;
    var cap, val, pill, minLine, pct, elapsedText;
    if (s.mealChecked) {
      cap = '단식 종료 시각을 기록했어요 · ' + s.hours + '시간 창 기준';
      val = '<span class="big-num">단식 ' + Views.esc(s.heldText) + ' 완료</span> <em>· ' + Views.esc(s.fastEndClock) + ' 단식 종료</em>';
      pill = s.heldDone ? '달성' : (s.heldMinPassed ? '최소 기준 통과' : '단식 종료');
      minLine = s.heldDone
        ? s.minHours + '시간 최소 기준 통과 ✓ · ' + s.hours + '시간 채웠어요 🏆'
        : (s.heldMinPassed
          ? s.minHours + '시간 최소 기준 통과 ✓ · ' + s.hours + '시간까지 ' + Views.esc(s.heldFullShortText) + ' 남았어요'
          : s.minHours + '시간 최소 기준까지 ' + Views.esc(s.heldMinShortText) + ' 남았어요');
      pct = Math.max(0, Math.min(100, Math.round((s.heldMinutes / (s.hours * 60)) * 100)));
      elapsedText = s.heldText;
    } else {
      cap = M.fast24Caption(s);
      val = (s.done && s.isPast)
        ? '<span class="big-num">' + s.hours + '시간 창이 끝났어요</span>'
        : (s.done
          ? '<span class="big-num">' + s.hours + '시간 단식 달성!</span> 🏆'
          : (s.beforeStart
            ? '<span class="big-num">' + s.startClock + '</span> <em>부터 시작해요</em>'
            : '<span class="big-num">' + Views.esc(s.leftText) + '</span> <em>남았어요</em>'));
      pill = s.isPast ? '지난 단식일' : (s.done ? '달성' : (s.beforeStart ? '시작 전' : (s.minPassed ? s.minHours + '시간 통과' : '진행 중')));
      if (s.isPast) minLine = s.minHours + '시간 최소 기준 · ' + s.hours + '시간 창이 이미 지난 날이에요';
      else if (s.done) minLine = s.minHours + '시간 최소 기준 통과 ✓ · ' + s.hours + '시간 달성 🏆';
      else if (s.beforeStart) minLine = s.minHours + '시간 최소 기준 · 시작 후 ' + s.minHours + '시간이면 통과예요';
      else if (s.minPassed) minLine = s.minHours + '시간 최소 기준 통과 ✓ · ' + s.hours + '시간까지 ' + Views.esc(s.leftText) + ' 남았어요';
      else minLine = s.minHours + '시간 최소 기준까지 ' + Views.esc(s.minLeftText) + ' 남았어요';
      pct = s.pct;
      elapsedText = s.elapsedText;
    }
    setHtmlIfChanged($('t-fast-cap'), Views.esc(cap));
    setHtmlIfChanged($('t-fast-value'), val);
    setHtmlIfChanged($('t-fast-state'), Views.esc(pill));
    setHtmlIfChanged($('t-fast-elapsed'), '단식 ' + Views.esc(elapsedText) + (s.mealChecked ? ' 완료' : ' 경과'));
    setHtmlIfChanged($('t-fast-pct'), pct + '%');
    setHtmlIfChanged($('t-fast-min'), Views.esc(minLine));
    setHtmlIfChanged($('t-fast-note'), Views.esc(s.mealChecked
      ? '단식 종료 시각을 기록했어요. 여기서부터 다음 식사까지 공복이 이어져요.'
      : '2~4주차는 18~24시간 안에서 유연하게 봐요. 단식 중엔 물·허브티만, 영양제는 쉬어가요.'));
    setWidth('t-fast-bar', pct);
    setRunner('t-fast-run', pct);
  }

  function paintSleep(s) {
    if (!s) return;
    setHtmlIfChanged($('t-sleep-cap'), s.done ? '권장 취침 시각이 지났어요' : '잠자기까지');
    setHtmlIfChanged($('t-sleep-value'), s.done
      ? '<span class="big-num">지금이 취침 시각!</span>'
      : '<span class="big-num">' + Views.esc(s.leftText) + '</span> <em>남았어요</em>');
    setHtmlIfChanged($('t-sleep-meta'), '권장 취침 ' + s.bedClock);
    setHtmlIfChanged($('t-sleep-wake'), '기상 ' + s.wake);
    setHtmlIfChanged($('t-sleep-note'), Views.esc(s.done
      ? '권장 취침 ' + s.bedClock + '에서 ' + s.overText + ' 지났어요. 지금 자면 ' + s.hours + '시간을 못 채워요.'
      : s.hours + '시간 이상 자려면 ' + s.bedClock + '까지 잠들어야 해요'));
    setWidth('t-sleep-bar', s.pct);
    setRunner('t-sleep-run', s.pct);
  }

  function tickTimers(now) {
    if (!state.participant || state.route !== 'today') return;
    var nowD = now || new Date();
    var day = viewDay();
    var prefs = M.timerPrefs(state.participant);
    if (M.isFastDay(M.getPlan(state.participant, day))) {
      paintFasting24(M.fast24State(state.participant, day, nowD, Program.check.fast24Hours));
    } else {
      paintFasting(M.fastingDayState(state.participant, day, nowD, Program.check.fastingHours));
    }
    paintSleep(M.sleepState(prefs.wake, nowD, Program.check.sleepHours));
    paintDinner(M.dinnerDayState(state.participant, day, nowD, M.dinnerMode(state.participant, day)));
  }

  async function saveWeeklyMetric(wk, metric, raw) {
    var p = state.participant;
    var wm = M.weeklyMetrics(p, today());
    var day;
    if (Number(wk) === 0) {
      day = 1;
    } else {
      var row = wm.weeks[Number(wk) - 1];
      if (!row) return;
      day = row.targetDay;
    }
    var num = raw === '' ? null : Number(raw);
    if (num !== null && (isNaN(num) || num < 0 || num > 400)) { toast('숫자를 확인해주세요', 'error'); return; }
    var entry = M.getEntry(p, day) || { date: M.dayDate(p.startDate, day), meals: {}, supplements: {}, exercise: {} };
    var next = JSON.parse(JSON.stringify(entry));
    next[metric] = num;
    next.date = next.date || M.dayDate(p.startDate, day);
    next.updatedAt = new Date().toISOString();
    try {
      var updated = await store.putEntry(p.id, day, next);
      applyParticipant(updated);
      var post = M.isPostFastDay(p, day);
      toast(post ? '저장했어요 · 단식일 다음날이라 주차 집계에서 제외돼요' : 'Day ' + day + ' 인바디에 저장했어요');
      render();
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  function planDraftFrom(p, day) {
    return Object.assign({}, M.getPlan(p, day));
  }

  /* ---------- 단식일 바꾸기 (같은 주차 안에서 옮기거나 해제) ---------- */
  function firstFastDayOfWeek(p, week) {
    var list = M.weekFastDays(p, week);
    for (var i = 0; i < list.length; i++) if (list[i].fast) return list[i].day;
    return null;
  }

  function fastMoveData(week, fromDay) {
    var p = state.participant;
    var cur = M.currentDay(p, today()) || 1;
    var plan = M.fastPlanFor(week);
    return {
      week: week,
      fromDay: fromDay,
      days: M.weekFastDays(p, week).map(function (x) {
        return {
          day: x.day,
          date: x.date,
          fast: x.fast,
          isToday: x.day === cur,
          isFrom: !!fromDay && fromDay === x.day,
          conflict: M.fastConflict(p, x.day, plan, fromDay ? [fromDay] : [])
        };
      })
    };
  }

  function openFastMove(el) {
    var p = state.participant;
    if (!p) return;
    var dayAttr = el && el.getAttribute ? el.getAttribute('data-day') : null;
    var weekAttr = el && el.getAttribute ? el.getAttribute('data-week') : null;
    var day = dayAttr ? Number(dayAttr) : viewDay();
    var week = weekAttr ? Number(weekAttr) : Math.ceil(day / 7);
    if (!week || week < 1) week = Math.ceil(viewDay() / 7);
    if (week > 4) week = 4;
    if (week < 2) {
      toast('1주차는 14시간 공복만 하고 단식일이 없어요. 2주차부터 옮길 수 있어요.');
      return;
    }
    var fromDay = null;
    if (day && Math.ceil(day / 7) === week && M.isFastDay(M.getPlan(p, day))) fromDay = day;
    if (!fromDay) fromDay = firstFastDayOfWeek(p, week);
    openSheet({ type: 'fastMove', week: week, fromDay: fromDay });
  }

  async function applyFastMove(fromDay, toDay) {
    var p = state.participant;
    if (!p) return;
    var ops = [];
    if (fromDay && fromDay !== toDay) ops.push({ day: fromDay, meals: M.normalPlanForDay(fromDay) });
    if (toDay) ops.push({ day: toDay, meals: M.fastPlanFor(Math.ceil(toDay / 7)) });
    try {
      var updated = null;
      for (var i = 0; i < ops.length; i++) {
        var op = ops[i];
        var base = M.getPlan({ id: p.id, planOverrides: {} }, op.day);
        var same = Program.meals.every(function (m) { return base[m] === op.meals[m]; });
        updated = await store.setPlanOverride(p.id, op.day, same ? null : op.meals);
      }
      if (updated) applyParticipant(updated);
      closeSheet();
      state.day = toDay || fromDay;
      await pruneFastStarts();
      go('today');
      render();
      if (toDay) {
        toast(fromDay
          ? 'Day ' + fromDay + ' → Day ' + toDay + '로 단식일을 옮겼어요 · Day ' + toDay + '에 24시간 타이머가 떠요'
          : 'Day ' + toDay + '을 단식일로 지정했어요 · 24시간 타이머가 떠요');
      } else {
        toast('Day ' + fromDay + ' 단식일을 해제했어요 · 14시간 공복 타이머로 바뀌었어요');
      }
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* ---------- 튜토리얼: 시작 인바디 저장 · 시작하기 ---------- */
  function readTutorialForm(form) {
    if (!form || !form.elements || !form.elements.namedItem) return null;
    function val(name) {
      var el = form.elements.namedItem(name);
      /* 폼에 없는 항목은 undefined로 둔다 (저장된 주기 값을 빈 값으로 지우지 않도록) */
      if (!el || el.value === undefined || el.value === null) return undefined;
      return String(el.value).trim();
    }
    return {
      nickname: val('nickname'), startDate: val('startDate'), weight: val('weight'), muscle: val('muscle'), fat: val('fat'), visceral: val('visceral'),
      gender: val('gender'), cycleStart: val('cycleStart'), cycleLength: val('cycleLength'), periodDays: val('periodDays')
    };
  }

  function parseTutorial(raw) {
    if (!raw) return { ok: true, data: {} };
    var data = { metrics: {} };
    var err = '';
    if (raw.nickname !== undefined) data.nickname = raw.nickname.slice(0, 12);
    /* 시작일 — 비우면 기존 시작일을 그대로 쓴다. 과거·미래 모두 고를 수 있다 (미래면 시작 전(D-N)으로 보인다) */
    if (raw.startDate !== undefined && raw.startDate !== null && String(raw.startDate).trim() !== '') {
      var sdt = String(raw.startDate).trim();
      if (!M.isDateStr(sdt)) { if (!err) err = '시작일을 날짜로 넣어주세요'; }
      else data.startDate = sdt;
    }
    [['weight', '시작 체중'], ['muscle', '골격근량'], ['fat', '체지방량']].forEach(function (pair) {
      var k = pair[0], label = pair[1];
      var v = raw[k];
      if (v === '' || v === undefined) return;
      var num = Number(v);
      if (!isFinite(num) || num <= 0 || num > 400) { if (!err) err = label + '은 0~400 사이 숫자로 넣어주세요'; return; }
      data.metrics[k] = M.round1(num);
    });
    var vis = raw.visceral;
    if (vis !== '' && vis !== undefined) {
      var vnum = Number(vis);
      if (!isFinite(vnum) || vnum < 1 || vnum > 20) { if (!err) err = '내장지방 레벨은 1~20 사이 숫자로 넣어주세요'; }
      else data.metrics.visceral = Math.round(vnum);
    }

    /* 성별 · 생리주기 (여성일 때만 입력받는다. 남성이면 주기 값은 건드리지 않는다) */
    if (raw.gender === 'female' || raw.gender === 'male') data.gender = raw.gender;
    if (data.gender === 'female') {
      if (raw.cycleStart !== undefined) {
        var cs = raw.cycleStart === null ? '' : String(raw.cycleStart).trim();
        if (cs !== '' && !M.isDateStr(cs)) { if (!err) err = '최근 생리 시작일을 날짜로 넣어주세요'; }
        else data.cycleStart = cs;
      }
      var cl = raw.cycleLength;
      if (cl !== '' && cl !== undefined && cl !== null) {
        var cln = Number(cl);
        if (!isFinite(cln) || cln < 21 || cln > 45) { if (!err) err = '평균 생리 주기는 21~45일 사이로 넣어주세요'; }
        else data.cycleLength = Math.round(cln);
      }
      var pdd = raw.periodDays;
      if (pdd !== '' && pdd !== undefined && pdd !== null) {
        var pdn = Number(pdd);
        if (!isFinite(pdn) || pdn < 2 || pdn > 10) { if (!err) err = '평균 생리 기간은 2~10일 사이로 넣어주세요'; }
        else data.periodDays = Math.round(pdn);
      }
    }

    if (err) return { ok: false, error: err };
    return { ok: true, data: data };
  }

  async function saveTutorial(form, complete) {
    var p = state.participant;
    if (!p) return false;
    var parsed = parseTutorial(readTutorialForm(form));
    if (!parsed.ok) { toast(parsed.error, 'error'); return false; }
    var data = parsed.data;
    try {
      var updated = null;
      var patch = {};
      if (data.nickname !== undefined && data.nickname !== p.nickname) {
        patch.nickname = data.nickname;
        /* 이름 없이 시작한 내 기록은 닉네임을 이름으로도 써 둔다 (목록·CSV 표기용) */
        if (!p.name && data.nickname) patch.name = data.nickname;
      }
      if (data.startDate && data.startDate !== p.startDate) patch.startDate = data.startDate;
      if (Object.keys(patch).length) updated = await store.updateParticipant(p.id, patch);
      var metrics = data.metrics || {};
      if (Object.keys(metrics).length) {
        var baseP = updated || p;
        var base = M.getEntry(baseP, 1) || {};
        var next = JSON.parse(JSON.stringify(base));
        if (!next.date) next.date = M.dayDate(baseP.startDate, 1);
        if (!next.meals) next.meals = {};
        Object.keys(metrics).forEach(function (k) { next[k] = metrics[k]; });
        next.updatedAt = new Date().toISOString();
        updated = await store.putEntry(p.id, 1, next);
      }
      if (complete) {
        var cur = updated || state.participant;
        var settings = Object.assign({}, (cur && cur.settings) || {}, {
          tutorialDone: true,
          tutorialDoneAt: new Date().toISOString()
        });
        updated = await store.updateParticipant(p.id, { settings: settings });
      }
      /* 성별 · 생리주기는 '입력 저장'만 눌러도 저장한다 (남성이면 주기 값은 그대로 둔다) */
      var settingsPatch = {};
      if (data.gender) settingsPatch.gender = data.gender;
      if (data.gender === 'female') {
        if (data.cycleStart !== undefined) settingsPatch.cycleStart = data.cycleStart;
        if (data.cycleLength !== undefined) settingsPatch.cycleLength = data.cycleLength;
        if (data.periodDays !== undefined) settingsPatch.periodDays = data.periodDays;
      }
      if (Object.keys(settingsPatch).length) {
        var curS = Object.assign({}, ((updated || state.participant || {}).settings) || {}, settingsPatch);
        updated = await store.updateParticipant(p.id, { settings: curS });
      }
      if (updated) applyParticipant(updated);
      if (!complete) {
        render();
        toast('내 정보·생리주기를 저장했어요 · 오늘 화면에 바로 반영돼요');
        return true;
      }
      state.day = M.currentDay(state.participant, today()) || 1;
      go('today');
      render();
      toast(M.currentDay(state.participant, today()) > 0
        ? '입력 저장 완료! Day ' + M.currentDay(state.participant, today()) + '을 이어가요 🎉'
        : '입력 저장 완료! ' + M.fmtLong(M.dayDate(state.participant.startDate, 1)) + '부터 시작해요 🎉');
      return true;
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
      return false;
    }
  }

  /* 튜토리얼 성별 선택 — 화면을 다시 그리지 않고 입력란 표시만 바꿔 타이핑한 값을 지킨다 */
  function setTutorialGender(value) {
    var gender = value === 'male' ? 'male' : 'female';
    var doc = global.document;
    var hidden = doc.querySelector('input[data-tut="gender"]');
    if (hidden) hidden.value = gender;
    var group = doc.querySelector('#tut-gender');
    if (group && group.querySelectorAll) {
      Array.prototype.forEach.call(group.querySelectorAll('[data-act="tut-gender"]'), function (btn) {
        var on = btn.getAttribute('data-value') === gender;
        if (btn.classList) btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    var cycle = doc.querySelector('#tut-cycle');
    if (cycle) cycle.hidden = gender !== 'female';
    return gender;
  }

  function openPlanSheet() {
    var p = state.participant;
    var day = viewDay();
    var draft = planDraftFrom(p, day);
    openSheet({
      type: 'plan',
      day: day,
      draft: draft,
      conflict: M.riskConsecutiveFast(p, day, draft)
    });
  }

  async function savePlan(day, draft) {
    var p = state.participant;
    var base = M.getPlan({ id: p.id, planOverrides: {} }, day);
    var same = Program.meals.every(function (m) { return base[m] === draft[m]; });
    try {
      var updated = await store.setPlanOverride(p.id, day, same ? null : draft);
      applyParticipant(updated);
      closeSheet();
      await pruneFastStarts();
      toast(same ? '기본 식단으로 되돌렸어요' : 'Day ' + day + ' 식단을 저장했어요');
      render();
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
  }

  /* ---------------- CSV / 복사 ---------------- */
  function download(filename, text) {
    var blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8;' });
    var url = (global.URL || global.webkitURL).createObjectURL(blob);
    var a = global.document.createElement('a');
    a.href = url;
    a.download = filename;
    global.document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { (global.URL || global.webkitURL).revokeObjectURL(url); a.remove(); } catch (e) { /* 무시 */ }
    }, 800);
  }

  /* dataURL(이미지) 다운로드 — 캔버스로 그린 리포트 PNG */
  function downloadUrl(filename, url) {
    var a = global.document.createElement('a');
    a.href = url;
    a.download = filename;
    global.document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { a.remove(); } catch (e) { /* 무시 */ }
    }, 800);
  }

  /* 28일 최종 리포트 PNG 저장 — 순수 브라우저 Canvas (외부 CDN 없음) */
  function saveReportImage() {
    var p = state.participant;
    if (!p) return;
    var Rep = global.App.Report;
    var url = null;
    var data = null;
    try {
      data = reportData(state.sheet && state.sheet.round);
      url = Rep && Rep.toDataURL ? Rep.toDataURL(data.report) : null;
    } catch (e) { url = null; }
    if (!url) {
      toast('이 브라우저에서는 이미지 저장을 지원하지 않아요. 화면을 캡처해 주세요.', 'error');
      return;
    }
    var name = '마이옵티멀다이어트_' + (data && data.total > 1 ? M.roundLabel(data.round) + '_' : '') + '28일최종리포트_' + today() + '.png';
    downloadUrl(name, url);
    toast('리포트 이미지를 저장했어요 · ' + name);
  }

  function exportSummary() {
    download('마이옵티멀다이어트_참여자요약_' + today() + '.csv', M.summaryCsv(state.participants, today()));
    toast('전체 요약 CSV를 내려받았어요');
  }

  function exportDetail(id) {
    var p = participantById(id);
    if (!p) return;
    download('마이옵티멀다이어트_' + p.name + '_' + today() + '.csv', M.detailCsv(p, today()));
    toast(p.name + '님 기록 CSV를 내려받았어요');
  }

  function copyText(text) {
    var done = function () { toast('복사했어요: ' + text); };
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(done).catch(fallback);
      return;
    }
    fallback();
    function fallback() {
      try {
        var ta = global.document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        global.document.body.appendChild(ta);
        ta.select();
        global.document.execCommand('copy');
        ta.remove();
        done();
      } catch (e) {
        toast('복사하지 못했어요. 코드: ' + text, 'error');
      }
    }
  }

  /* ---------------- 로그인 ---------------- */
  async function startWith(participant, session, message) {
    state.session = session;
    state.participant = participant;
    state.day = null;
    closeSheet();
    await reloadAll();
    /* [학습] 튜토리얼을 끝내지 않았거나 새로 시작한 참여자는 튜토리얼 탭부터 */
    go(participant && !M.tutorialDone(participant) ? 'tutorial' : 'today');
    render();
    if (message) toast(message);
  }

  async function demoLogin() {
    /* '내 28일 기록 시작하기' — 데모 참여자(김유니)가 아니라 이 기기의 내 기록을 연다 */
    var p = null;
    try { p = await store.getPersonal(); } catch (e) { p = null; }
    if (!p) {
      p = await store.createParticipant({ name: '', nickname: '', startDate: today(), personal: true });
      state.participants = await store.listParticipants();
    }
    var session = Auth.signInDemo(p.id);
    await startWith(p, session, '내 28일 기록을 열었어요');
  }

  /* v15까지 '내 28일 기록 시작하기'는 데모 참여자(김유니)에 붙어 샘플 체크 기록이 섞였다.
   * v16부터는 그 세션을 '내 기록'으로 옮기고, 직접 넣은 인바디 수치만 이어받는다.
   * 데모 참여자(김유니)는 관리자·참여코드용으로 그대로 둔다. */
  async function migrateLegacyPersonal() {
    var s = state.session;
    if (!s || s.provider !== 'demo' || !s.participantId) return;
    var old = participantById(s.participantId);
    if (!old || old.personal) return;
    var demoCode = String((CFG.demo && CFG.demo.participantCode) || '');
    if (!demoCode || String(old.code || '') !== demoCode) return;
    if (await store.getPersonal()) return;
    var seedNick = (global.App.Seed && global.App.Seed.demoDefaults && global.App.Seed.demoDefaults.nickname) || '';
    var nick = old.nickname && old.nickname !== old.name && old.nickname !== seedNick ? old.nickname : '';
    var settings = Object.assign({}, old.settings || {});
    delete settings.fastStarts;
    delete settings.fastPrevMeal;
    delete settings.lastMeals;
    try {
      var created = await store.createParticipant({
        name: nick, nickname: nick, startDate: old.startDate || today(), personal: true, settings: settings
      });
      /* 인바디 수치만 이어받되, 아직 안 바꾼 샘플 수치는 가져오지 않는다 */
      var sample = (global.App.Seed && global.App.Seed.demoDefaults && global.App.Seed.demoDefaults.sample) || {};
      var latest = M.latestValues(old, Program.totalDays, ['weight', 'muscle', 'fat', 'visceral']);
      var carried = {};
      ['weight', 'muscle', 'fat', 'visceral'].forEach(function (k) {
        var lv = latest[k];
        if (!lv || typeof lv.value !== 'number') return;
        if (typeof sample[k] === 'number' && Math.abs(lv.value - sample[k]) < 0.001) return;
        carried[k] = lv.value;
      });
      if (Object.keys(carried).length) {
        var entry = { date: M.dayDate(created.startDate, 1), meals: {}, supplements: {}, exercise: {}, updatedAt: new Date().toISOString() };
        Object.keys(carried).forEach(function (k) { entry[k] = carried[k]; });
        created = await store.putEntry(created.id, 1, entry);
      }
      state.session = Auth.signInDemo(created.id);
      state.participants = await store.listParticipants();
      state.participant = created;
      toast('내 기록으로 정리했어요 · 샘플 체크는 지우고 내 인바디는 그대로 이어받았어요');
    } catch (e) { /* 정리에 실패해도 앱은 그대로 연다 */ }
  }

  /* 관리자 로그인: 코드가 맞을 때만 관리자 세션을 만든다 (원클릭 체험 버튼 없음) */
  async function adminLogin(code) {
    var expected = String(CFG.demo.adminCode || '');
    if (!expected || String(code || '').trim() !== expected) {
      toast('관리자 코드가 맞지 않아요', 'error');
      return;
    }
    var p = await store.findByCode(CFG.demo.participantCode);
    var session = Auth.signInAdmin(p ? p.id : null);
    await startWith(p || null, session, '관리자로 로그인했어요');
    state.adminTab = 'participants';
    go('admin');
    render();
  }

  async function codeLogin(name, code) {
    var p = await store.findByCode(code);
    if (!p) { toast('참여코드를 찾지 못했어요. 관리자에게 확인해주세요.', 'error'); return; }
    var session = Auth.signInCode(p);
    await startWith(p, session, p.name + '님, 반가워요!');
  }

  async function handleKakao() {
    var res;
    try {
      res = await Auth.signInWithKakao();
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
    if (res.error) { toast(res.error, 'error'); return; }
    if (res.demo) { openSheet({ type: 'kakao' }); return; }
    if (res.redirecting) { toast('카카오 로그인으로 이동해요...'); return; }
    if (res.session) {
      var s = res.session;
      var p = null;
      if (s.participantId) p = participantById(s.participantId);
      if (!p && s.email) {
        for (var i = 0; i < state.participants.length; i++) {
          if (state.participants[i].email === s.email) p = state.participants[i];
        }
      }
      if (p) {
        s.participantId = p.id;
        Auth.writeSession(s);
        await startWith(p, s, '카카오 로그인 완료');
      } else {
        toast('연결된 참여 기록이 없어요. 참여코드로 입장해주세요.', 'error');
      }
    }
  }

  async function signOut() {
    await Auth.signOut();
    state.session = null;
    state.participant = null;
    state.day = null;
    closeSheet();
    if (global.location.hash !== '#/today') global.location.hash = '#/today';
    render();
    toast('로그아웃했어요');
  }

  /* ---------------- 클릭 처리 ---------------- */
  async function onClick(e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');

    if (ADMIN_ACTS[act] && !isAdminSession()) {
      toast('관리자 로그인이 필요해요', 'error');
      return;
    }

    switch (act) {
      case 'close-sheet': closeSheet(); break;
      case 'kakao-login': await handleKakao(); break;
      case 'demo-login': await demoLogin(el.getAttribute('data-role')); break;
      case 'nav': {
        var navRoute = el.getAttribute('data-route');
        if (navRoute === 'today' && state.participant) {
          state.day = M.currentDay(state.participant, today()) || 1;
        }
        go(navRoute);
        break;
      }
      case 'open-profile': openSheet({ type: 'profile' }); break;
      case 'open-round': openRoundSheet(); break;
      case 'report-round': {
        var rn = Number(el.getAttribute('data-round'));
        if (!rn) return;
        state.reportRound = rn;
        if (state.sheet && state.sheet.type === 'report') state.sheet.round = rn;
        render();
        break;
      }
      case 'tut-start': {
        var off = Number(el.getAttribute('data-offset')) || 0;
        var input = global.document.getElementById('tut-start-date');
        if (input) {
          input.value = M.addDays(today(), off);
          updateStartPreview(input.value);
          var bts = global.document.querySelectorAll ? global.document.querySelectorAll('[data-act="tut-start"]') : [];
          Array.prototype.forEach.call(bts, function (b) {
            if (b.classList) b.classList.toggle('on', Number(b.getAttribute('data-offset')) === off);
          });
        }
        break;
      }
      case 'signout': await signOut(); break;
      case 'tutorial-start': await saveTutorial(global.document.getElementById('tutorial-form'), true); break;
      case 'tut-gender': setTutorialGender(el.getAttribute('data-value')); break;

      case 'prev-day':
        state.day = Math.max(1, viewDay() - 1);
        go('today');
        break;
      case 'next-day':
        state.day = Math.min(Program.totalDays, viewDay() + 1);
        go('today');
        break;
      case 'go-today':
        state.day = M.currentDay(state.participant, today()) || 1;
        go('today');
        break;

      case 'toggle-meal': {
        var m = el.getAttribute('data-meal');
        var entry = M.getEntry(state.participant, viewDay()) || {};
        var on = !!(entry.meals && entry.meals[m]);
        var patch = { meals: {} };
        patch.meals[m] = !on;
        await updateEntry(patch);
        break;
      }
      case 'toggle-supp': {
        var k = el.getAttribute('data-supp');
        var en = M.getEntry(state.participant, viewDay()) || {};
        var son = !!(en.supplements && en.supplements[k]);
        var sp = { supplements: {} };
        sp.supplements[k] = !son;
        await updateEntry(sp);
        break;
      }
      case 'toggle-routine': {
        var field = el.getAttribute('data-field');
        var ent = M.getEntry(state.participant, viewDay()) || {};
        var p2 = {};
        p2[field] = !ent[field];
        await updateEntry(p2);
        break;
      }
      case 'toggle-exercise': {
        var kind = el.getAttribute('data-kind');
        var e2 = M.getEntry(state.participant, viewDay()) || {};
        var ex = e2.exercise || {};
        var ep = { exercise: {} };
        ep.exercise[kind] = !ex[kind];
        await updateEntry(ep);
        break;
      }
      case 'toggle-quest': {
        var qk = el.getAttribute('data-quest');
        var qe = M.getEntry(state.participant, viewDay()) || {};
        var target = Program.check.waterTarget;
        if (qk === 'water') {
          var qcups = typeof qe.water === 'number' ? qe.water : 0;
          await updateEntry({ water: qcups >= target ? 0 : target });
          break;
        }
        if (qk === 'exercise') {
          var qex = qe.exercise || {};
          var qon = !(qex.weight || qex.cardio);
          await updateEntry({ exercise: { weight: qon, cardio: qon } });
          break;
        }
        if (qk === 'sleep') {
          await updateEntry({ sleep: !qe.sleep });
          break;
        }
        if (Program.meals.indexOf(qk) >= 0) {
          /* 아침 · 저녁은 공복 · 저녁 타이머 기록과도 같이 움직인다 */
          var done = !!(qe.meals && qe.meals[qk]);
          if (qk === 'breakfast' || qk === 'dinner') {
            await toggleMealByQuest(qk, !done);
            break;
          }
          var qpatch = { meals: {} };
          qpatch.meals[qk] = !done;
          await updateEntry(qpatch);
        }
        break;
      }
      case 'water-set': {
        var target = Number(el.getAttribute('data-n'));
        var e3 = M.getEntry(state.participant, viewDay()) || {};
        var cups = typeof e3.water === 'number' ? e3.water : 0;
        await updateEntry({ water: target === cups ? target - 1 : target });
        break;
      }
      case 'water-inc': {
        var e4 = M.getEntry(state.participant, viewDay()) || {};
        await updateEntry({ water: Math.min(Program.check.waterTarget, (e4.water || 0) + 1) });
        break;
      }
      case 'water-dec': {
        var e5 = M.getEntry(state.participant, viewDay()) || {};
        await updateEntry({ water: Math.max(0, (e5.water || 0) - 1) });
        break;
      }
      case 'check-breakfast': {
        await toggleMealClock('breakfast');
        break;
      }
      case 'check-dinner': {
        await toggleMealClock('dinner');
        break;
      }
      case 'fast-start-now': {
        await startFastNow(el.getAttribute('data-day'));
        break;
      }
      case 'fast-start-cancel': {
        await cancelFastStart(el.getAttribute('data-day'));
        break;
      }
      case 'dinner-mode': {
        var dm = el.getAttribute('data-value');
        if (dm !== 'shake' && dm !== 'meal') break;
        await saveSetting('dinnerMode', dm, dm === 'shake' ? '저녁식사 기준을 쉐이크(-2시간)로 바꿨어요' : '저녁식사 기준을 무탄·저탄(-4시간)으로 바꿨어요');
        break;
      }
      case 'save-memo': {
        var ta = global.document.querySelector('[data-field="memo"]');
        await updateEntry({ memo: ta ? ta.value : '' });
        toast('메모를 저장했어요');
        break;
      }

      case 'view-photo': {
        var pkey = el.getAttribute('data-key');
        var dayAttr = el.getAttribute('data-day');
        var pday = dayAttr ? Number(dayAttr) : viewDay();
        var subject = state.route === 'adminDetail' ? participantById(state.adminId) : state.participant;
        if (!subject) return;
        var shot = M.photoOf(M.getEntry(subject, pday), pkey);
        if (!shot) return;
        openSheet({
          type: 'photo',
          photo: shot,
          key: pkey,
          label: M.photoLabel[pkey] || '인증',
          day: pday,
          date: M.dayDate(subject.startDate, pday),
          canDelete: state.route === 'today'
        });
        break;
      }
      case 'photo-delete': {
        var ps = state.sheet;
        if (!ps || ps.type !== 'photo') return;
        var dKey = ps.key, dLabel = ps.label, dDay = ps.day;
        confirmAction('delete-photo', {
          title: dLabel + ' 인증사진을 지울까요?',
          message: '지운 사진은 되돌릴 수 없어요. 다시 올리면 새 시각으로 저장돼요.',
          confirmLabel: '삭제',
          tone: 'danger',
          icon: 'trash',
          onConfirm: async function () {
            var patch = { photos: {} };
            patch.photos[dKey] = null;
            await updateEntry(patch, dDay);
            toast('인증사진을 지웠어요');
          }
        });
        break;
      }

      case 'edit-plan': openPlanSheet(); break;
      case 'open-report': openSheet({ type: 'report' }); break;
      case 'save-report-image': saveReportImage(); break;
      case 'open-fast-move': openFastMove(el); break;
      case 'fast-move-to': {
        var ms = state.sheet;
        if (!ms || ms.type !== 'fastMove') return;
        var toDay = Number(el.getAttribute('data-day'));
        if (!toDay) return;
        var srcDay = ms.fromDay;
        var hit = M.fastConflict(state.participant, toDay, M.fastPlanFor(ms.week), srcDay ? [srcDay] : []);
        if (hit.length) {
          confirmAction('apply-fast-move', {
            title: '연속 단식이에요',
            message: 'Day ' + hit.join(', Day ') + '도 단식일이라 이틀 연속 단식이 됩니다. 프로그램은 연속 단식을 금지하고 있어요. 그래도 옮길까요?',
            confirmLabel: '그래도 옮기기',
            tone: 'warn',
            onConfirm: function () { return applyFastMove(srcDay, toDay); }
          });
          return;
        }
        await applyFastMove(srcDay, toDay);
        break;
      }
      case 'fast-clear': {
        var cs = state.sheet;
        if (!cs || cs.type !== 'fastMove') return;
        var clearDay = Number(el.getAttribute('data-day')) || cs.fromDay;
        if (!clearDay) return;
        confirmAction('clear-fast', {
          title: 'Day ' + clearDay + ' 단식일을 해제할까요?',
          message: '이 날은 일반 식단으로 돌아가고 14시간 공복 타이머로 바뀌어요.',
          confirmLabel: '해제',
          tone: 'warn',
          onConfirm: function () { return applyFastMove(clearDay, null); }
        });
        break;
      }
      case 'plan-fast': {
        var s = state.sheet;
        if (!s || s.type !== 'plan') return;
        var dInner = s.draft.dinner === 'FAST' ? 'ZERO' : s.draft.dinner;
        s.draft = { breakfast: 'FAST', lunch: 'FAST', snack: 'FAST', dinner: dInner };
        s.conflict = M.riskConsecutiveFast(state.participant, s.day, s.draft);
        renderSheet();
        break;
      }
      case 'plan-reset': {
        var ps = state.sheet;
        if (!ps || ps.type !== 'plan') return;
        try {
          var upd = await store.setPlanOverride(state.participant.id, ps.day, null);
          applyParticipant(upd);
          closeSheet();
          toast('기본 식단으로 되돌렸어요');
          render();
        } catch (err) { toast('저장하지 못했어요: ' + err.message, 'error'); }
        break;
      }
      case 'plan-save': {
        var s2 = state.sheet;
        if (!s2 || s2.type !== 'plan') return;
        var planDay = s2.day;
        var planDraft = JSON.parse(JSON.stringify(s2.draft));
        if (s2.conflict && s2.conflict.length) {
          confirmAction('apply-plan', {
            title: '연속 단식이에요',
            message: 'Day ' + s2.conflict.join(', Day ') + '도 단식일이라 이틀 연속 단식이 됩니다. 프로그램은 연속 단식을 금지하고 있어요. 그래도 저장할까요?',
            confirmLabel: '그래도 저장',
            tone: 'warn',
            onConfirm: function () { return savePlan(planDay, planDraft); }
          });
          return;
        }
        await savePlan(planDay, planDraft);
        break;
      }

      case 'board-week':
        state.boardWeek = el.getAttribute('data-value');
        render();
        break;
      case 'open-day':
        state.day = Number(el.getAttribute('data-day'));
        go('today');
        break;
      case 'promo-type':
        state.promoType = el.getAttribute('data-value');
        render();
        break;
      case 'promo-cat':
        state.promoCat = el.getAttribute('data-value');
        render();
        break;

      case 'admin-tab':
        state.adminTab = el.getAttribute('data-tab') === 'promos' ? 'promos' : 'participants';
        go(state.adminTab === 'promos' ? 'admin/promos' : 'admin');
        break;
      case 'admin-open':
        go('admin/' + el.getAttribute('data-id'));
        break;
      case 'admin-back':
        go('admin');
        break;
      case 'open-add':
        openSheet({ type: 'add' });
        break;
      case 'export-summary':
        exportSummary();
        break;
      case 'export-detail':
        exportDetail(el.getAttribute('data-id'));
        break;
      case 'copy-code':
        copyText(el.getAttribute('data-code'));
        break;
      case 'reset-demo':
        confirmAction('reset-demo', {
          title: '데모 데이터를 초기화할까요?',
          message: '지금까지 입력한 기록과 추천템이 모두 지워지고 처음 상태로 돌아가요.',
          confirmLabel: '초기화',
          tone: 'danger',
          icon: 'trash',
          onConfirm: async function () {
            await store.resetDemo({
              participants: global.App.Seed.build(today()),
              promos: global.App.Seed.promos(today())
            });
            await reloadAll();
            if (state.participant && state.session) state.participant = participantById(state.session.participantId);
            render();
            toast('데모 데이터를 초기화했어요');
          }
        });
        break;

      case 'promo-new':
        openSheet({ type: 'promo', promo: { active: true, featured: false, type: 'groupbuy', category: 'shake' }, isNew: true });
        break;
      case 'promo-edit': {
        var pid = el.getAttribute('data-id');
        var promo = null;
        for (var i = 0; i < state.promos.length; i++) if (state.promos[i].id === pid) promo = state.promos[i];
        if (!promo) return;
        openSheet({ type: 'promo', promo: promo, isNew: false });
        break;
      }
      case 'promo-toggle': {
        var pid2 = el.getAttribute('data-id');
        var pr = null;
        for (var j = 0; j < state.promos.length; j++) if (state.promos[j].id === pid2) pr = state.promos[j];
        if (!pr) return;
        try {
          var upd2 = await store.updatePromo(pid2, { active: !pr.active });
          state.promos = await store.listPromos();
          render();
          toast(upd2.active ? '노출을 켰어요' : '노출을 껐어요');
        } catch (err) { toast('변경하지 못했어요: ' + err.message, 'error'); }
        break;
      }
      case 'promo-delete': {
        var pid3 = el.getAttribute('data-id');
        if (!pid3) return;
        confirmAction('delete-promo:' + pid3, {
          title: '삭제할까요?',
          message: '삭제하면 참여자 화면에서도 바로 사라져요.',
          confirmLabel: '삭제',
          tone: 'danger',
          icon: 'trash',
          onConfirm: async function () {
            await store.deletePromo(pid3);
            state.promos = await store.listPromos();
            closeSheet();
            render();
            toast('삭제했어요');
          }
        });
        break;
      }
      case 'fb-delete': {
        var fid = el.getAttribute('data-fid');
        var targetId = state.adminId || state.participant.id;
        confirmAction('fb-delete:' + fid, {
          title: '피드백을 삭제할까요?',
          message: '삭제한 피드백은 되돌릴 수 없어요.',
          confirmLabel: '삭제',
          tone: 'danger',
          icon: 'trash',
          onConfirm: async function () {
            try {
              var upd3 = await store.deleteFeedback(targetId, fid);
              applyParticipant(upd3);
              render();
              toast('피드백을 삭제했어요');
            } catch (err) { toast('삭제하지 못했어요: ' + err.message, 'error'); }
          }
        });
        break;
      }
      case 'confirm-run':
        await runPending(el.getAttribute('data-key'));
        break;
      default:
        break;
    }
  }

  /* ---------------- 변경/입력 처리 ---------------- */
  /* 시작일 미리보기 문구를 화면에서 바로 갱신 */
  function updateStartPreview(value) {
    var el = global.document.getElementById('tut-start-preview');
    if (el) el.textContent = startPreviewText(value);
  }

  async function onChange(e) {
    var el = e.target;

    if (el.matches && el.matches('[data-photo]')) {
      await handlePhotoInput(el);
      return;
    }

    if (el.matches && el.matches('[data-tut="startDate"]')) {
      updateStartPreview(el.value);
      return;
    }

    if (el.matches && el.matches('[data-plan-meal]')) {
      var s = state.sheet;
      if (!s || s.type !== 'plan') return;
      s.draft[el.getAttribute('data-plan-meal')] = el.value;
      s.conflict = M.riskConsecutiveFast(state.participant, s.day, s.draft);
      renderSheet();
      return;
    }

    if (el.matches && el.matches('[data-wk]')) {
      await saveWeeklyMetric(el.getAttribute('data-wk'), el.getAttribute('data-metric'), el.value);
      return;
    }

    if (el.id === 'promo-type-sel') {
      syncPromoSheetFields(el.value);
      return;
    }

    if (!el.matches || !el.matches('[data-field]')) return;
    var field = el.getAttribute('data-field');

    if (field === 'weight' || field === 'muscle' || field === 'fat' || field === 'visceral') {
      await saveMetric(field, el.value);
      return;
    }
    if (field === 'lastMeal' || field === 'wake') {
      await saveTimerPref(field, el.value);
      return;
    }
    if (field === 'fastPrevMeal') {
      await saveFastPrevMeal(el.value);
      return;
    }
    if (field === 'fastStart') {
      await saveFastStart(el.getAttribute('data-day'), el.value);
      return;
    }
    if (field === 'questTime') {
      await saveQuestTime(el.getAttribute('data-quest'), el.value);
      return;
    }
    if (field === 'breakfastAt' || field === 'dinnerAt') {
      if (!el.value) {
        var off = {};
        off[field === 'breakfastAt' ? 'breakfastAt' : 'lastMealAt'] = null;
        await updateEntry(off);
        if (field === 'dinnerAt') await clearDayLastMeal(viewDay());
        return;
      }
      await saveMealClock(field === 'breakfastAt' ? 'breakfast' : 'dinner', el.value);
      return;
    }
    if (field === 'memo') {
      var cur = M.getEntry(state.participant, viewDay());
      if (!cur && !el.value) return;
      await updateEntry({ memo: el.value });
      return;
    }
    if (field === 'exerciseNote') {
      var curEx = M.getEntry(state.participant, viewDay());
      if (!curEx && !el.value) return;
      var noteNow = (curEx && curEx.exercise && curEx.exercise.note) || '';
      if (noteNow === el.value) return;
      await updateEntry({ exercise: { note: el.value } });
      return;
    }
    if (field === 'date') {
      var entry = M.getEntry(state.participant, viewDay());
      if (!entry) { toast('다른 기록을 먼저 입력하면 날짜가 함께 저장돼요'); return; }
      await updateEntry({ date: el.value });
    }
  }

  /* ---------------- 폼 처리 ---------------- */
  async function onSubmit(e) {
    var form = e.target;
    e.preventDefault();

    if (!isAdminSession() && (form.id === 'add-p-form' || form.id === 'promo-form' || form.id === 'feedback-form')) {
      toast('관리자 로그인이 필요해요', 'error');
      return;
    }

    if (form.id === 'code-form') {
      var name = form.elements.namedItem('name').value.trim();
      var code = form.elements.namedItem('code').value.trim();
      if (!code) { toast('참여코드를 입력해주세요', 'error'); return; }
      await codeLogin(name, code);
      return;
    }

    if (form.id === 'admin-form') {
      var adminCode = form.elements.namedItem('code').value.trim();
      if (!adminCode) { toast('관리자 코드를 입력해주세요', 'error'); return; }
      await adminLogin(adminCode);
      return;
    }

    if (form.id === 'add-p-form') {
      var nm = form.elements.namedItem('name').value.trim();
      var sd = form.elements.namedItem('startDate').value;
      var cd = form.elements.namedItem('code').value.trim();
      var nickEl = form.elements.namedItem('nickname');
      var nick = nickEl ? String(nickEl.value || '').trim() : '';
      if (!nm) { toast('이름을 입력해주세요', 'error'); return; }
      if (!sd) { toast('시작일을 선택해주세요', 'error'); return; }
      try {
        var created = await store.createParticipant({ name: nm, nickname: nick, startDate: sd, code: cd });
        state.participants = await store.listParticipants();
        closeSheet();
        render();
        toast(created.name + ' 참여자를 추가했어요 · 코드 ' + created.code);
      } catch (err) { toast(err.message, 'error'); }
      return;
    }

    if (form.id === 'tutorial-form') {
      await saveTutorial(form, false);
      return;
    }

    if (form.id === 'round-form') {
      await startNextRound(form);
      return;
    }

    if (form.id === 'profile-form') {
      var pn = form.elements.namedItem('nickname');
      var pnick = pn ? String(pn.value || '').trim().slice(0, 12) : '';
      var ptarget = participantById(form.getAttribute('data-id')) || state.participant;
      var nickPatch = { nickname: pnick };
      if (!ptarget.name && pnick) nickPatch.name = pnick;
      try {
        var pu = await store.updateParticipant(form.getAttribute('data-id') || state.participant.id, nickPatch);
        applyParticipant(pu);
        closeSheet();
        render();
        toast(pnick ? '닉네임을 ' + pnick + '으로 저장했어요' : '닉네임을 지웠어요');
      } catch (err) { toast('저장하지 못했어요: ' + err.message, 'error'); }
      return;
    }

    if (form.id === 'promo-form') {
      var f = form.elements;
      var payload = {
        type: f.namedItem('type').value,
        category: f.namedItem('category') ? f.namedItem('category').value : 'etc',
        startsAt: f.namedItem('startsAt') ? String(f.namedItem('startsAt').value || '') : '',
        endsAt: f.namedItem('endsAt') ? String(f.namedItem('endsAt').value || '') : '',
        title: f.namedItem('title').value.trim(),
        memo: f.namedItem('memo').value.trim(),
        benefit: f.namedItem('benefit').value.trim(),
        link: f.namedItem('link').value.trim(),
        imageUrl: f.namedItem('imageUrl').value.trim(),
        disclosure: f.namedItem('disclosure').checked,
        active: f.namedItem('active').checked
      };
      if (!payload.title) { toast('제품명을 입력해주세요', 'error'); return; }
      if (!M.isValidLink(payload.link)) { toast('링크는 http:// 또는 https://로 시작해야 해요', 'error'); return; }
      if (payload.imageUrl && !M.isValidLink(payload.imageUrl)) { toast('썸네일 주소를 확인해주세요', 'error'); return; }
      var isNew = form.getAttribute('data-new') === '1';
      var editId = form.getAttribute('data-id');
      try {
        if (isNew) {
          await store.createPromo(payload);
          toast('추천템을 등록했어요');
        } else {
          await store.updatePromo(editId, payload);
          toast('수정했어요');
        }
        state.promos = await store.listPromos();
        closeSheet();
        render();
      } catch (err) { toast('저장하지 못했어요: ' + err.message, 'error'); }
      return;
    }

    if (form.id === 'feedback-form') {
      var id = form.getAttribute('data-id');
      var dayVal = form.elements.namedItem('day').value;
      var text = form.elements.namedItem('text').value.trim();
      if (!text) { toast('피드백 내용을 입력해주세요', 'error'); return; }
      try {
        var upd = await store.addFeedback(id, { day: dayVal ? Number(dayVal) : null, text: text });
        applyParticipant(upd);
        form.elements.namedItem('text').value = '';
        render();
        toast('피드백을 남겼어요');
      } catch (err) { toast(err.message, 'error'); }
    }
  }

  /* ---------------- 시작 ---------------- */
  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.App.UI = {
    state: state,
    render: render,
    go: go,
    toast: toast,
    tick: tickTimers,
    store: store
  };
})(typeof window !== 'undefined' ? window : globalThis);
