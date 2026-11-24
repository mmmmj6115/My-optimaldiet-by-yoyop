/* 계산 · 날짜 · CSV 등 순수 로직 (DOM 접근 없음) */
(function (global) {
  'use strict';

  var Program = global.App.Program;
  var DAY_MS = 86400000;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDate(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(d.getTime())) return null;
    return d;
  }

  function fmtDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function addDays(dateStr, n) {
    var d = parseDate(dateStr);
    if (!d) return dateStr;
    d.setDate(d.getDate() + n);
    return fmtDate(d);
  }

  function diffDays(a, b) {
    var da = parseDate(a), db = parseDate(b);
    if (!da || !db) return 0;
    return Math.round((db.getTime() - da.getTime()) / DAY_MS);
  }

  var METRIC_KEYS = ['weight', 'muscle', 'fat', 'visceral'];
  var METRIC_LABEL = { weight: '몸무게', muscle: '골격근량', fat: '체지방량', visceral: '내장지방레벨' };

  /* '19:30' → 1170분 (형식이 다르면 null) */
  function hmToMinutes(v) {
    var m = String(v || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    var h = Number(m[1]), mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  function normHM(v, fallback) {
    var mins = hmToMinutes(v);
    if (mins === null) return fallback;
    return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60);
  }

  function clockOf(d) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* 197 → '3시간 17분' / 45 → '45분' / 0 → '0분' */
  function minutesText(totalMinutes) {
    var m = Math.max(0, Math.round(totalMinutes));
    var h = Math.floor(m / 60);
    var mi = m % 60;
    if (h <= 0) return mi + '분';
    if (mi === 0) return h + '시간';
    return h + '시간 ' + mi + '분';
  }

  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

  function fmtLong(dateStr) {
    var d = parseDate(dateStr);
    if (!d) return dateStr;
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WEEKDAYS[d.getDay()] + ')';
  }

  function fmtShort(dateStr) {
    var d = parseDate(dateStr);
    if (!d) return '';
    return (d.getMonth() + 1) + '.' + pad2(d.getDate());
  }

  function dayDate(startDate, dayNumber) {
    return addDays(startDate, dayNumber - 1);
  }

  function dayNumberFor(startDate, dateStr) {
    return diffDays(startDate, dateStr) + 1;
  }

  function currentDay(participant, today) {
    if (!participant) return 0;
    var n = dayNumberFor(participant.startDate, today || todayStr());
    if (n < 1) return 0;
    return n > Program.totalDays ? Program.totalDays : n;
  }

  /* 튜토리얼을 끝냈는지 — 끝내기 전엔 튜토리얼 탭이 먼저 열린다 */
  function tutorialDone(participant) {
    return !!(participant && participant.settings && participant.settings.tutorialDone);
  }

  function isFinished(participant, today) {
    return dayNumberFor(participant.startDate, today || todayStr()) > Program.totalDays;
  }

  function getEntry(participant, dayNumber) {
    if (!participant || !participant.entries) return null;
    return participant.entries[String(dayNumber)] || null;
  }

  function getPlan(participant, dayNumber) {
    var base = (Program.days[dayNumber - 1] || {}).meals || {};
    var plan = Object.assign({}, base);
    var ov = participant && participant.planOverrides ? participant.planOverrides[String(dayNumber)] : null;
    if (ov) {
      Program.meals.forEach(function (m) { if (ov[m]) plan[m] = ov[m]; });
    }
    return plan;
  }

  function isFastDay(plan) {
    return !!plan && plan.breakfast === 'FAST' && plan.lunch === 'FAST';
  }

  function fastingDays(participant) {
    var out = [];
    for (var d = 1; d <= Program.totalDays; d++) {
      if (isFastDay(getPlan(participant, d))) out.push(d);
    }
    return out;
  }

  function riskConsecutiveFast(participant, dayNumber, plan) {
    var prev = dayNumber > 1 ? getPlan(participant, dayNumber - 1) : null;
    var next = dayNumber < Program.totalDays ? getPlan(participant, dayNumber + 1) : null;
    var hits = [];
    if (isFastDay(plan) && prev && isFastDay(prev)) hits.push(dayNumber - 1);
    if (isFastDay(plan) && next && isFastDay(next)) hits.push(dayNumber + 1);
    return hits;
  }

  function round1(v) { return Math.round(v * 10) / 10; }

  /* 하루 달성률: 계획된 끼니(단식 제외) + 영양제 2 + 물(부분점수) + 공복 + 수면 + 운동 + 대변 */
  function scoreDay(plan, entry) {
    var items = [], earned = 0, total = 0;

    Program.meals.forEach(function (m) {
      if (plan[m] === 'FAST') return;
      var done = !!(entry && entry.meals && entry.meals[m]);
      total += 1;
      if (done) earned += 1;
      items.push({ key: 'meal.' + m, label: Program.mealLabel[m], done: done, weight: 1, kind: 'meal' });
    });

    // 단식일에는 영양제를 쉬어가므로 점수에서 제외
    if (!isFastDay(plan)) {
      [['morning', '아침 영양제'], ['evening', '저녁 영양제']].forEach(function (s) {
        var done = !!(entry && entry.supplements && entry.supplements[s[0]]);
        total += 1;
        if (done) earned += 1;
        items.push({ key: 'supp.' + s[0], label: s[1], done: done, weight: 1, kind: 'supp' });
      });
    }

    var cups = entry && typeof entry.water === 'number' ? entry.water : 0;
    var waterFraction = Math.min(cups / Program.check.waterTarget, 1);
    total += 1;
    earned += waterFraction;
    items.push({
      key: 'water', label: '물 ' + Program.check.waterTarget + '잔',
      done: waterFraction >= 1, partial: waterFraction, weight: 1, kind: 'water', cups: cups
    });

    var routine = [
      ['fasting14', '공복시간 ' + Program.check.fastingHours + '시간'],
      ['sleep', '수면 ' + Program.check.sleepHours + '시간 이상'],
      ['bowel', '대변']
    ];
    routine.forEach(function (r) {
      var done = !!(entry && entry[r[0]]);
      total += 1;
      if (done) earned += 1;
      items.push({ key: r[0], label: r[1], done: done, weight: 1, kind: 'routine' });
    });

    var ex = !!(entry && entry.exercise && (entry.exercise.weight || entry.exercise.cardio));
    total += 1;
    if (ex) earned += 1;
    items.push({ key: 'exercise', label: '운동', done: ex, weight: 1, kind: 'exercise' });

    var pct = total ? Math.round((earned / total) * 100) : 0;
    return { pct: pct, earned: round1(earned), total: total, items: items, waterCups: cups };
  }

  function hasEntry(participant, dayNumber) {
    var e = getEntry(participant, dayNumber);
    return !!(e && e.updatedAt);
  }

  /* 해당 날짜가 '단식일 다음날'인지 (이날 인바디는 주차 집계에서 제외) */
  function isPostFastDay(participant, dayNumber) {
    if (dayNumber <= 1) return false;
    return isFastDay(getPlan(participant, dayNumber - 1));
  }

  /* 하루 6개 항목 O/X: 식단 / 물 / 영양제 / 공복 / 수면 / 운동 */
  function dayItems(plan, entry) {
    var has = !!(entry && entry.updatedAt);
    var fasting = isFastDay(plan);
    var planned = Program.meals.filter(function (m) { return plan[m] !== 'FAST'; });
    var meals = (entry && entry.meals) || {};
    var checkedMeals = planned.filter(function (m) { return !!meals[m]; }).length;
    var mealDone = planned.length ? checkedMeals === planned.length : has;
    var water = entry && typeof entry.water === 'number' ? entry.water : 0;
    var supp = entry && entry.supplements ? !!(entry.supplements.morning && entry.supplements.evening) : false;
    var ex = entry && entry.exercise ? !!(entry.exercise.weight || entry.exercise.cardio) : false;
    var items = [
      { key: 'meals', label: '식단', short: '식', done: mealDone, detail: planned.length ? checkedMeals + '/' + planned.length : '' },
      { key: 'water', label: '물', short: '물', done: water >= Program.check.waterTarget, detail: water + '/' + Program.check.waterTarget },
      { key: 'supp', label: '영양제', short: '영', done: supp },
      { key: 'fasting', label: '공복', short: '공', done: !!(entry && entry.fasting14) },
      { key: 'sleep', label: '수면', short: '수', done: !!(entry && entry.sleep) },
      { key: 'exercise', label: '운동', short: '운', done: ex }
    ];
    items.forEach(function (it) {
      it.status = !has ? 'none' : (it.done ? 'done' : 'miss');
    });
    if (fasting) {
      items.forEach(function (it) { if (it.key === 'supp') it.status = 'na'; });
    }
    return items;
  }

  /* 셀 상태: done(100%) / partial(기록 있음) / miss(지난 날 미입력) / future */
  function dayStatus(day) {
    if (day.isFuture) return 'future';
    var has = !!(day.entry && day.entry.updatedAt);
    if (!has) return 'miss';
    return day.score.pct >= 100 ? 'done' : 'partial';
  }

  function checkedDays(participant) {
    var n = 0;
    for (var d = 1; d <= Program.totalDays; d++) if (hasEntry(participant, d)) n++;
    return n;
  }

  function overallRate(participant, today) {
    if (!participant) return 0;
    var elapsed = currentDay(participant, today);
    if (elapsed <= 0) return 0;
    var sum = 0;
    for (var d = 1; d <= elapsed; d++) {
      sum += scoreDay(getPlan(participant, d), getEntry(participant, d)).pct;
    }
    return Math.round(sum / elapsed);
  }

  function numericMetrics(participant) {
    var out = [];
    for (var d = 1; d <= Program.totalDays; d++) {
      var e = getEntry(participant, d);
      if (!e) continue;
      var has = false;
      METRIC_KEYS.forEach(function (k) {
        if (typeof e[k] === 'number' && !isNaN(e[k])) has = true;
      });
      if (!has) continue;
      out.push({
        day: d,
        date: e.date || dayDate(participant.startDate, d),
        weight: typeof e.weight === 'number' ? e.weight : null,
        muscle: typeof e.muscle === 'number' ? e.muscle : null,
        fat: typeof e.fat === 'number' ? e.fat : null,
        visceral: typeof e.visceral === 'number' ? e.visceral : null
      });
    }
    return out;
  }

  /* 보기 중인 Day까지 각 항목의 가장 최근 값 (히어로 신체 요약용) */
  function latestValues(participant, dayNumber, fields) {
    fields = fields || METRIC_KEYS;
    var out = {};
    fields.forEach(function (f) { out[f] = null; });
    var last = Math.max(1, Math.min(dayNumber || 1, Program.totalDays));
    for (var d = last; d >= 1; d--) {
      var e = getEntry(participant, d);
      if (!e) continue;
      fields.forEach(function (f) {
        if (out[f] === null && typeof e[f] === 'number' && !isNaN(e[f])) {
          out[f] = { value: e[f], day: d, date: e.date || dayDate(participant.startDate, d) };
        }
      });
      var full = fields.every(function (f) { return out[f] !== null; });
      if (full) break;
    }
    return out;
  }

  function lastMetricBefore(participant, dayNumber, field) {
    for (var d = dayNumber - 1; d >= 1; d--) {
      var e = getEntry(participant, d);
      if (e && typeof e[field] === 'number' && !isNaN(e[field])) {
        return { value: e[field], day: d };
      }
    }
    return null;
  }

  function metricChange(participant, field) {
    var series = numericMetrics(participant).filter(function (m) { return typeof m[field] === 'number'; });
    if (series.length < 2) return null;
    return {
      from: series[0][field],
      to: series[series.length - 1][field],
      delta: round1(series[series.length - 1][field] - series[0][field]),
      fromDate: series[0].date,
      toDate: series[series.length - 1].date
    };
  }

  function lastRecordDate(participant) {
    var series = numericMetrics(participant);
    if (!series.length) return null;
    return series[series.length - 1].date;
  }

  function boardDays(participant, today) {
    var cur = currentDay(participant, today);
    var days = [];
    for (var d = 1; d <= Program.totalDays; d++) {
      var plan = getPlan(participant, d);
      var entry = getEntry(participant, d);
      days.push({
        day: d,
        week: Math.ceil(d / 7),
        date: dayDate(participant.startDate, d),
        plan: plan,
        fast: isFastDay(plan),
        entry: entry,
        items: dayItems(plan, entry),
        score: scoreDay(plan, entry),
        isToday: d === cur,
        isFuture: d > cur
      });
    }
    return days;
  }

  /* ---------- 주차별 인바디 ---------- */
  function pickMetrics(m) {
    if (!m) return null;
    return { weight: m.weight, muscle: m.muscle, fat: m.fat, visceral: m.visceral, day: m.day, date: m.date };
  }

  function weeklyMetrics(participant, today) {
    var cur = currentDay(participant, today);
    var series = numericMetrics(participant);
    var start = null;
    for (var i = 0; i < series.length; i++) {
      if (series[i].day === 1) { start = series[i]; break; }
    }
    if (!start && series.length) start = series[0];

    var weeks = [];
    for (var w = 1; w <= 4; w++) {
      var sd = (w - 1) * 7 + 1;
      var ed = w * 7;
      var inWeek = series.filter(function (m) { return m.day >= sd && m.day <= ed && (!start || m.day !== start.day); });
      var selected = inWeek.length ? inWeek[inWeek.length - 1] : null;
      var excluded = selected ? isPostFastDay(participant, selected.day) : false;
      var editable = cur >= sd;
      var targetDay;
      if (selected) targetDay = selected.day;
      else if (cur >= ed) targetDay = ed;
      else if (cur >= sd) targetDay = cur;
      else targetDay = sd;
      weeks.push({
        week: w,
        label: w + '주차',
        startDay: sd,
        endDay: ed,
        value: pickMetrics(selected),
        excluded: excluded,
        editable: editable,
        targetDay: targetDay,
        targetDate: dayDate(participant.startDate, targetDay),
        recordedDay: selected ? selected.day : null
      });
    }

    var latest = null;
    for (var k = weeks.length - 1; k >= 0; k--) {
      if (weeks[k].value && !weeks[k].excluded) { latest = weeks[k].value; break; }
    }
    var latestAny = null;
    if (series.length) latestAny = series[series.length - 1];

    function delta(field) {
      if (!start || !latest) return null;
      if (typeof start[field] !== 'number' || typeof latest[field] !== 'number') return null;
      return round1(latest[field] - start[field]);
    }

    return {
      currentDay: cur,
      start: pickMetrics(start),
      weeks: weeks,
      latest: latest,
      latestAny: pickMetrics(latestAny),
      changes: {
        weight: delta('weight'), muscle: delta('muscle'),
        fat: delta('fat'), visceral: delta('visceral')
      },
      notice: '주 1회 인바디 체크를 권장해요 · 단식일 다음날 인바디는 제외해요'
    };
  }

  function summary(participant, today) {
    var cur = currentDay(participant, today);
    var day = cur || 1;
    var entry = getEntry(participant, day);
    var score = scoreDay(getPlan(participant, day), entry);
    var w = metricChange(participant, 'weight');
    var mu = metricChange(participant, 'muscle');
    var f = metricChange(participant, 'fat');
    var v = metricChange(participant, 'visceral');
    var series = numericMetrics(participant);
    function lastOf(key) {
      var list = series.filter(function (m) { return typeof m[key] === 'number'; });
      return list.length ? list[list.length - 1][key] : null;
    }
    return {
      id: participant.id,
      name: participant.name,
      nickname: participant.nickname || '',
      code: participant.code,
      startDate: participant.startDate,
      currentDay: cur,
      finished: isFinished(participant, today),
      rate: overallRate(participant, today),
      todayChecked: !!(cur && entry && entry.updatedAt),
      todayPct: cur ? score.pct : 0,
      weight: w,
      muscle: mu,
      fat: f,
      visceral: v,
      lastDate: lastRecordDate(participant),
      latestWeight: lastOf('weight'),
      latestFat: lastOf('fat'),
      latestMuscle: lastOf('muscle'),
      latestVisceral: lastOf('visceral')
    };
  }

  /* ---------- 타이머 (공복 · 수면) ---------- */
  /* 참여자 설정에서 타이머 시각을 읽고, 없으면 기본값 */
  function timerPrefs(participant) {
    var s = (participant && participant.settings) || {};
    return {
      lastMeal: normHM(s.lastMeal, Program.check.lastMeal),
      wake: normHM(s.wake, Program.check.wakeTime)
    };
  }

  /* 마지막 식사 시각 → 지금까지의 공복 상태. start는 '가장 최근의 그 시각' */
  function fastingState(lastMeal, now, hours) {
    now = now ? new Date(now.getTime ? now.getTime() : now) : new Date();
    var mins = hmToMinutes(lastMeal);
    if (mins === null) return null;
    var targetMin = (hours || Program.check.fastingHours) * 60;
    var start = new Date(now.getTime());
    start.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    if (start.getTime() > now.getTime()) start.setDate(start.getDate() - 1);
    var elapsedMin = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 60000));
    var leftMin = targetMin - elapsedMin;
    return {
      lastMeal: normHM(lastMeal, Program.check.lastMeal),
      hours: Math.round(targetMin / 60),
      start: start,
      startClock: clockOf(start),
      startToday: fmtDate(start) === fmtDate(now),
      targetMin: targetMin,
      elapsedMin: elapsedMin,
      leftMin: leftMin,
      done: leftMin <= 0,
      overMin: leftMin < 0 ? -leftMin : 0,
      pct: Math.max(0, Math.min(100, Math.round((elapsedMin / targetMin) * 100))),
      elapsedText: minutesText(elapsedMin),
      leftText: minutesText(Math.max(leftMin, 0)),
      overText: leftMin < 0 ? minutesText(-leftMin) : ''
    };
  }

  /* 내일 기상 목표 시각 → 권장 취침까지 남은 시간 (7시간 수면 확보 기준) */
  function sleepState(wake, now, hours) {
    now = now ? new Date(now.getTime ? now.getTime() : now) : new Date();
    var mins = hmToMinutes(wake);
    if (mins === null) return null;
    var need = hours || Program.check.sleepHours;
    var wakeAt = new Date(now.getTime());
    wakeAt.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    wakeAt.setDate(wakeAt.getDate() + 1); // '내일 기상 목표'
    var bed = new Date(wakeAt.getTime() - need * 3600000);
    var leftMin = Math.floor((bed.getTime() - now.getTime()) / 60000);
    return {
      wake: normHM(wake, Program.check.wakeTime),
      hours: need,
      wakeAt: wakeAt,
      bedAt: bed,
      bedClock: clockOf(bed),
      leftMin: leftMin,
      done: leftMin <= 0,
      pct: Math.max(0, Math.min(100, Math.round((leftMin / (24 * 60)) * 100))),
      leftText: minutesText(Math.max(leftMin, 0)),
      overText: leftMin < 0 ? minutesText(-leftMin) : ''
    };
  }

  /* ---------- 마지막 저녁식사 타이머 ---------- */
  var DINNER_MODES = {
    shake: { key: 'shake', offset: 2, label: '단백질쉐이크 저녁', short: '셰이크', tag: '-2h', emoji: '🥤' },
    meal: { key: 'meal', offset: 4, label: '무탄·저탄 일반식', short: '무탄·저탄', tag: '-4h', emoji: '🥗' }
  };

  /* 1주차(D1~7)는 셰이크, 2~4주차는 일반식이 기본값 */
  function dinnerDefaultMode(day) {
    var d = Number(day) || 1;
    if (Program.w1Plan && Program.w1Plan.days.indexOf(d) >= 0) return 'shake';
    if (Program.detox && Program.detox.days.indexOf(d) >= 0) return 'shake';
    return 'meal';
  }

  function dinnerMode(participant, day) {
    var s = (participant && participant.settings) || {};
    if (s.dinnerMode === 'shake' || s.dinnerMode === 'meal') return s.dinnerMode;
    return dinnerDefaultMode(day);
  }

  /* 취침 예정(bed) − 모드별 시간 안에 저녁 식사를 끝내는 카운트다운 */
  function dinnerState(wake, now, mode) {
    var m = DINNER_MODES[mode] ? mode : 'shake';
    var def = DINNER_MODES[m];
    var nowD = now ? new Date(now.getTime ? now.getTime() : now) : new Date();
    var s = sleepState(wake, nowD, Program.check.sleepHours);
    if (!s) return null;
    var deadline = new Date(s.bedAt.getTime() - def.offset * 3600000);
    var leftMin = Math.floor((deadline.getTime() - nowD.getTime()) / 60000);
    return {
      mode: m,
      emoji: def.emoji,
      label: def.label,
      short: def.short,
      tag: def.tag,
      offsetHours: def.offset,
      bedClock: s.bedClock,
      wake: s.wake,
      deadlineAt: deadline,
      deadlineClock: clockOf(deadline),
      leftMin: leftMin,
      done: leftMin <= 0,
      leftText: minutesText(Math.max(leftMin, 0)),
      overText: leftMin < 0 ? minutesText(-leftMin) : '',
      pct: Math.max(0, Math.min(100, Math.round((1 - leftMin / (24 * 60)) * 100)))
    };
  }

  /* ---------- 데일리 퀘스트 ---------- */
  var QUEST_DEFS = [
    { key: 'breakfast', meal: 'breakfast', label: '아침', icon: 'sun' },
    { key: 'lunch', meal: 'lunch', label: '점심', icon: 'bowl' },
    { key: 'snack', meal: 'snack', label: '오후간식', icon: 'apple' },
    { key: 'dinner', meal: 'dinner', label: '저녁', icon: 'moon' },
    { key: 'water', label: '물 마시기', icon: 'drop' },
    { key: 'exercise', label: '운동하기', icon: 'dumbbell' },
    { key: 'sleep', label: '수면', icon: 'bed' }
  ];

  function quests(plan, entry, day) {
    var e = entry || {};
    var d = Number(day);
    var detoxDay = !!(Program.detox && Program.detox.days.indexOf(d) >= 0);
    var list = QUEST_DEFS.map(function (q) {
      if (q.meal) {
        var t = Program.types[plan[q.meal]] || Program.types.SHAKE;
        var na = plan[q.meal] === 'FAST';
        var idx = Program.meals.indexOf(q.meal);
        var hint = null;
        [Program.w1Plan, Program.w2Plan, Program.w3Plan, Program.w4Plan].forEach(function (p) {
          if (!hint && p && p.days.indexOf(d) >= 0 && p.meals && p.meals[q.meal]) hint = p.meals[q.meal];
        });
        return {
          key: q.key,
          label: detoxDay && idx >= 0 ? Program.detox.mealLabels[idx] : q.label,
          icon: q.icon, tone: t.tone, na: na,
          sub: na ? '단식 · 물만'
            : (detoxDay ? Program.detox.mealSub : (hint && hint.sub ? hint.sub : t.short)),
          done: na ? true : !!(e.meals && e.meals[q.meal])
        };
      }
      if (q.key === 'water') {
        var cups = typeof e.water === 'number' ? e.water : 0;
        return {
          key: 'water', label: q.label, icon: q.icon, tone: 'water',
          sub: Program.check.waterTarget + '잔 · 2L',
          done: cups >= Program.check.waterTarget,
          cups: cups, target: Program.check.waterTarget
        };
      }
      if (q.key === 'exercise') {
        var ex = e.exercise || {};
        return {
          key: 'exercise', label: q.label, icon: q.icon, tone: 'move',
          sub: '웨이트·유산소',
          done: !!(ex.weight || ex.cardio),
          weight: !!ex.weight, cardio: !!ex.cardio
        };
      }
      return {
        key: 'sleep', label: q.label, icon: q.icon, tone: 'sleep',
        sub: Program.check.sleepHours + '시간 이상',
        done: !!e.sleep
      };
    });
    var done = list.filter(function (q) { return q.done; }).length;
    return { list: list, done: done, total: list.length, pct: Math.round((done / list.length) * 100) };
  }

  /* Day에 맞는 오늘의 명언 · 조언 (28개를 순환) */
  function quoteFor(day) {
    var list = Program.quotes || [];
    if (!list.length) return null;
    var n = Number(day) || 1;
    var i = ((n - 1) % list.length + list.length) % list.length;
    return { day: n, tag: list[i].tag, text: list[i].text };
  }

  /* ---------- 인증사진 ---------- */
  var PHOTO_KEYS = ['breakfast', 'lunch', 'snack', 'dinner', 'exercise'];
  var PHOTO_LABEL = { breakfast: '아침', lunch: '점심', snack: '오후간식', dinner: '저녁', exercise: '운동' };

  function photoOf(entry, key) {
    if (!entry || !entry.photos) return null;
    var p = entry.photos[key];
    return p && p.dataUrl ? p : null;
  }

  function photosOf(entry) {
    return PHOTO_KEYS.map(function (k) {
      return { key: k, label: PHOTO_LABEL[k], photo: photoOf(entry, k) };
    }).filter(function (x) { return !!x.photo; });
  }

  /* 관리자 상세용: 전체 기간의 인증사진 목록 */
  function photoDays(participant, today) {
    var out = [];
    var last = currentDay(participant, today);
    for (var d = 1; d <= Program.totalDays; d++) {
      var e = getEntry(participant, d);
      if (!e) continue;
      photosOf(e).forEach(function (x) {
        out.push({
          day: d,
          date: e.date || dayDate(participant.startDate, d),
          key: x.key,
          label: x.label,
          photo: x.photo,
          isFuture: d > last
        });
      });
    }
    return out.reverse();
  }

  function photoCount(entry) {
    return photosOf(entry).length;
  }

  /* ---------- CSV ---------- */
  function csvCell(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCsv(rows) {
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }
  function deltaText(v) {
    if (v === null || v === undefined) return '';
    return (v > 0 ? '+' : '') + round1(v);
  }
  function summaryCsv(participants, today) {
    var rows = [['참여자', '닉네임', '참여코드', '시작일', '현재Day', '28일달성률(%)', '오늘체크', '최근몸무게(kg)', '몸무게변화(kg)', '골격근량변화(kg)', '체지방량변화(kg)', '최근내장지방레벨', '내장지방변화', '최근기록일']];
    participants.forEach(function (p) {
      var s = summary(p, today);
      rows.push([
        s.name, p.nickname || '', s.code, s.startDate, s.currentDay, s.rate,
        s.todayChecked ? 'O' : 'X',
        s.latestWeight === null ? '' : s.latestWeight,
        s.weight ? deltaText(s.weight.delta) : '',
        s.muscle ? deltaText(s.muscle.delta) : '',
        s.fat ? deltaText(s.fat.delta) : '',
        s.latestVisceral === null ? '' : s.latestVisceral,
        s.visceral ? deltaText(s.visceral.delta) : '',
        s.lastDate || ''
      ]);
    });
    return toCsv(rows);
  }
  function detailCsv(participant, today) {
    var rows = [['참여자', 'Day', '날짜', '아침계획', '아침체크', '점심계획', '점심체크', '간식계획', '간식체크', '저녁계획', '저녁체크', '몸무게(kg)', '골격근량(kg)', '체지방량(kg)', '내장지방레벨', '인증사진(장)', '아침영양제', '저녁영양제', '물(잔)', '공복시간', '수면', '웨이트', '유산소', '생리', '대변', '달성률(%)', '메모']];
    var cur = currentDay(participant, today);
    boardDays(participant, today).forEach(function (d) {
      if (d.day > (cur || 1)) return;
      var e = d.entry || {};
      var meals = e.meals || {};
      var supp = e.supplements || {};
      var ex = e.exercise || {};
      rows.push([
        participant.name, d.day, (e.date || d.date),
        Program.types[d.plan.breakfast].label, d.plan.breakfast === 'FAST' ? '-' : (meals.breakfast ? 'O' : 'X'),
        Program.types[d.plan.lunch].label, d.plan.lunch === 'FAST' ? '-' : (meals.lunch ? 'O' : 'X'),
        Program.types[d.plan.snack].label, d.plan.snack === 'FAST' ? '-' : (meals.snack ? 'O' : 'X'),
        Program.types[d.plan.dinner].label, meals.dinner ? 'O' : 'X',
        typeof e.weight === 'number' ? e.weight : '',
        typeof e.muscle === 'number' ? e.muscle : '',
        typeof e.fat === 'number' ? e.fat : '',
        typeof e.visceral === 'number' ? e.visceral : '',
        photoCount(e),
        supp.morning ? 'O' : 'X', supp.evening ? 'O' : 'X',
        typeof e.water === 'number' ? e.water : 0,
        e.fasting14 ? 'O' : 'X', e.sleep ? 'O' : 'X',
        ex.weight ? 'O' : 'X', ex.cardio ? 'O' : 'X',
        e.menstruation ? 'O' : 'X', e.bowel ? 'O' : 'X',
        d.score.pct,
        e.memo || ''
      ]);
    });
    return toCsv(rows);
  }

  /* ---------- 공구/광고 ---------- */
  function promoType(promo) {
    return Program.promos.types[promo && promo.type] || Program.promos.types.ad;
  }
  function promoCategory(promo) {
    return Program.promos.categories[promo && promo.category] || Program.promos.categories.etc;
  }
  function activePromos(promos) {
    return (promos || []).filter(function (p) { return p && p.active; });
  }
  function featuredPromo(promos) {
    var list = activePromos(promos).filter(function (p) { return p.featured; });
    if (list.length) return list[0];
    var all = activePromos(promos);
    return all.length ? all[0] : null;
  }
  function isValidLink(url) {
    return /^https?:\/\/[^\s]+$/i.test(String(url || '').trim());
  }

  global.App.Model = {
    pad2: pad2,
    todayStr: todayStr,
    parseDate: parseDate,
    addDays: addDays,
    diffDays: diffDays,
    fmtLong: fmtLong,
    fmtShort: fmtShort,
    dayDate: dayDate,
    dayNumberFor: dayNumberFor,
    currentDay: currentDay,
    tutorialDone: tutorialDone,
    isFinished: isFinished,
    getEntry: getEntry,
    getPlan: getPlan,
    isFastDay: isFastDay,
    fastingDays: fastingDays,
    isPostFastDay: isPostFastDay,
    dayItems: dayItems,
    dayStatus: dayStatus,
    weeklyMetrics: weeklyMetrics,
    riskConsecutiveFast: riskConsecutiveFast,
    scoreDay: scoreDay,
    hasEntry: hasEntry,
    checkedDays: checkedDays,
    overallRate: overallRate,
    numericMetrics: numericMetrics,
    latestValues: latestValues,
    lastMetricBefore: lastMetricBefore,
    metricChange: metricChange,
    boardDays: boardDays,
    summary: summary,
    round1: round1,
    metricLabel: METRIC_LABEL,
    metricKeys: METRIC_KEYS,
    hmToMinutes: hmToMinutes,
    normHM: normHM,
    minutesText: minutesText,
    timerPrefs: timerPrefs,
    fastingState: fastingState,
    sleepState: sleepState,
    dinnerState: dinnerState,
    dinnerMode: dinnerMode,
    dinnerDefaultMode: dinnerDefaultMode,
    dinnerModes: DINNER_MODES,
    quests: quests,
    quoteFor: quoteFor,
    photoKeys: PHOTO_KEYS,
    photoLabel: PHOTO_LABEL,
    photoOf: photoOf,
    photosOf: photosOf,
    photoDays: photoDays,
    photoCount: photoCount,
    deltaText: deltaText,
    toCsv: toCsv,
    summaryCsv: summaryCsv,
    detailCsv: detailCsv,
    promoType: promoType,
    promoCategory: promoCategory,
    activePromos: activePromos,
    featuredPromo: featuredPromo,
    isValidLink: isValidLink
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.App.Model; }
})(typeof window !== 'undefined' ? window : globalThis);
