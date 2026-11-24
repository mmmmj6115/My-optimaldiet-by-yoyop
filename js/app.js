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
    boardTab: 'check',
    foldOpen: false,
    guideWeek: 1,
    promoType: 'all',
    promoCat: 'all',
    adminTab: 'participants',
    adminId: null,
    sheet: null,
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
    if (h === 'board') { state.route = 'board'; state.boardTab = 'check'; return; }
    if (h === 'body') { state.route = 'board'; state.boardTab = 'inbody'; return; }
    if (h === 'promos') { state.route = 'promos'; return; }
    if (h === 'guide') { state.route = 'guide'; return; }
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
    parseRoute();
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
      if (state.route === 'board') {
        html = Views.board(boardData());
      } else if (state.route === 'promos') {
        html = Views.promos(promosData());
      } else if (state.route === 'guide') {
        html = Views.guide(guideData());
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

    var key = state.route + '|' + state.adminTab + '|' + state.adminId + '|' + state.boardTab + '|' + state.guideWeek + '|' + state.promoType + '|' + state.promoCat;
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
    return {
      participant: p,
      nickname: p.nickname || p.name,
      day: day,
      week: Math.ceil(day / 7),
      date: M.dayDate(p.startDate, day),
      isToday: day === cur,
      plan: plan,
      entry: entry,
      score: score,
      overall: M.overallRate(p, today()),
      checkedDays: M.checkedDays(p),
      prevMetrics: prev,
      deltas: deltas,
      body: M.latestValues(p, day, ['weight', 'fat', 'visceral']),
      prefs: prefs,
      fasting: M.fastingState(prefs.lastMeal, now, Program.check.fastingHours),
      fasting24: M.fastingState(prefs.lastMeal, now, Program.check.fast24Hours),
      sleep: M.sleepState(prefs.wake, now, Program.check.sleepHours),
      dinner: M.dinnerState(prefs.wake, now, M.dinnerMode(p, day)),
      quote: M.quoteFor(day),
      fast: M.isFastDay(plan),
      photos: (entry && entry.photos) || {},
      foldOpen: state.foldOpen,
      quests: M.quests(plan, entry, day),
      promo: M.featuredPromo(activePromos()),
      feedback: (p.feedback || []).slice(-3)
    };
  }

  function boardData() {
    var p = state.participant;
    return {
      participant: p,
      days: M.boardDays(p, today()),
      week: state.boardWeek,
      tab: state.boardTab,
      currentDay: M.currentDay(p, today()),
      overall: M.overallRate(p, today()),
      weekly: M.weeklyMetrics(p, today())
    };
  }

  function guideData() {
    var p = state.participant;
    var lv = p ? M.latestValues(p, Program.totalDays, ['weight']).weight : null;
    return { week: state.guideWeek, weight: lv ? lv.value : null };
  }

  function promosData() {
    return {
      promos: activePromos(),
      type: state.promoType,
      category: state.promoCat
    };
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
    } else if (s.type === 'promo') {
      html = Views.promoSheet({ promo: s.promo, isNew: s.isNew });
    } else if (s.type === 'add') {
      html = Views.addParticipantSheet();
    } else if (s.type === 'profile') {
      html = Views.profileSheet({
        participant: state.participant,
        currentDay: M.currentDay(state.participant, today()),
        rate: M.overallRate(state.participant, today()),
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
      var patch = { photos: {} };
      patch.photos[key] = shot;
      await updateEntry(patch);
      toast(label + ' 인증사진 저장 완료 · ' + Math.max(1, Math.round((shot.bytes || 0) / 1024)) + 'KB');
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
    setHtmlIfChanged($('t-dinner-cap'), t.done ? '마감 시각이 지났어요' : '저녁 식사는 ' + t.deadlineClock + '까지');
    setHtmlIfChanged($('t-dinner-value'), t.done
      ? '<span class="big-num">마감 ' + Views.esc(t.overText) + ' 지났어요</span>'
      : '<span class="big-num">' + Views.esc(t.leftText) + '</span> <em>남았어요</em>');
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
    try {
      var updated = await store.updateParticipant(p.id, { settings: settings });
      applyParticipant(updated);
      tickTimers();
      toast(key === 'lastMeal' ? '마지막 식사 시각을 ' + norm + '으로 저장했어요' : '기상 목표를 ' + norm + '으로 저장했어요');
    } catch (e) {
      toast('저장하지 못했어요: ' + e.message, 'error');
    }
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
    var v = Math.max(3, Math.min(97, pct));
    el.style.left = v + '%';
    var goal = $(id + '-goal');
    if (goal && 'textContent' in goal) goal.textContent = pct >= 100 ? '🏆' : '🏁';
  }

  function paintFasting(f, f24) {
    if (!f) return;
    setHtmlIfChanged($('t-fast-cap'), f.done ? '공복 ' + f.hours + '시간 달성' : '공복 ' + f.hours + '시간까지');
    setHtmlIfChanged($('t-fast-value'), f.done
      ? '<span class="big-num">' + f.hours + '시간 공복 달성!</span> 🎉'
      : '<span class="big-num">' + Views.esc(f.leftText) + '</span> <em>남았어요</em>');
    setHtmlIfChanged($('t-fast-state'), f.done ? '달성' : '진행 중');
    setHtmlIfChanged($('t-fast-elapsed'), '공복 ' + Views.esc(f.elapsedText) + ' 경과');
    setHtmlIfChanged($('t-fast-pct'), f.pct + '%');
    setHtmlIfChanged($('t-fast-note'), Views.esc((f.startToday ? '오늘 ' : '어제 ') + f.startClock + ' 마지막 식사 · ' + f.hours + '시간 공복까지'));
    setWidth('t-fast-bar', f.pct);
    setRunner('t-fast-run', f.pct);
    if (f24 && $('t-fast-24')) {
      setHtmlIfChanged($('t-fast-24'), '24시간 단식 기준 ' + (f24.done ? '24시간 달성 · 물·허브티만 🎉' : Views.esc(f24.leftText) + ' 남았어요'));
    }
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
    var prefs = M.timerPrefs(state.participant);
    paintFasting(
      M.fastingState(prefs.lastMeal, now, Program.check.fastingHours),
      M.fastingState(prefs.lastMeal, now, Program.check.fast24Hours)
    );
    paintSleep(M.sleepState(prefs.wake, now, Program.check.sleepHours));
    paintDinner(M.dinnerState(prefs.wake, now, M.dinnerMode(state.participant, viewDay())));
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
    go('today');
    render();
    if (message) toast(message);
  }

  async function demoLogin() {
    var p = await store.findByCode(CFG.demo.participantCode);
    if (!p) {
      toast('데모 참여자를 찾지 못했어요. 데모 데이터를 초기화해주세요.', 'error');
      return;
    }
    var session = Auth.signInDemo(p.id);
    await startWith(p, session, p.name + '님으로 시작했어요');
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
      case 'signout': await signOut(); break;

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
          var qm = qe.meals || {};
          var qpatch = { meals: {} };
          qpatch.meals[qk] = !qm[qk];
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
      case 'dinner-mode': {
        var dm = el.getAttribute('data-value');
        if (dm !== 'shake' && dm !== 'meal') break;
        await saveSetting('dinnerMode', dm, dm === 'shake' ? '저녁식사 기준을 셰이크(-2시간)로 바꿨어요' : '저녁식사 기준을 무탄·저탄(-4시간)으로 바꿨어요');
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

      case 'board-tab':
        state.boardTab = el.getAttribute('data-tab') === 'inbody' ? 'inbody' : 'check';
        go(state.boardTab === 'inbody' ? 'body' : 'board');
        break;
      case 'board-week':
        state.boardWeek = el.getAttribute('data-value');
        state.boardTab = 'check';
        render();
        break;
      case 'open-day':
        state.day = Number(el.getAttribute('data-day'));
        go('today');
        break;
      case 'guide-week':
        state.guideWeek = Number(el.getAttribute('data-value')) || 1;
        render();
        break;
      case 'guide-week-here':
        state.guideWeek = Number(el.getAttribute('data-week')) || 1;
        go('guide');
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
          message: '지금까지 입력한 기록과 공구·광고가 모두 지워지고 처음 상태로 돌아가요.',
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
  async function onChange(e) {
    var el = e.target;

    if (el.matches && el.matches('[data-photo]')) {
      await handlePhotoInput(el);
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
    if (field === 'memo') {
      var cur = M.getEntry(state.participant, viewDay());
      if (!cur && !el.value) return;
      await updateEntry({ memo: el.value });
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

    if (form.id === 'profile-form') {
      var pn = form.elements.namedItem('nickname');
      var pnick = pn ? String(pn.value || '').trim().slice(0, 12) : '';
      try {
        var pu = await store.updateParticipant(form.getAttribute('data-id') || state.participant.id, { nickname: pnick });
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
        category: f.namedItem('category').value,
        title: f.namedItem('title').value.trim(),
        memo: f.namedItem('memo').value.trim(),
        benefit: f.namedItem('benefit').value.trim(),
        link: f.namedItem('link').value.trim(),
        imageUrl: f.namedItem('imageUrl').value.trim(),
        disclosure: f.namedItem('disclosure').checked,
        active: f.namedItem('active').checked,
        featured: f.namedItem('featured').checked
      };
      if (!payload.title) { toast('제품명을 입력해주세요', 'error'); return; }
      if (!M.isValidLink(payload.link)) { toast('링크는 http:// 또는 https://로 시작해야 해요', 'error'); return; }
      if (payload.imageUrl && !M.isValidLink(payload.imageUrl)) { toast('썸네일 주소를 확인해주세요', 'error'); return; }
      var isNew = form.getAttribute('data-new') === '1';
      var editId = form.getAttribute('data-id');
      try {
        if (isNew) {
          await store.createPromo(payload);
          toast('공구·광고를 등록했어요');
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
