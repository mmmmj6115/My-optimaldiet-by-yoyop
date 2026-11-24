/* 데모용 시드 데이터 (localStorage에 처음 한 번만 들어감) */
(function (global) {
  'use strict';

  var Program = global.App.Program;
  var M = global.App.Model;

  function isoAt(dateStr, hhmm) {
    return dateStr + 'T' + (hhmm || '08:40') + ':00+09:00';
  }

  function mkEntry(p, day, o) {
    o = o || {};
    var plan = M.getPlan(p, day);
    var e = {
      date: o.date || M.dayDate(p.startDate, day),
      weight: o.weight,
      muscle: o.muscle,
      fat: o.fat,
      visceral: o.visceral,
      meals: {},
      supplements: { morning: o.sm !== false, evening: o.se !== false },
      water: typeof o.water === 'number' ? o.water : 0,
      fasting14: !!o.f14,
      sleep: !!o.sleep,
      exercise: { weight: !!o.wt, cardio: !!o.cd },
      menstruation: !!o.men,
      bowel: !!o.bowel,
      memo: o.memo || '',
      updatedAt: isoAt(o.date || M.dayDate(p.startDate, day))
    };
    Program.meals.forEach(function (m) {
      if (plan[m] === 'FAST') return;
      e.meals[m] = !(o.miss && o.miss.indexOf(m) >= 0);
    });
    return e;
  }

  function participant(id, name, code, startDate, nickname) {
    return {
      id: id,
      name: name,
      nickname: nickname || '',
      code: code,
      startDate: startDate,
      createdAt: isoAt(startDate, '07:30'),
      settings: { lastMeal: '19:30', wake: '07:00' },
      planOverrides: {},
      entries: {},
      feedback: []
    };
  }

  function build(today) {
    var t = today || M.todayStr();

    /* 1) 박민정 — 오늘 Day 9, 1주차까지 성실히 기록, 오늘은 아직 미체크 */
    var p1 = participant('p1', '박민정', '1234', M.addDays(t, -8), '민정');
    var p1Days = [
      { weight: 68.4, muscle: 23.1, fat: 27.5, visceral: 9, water: 6, f14: true, sleep: true, cd: true, bowel: true, se: false, miss: ['snack'], memo: '첫날! 쉐이크 네 번, 생각보다 배부르네요.' },
      { weight: 68.0, muscle: 23.0, fat: 27.2, visceral: 9, water: 8, f14: true, sleep: true, wt: true, bowel: true },
      { weight: 67.6, muscle: 22.9, fat: 26.8, visceral: 9, water: 5, cd: true, bowel: true, miss: ['lunch'], se: false, memo: '점심 약속이 있어서 쉐이크를 못 챙겼어요.' },
      { weight: 67.1, muscle: 22.9, fat: 26.5, visceral: 8, water: 8, f14: true, sleep: true, wt: true, cd: true, bowel: true },
      { weight: 66.8, muscle: 22.8, fat: 26.2, visceral: 8, water: 7, f14: true, wt: true, miss: ['dinner'] },
      { weight: 66.4, muscle: 22.8, fat: 26.0, visceral: 8, water: 8, f14: true, sleep: true, cd: true, bowel: true },
      { weight: 66.1, muscle: 22.7, fat: 25.8, visceral: 8, water: 8, f14: true, sleep: true, wt: true, bowel: true, memo: '허리 바지가 좀 헐렁해졌어요!' },
      { weight: 65.9, muscle: 22.8, fat: 25.6, visceral: 7, water: 6, f14: true, sleep: true, cd: true, bowel: true, miss: ['snack'], memo: '주말 가족 외식 — 샐러드로 먹었어요.' }
    ];
    p1Days.forEach(function (o, i) { p1.entries[String(i + 1)] = mkEntry(p1, i + 1, o); });
    p1.feedback.push({
      id: 'f1',
      day: 8,
      text: '1주차 고생 많았어요! 물 8잔은 잘 지키고 있네요. 2주차 단식일(Day 10)이 일정과 겹치면 하루 앞이나 뒤로 옮겨도 됩니다. 연속 단식만 피해주세요.',
      createdAt: isoAt(M.dayDate(p1.startDate, 8), '21:10')
    });

    /* 2) 김서연 — 오늘 Day 16, 꾸준히 기록 중 */
    var p2 = participant('p2', '김서연', '2751', M.addDays(t, -15), '서연');
    var w2 = 61.2, m2 = 21.4, f2 = 24.1, v2 = 8;
    for (var d = 1; d <= 16; d++) {
      w2 = M.round1(w2 - 0.18);
      m2 = M.round1(m2 - 0.01);
      f2 = M.round1(f2 - 0.11);
      if (d === 6 || d === 13) v2 = v2 - 1;
      p2.entries[String(d)] = mkEntry(p2, d, {
        weight: w2, muscle: m2, fat: f2, visceral: v2,
        water: d % 4 === 0 ? 6 : 8,
        f14: d % 6 !== 0,
        sleep: true,
        wt: d % 2 === 1,
        cd: d % 3 === 0,
        bowel: d % 5 !== 0,
        sm: d % 7 !== 0,
        se: d % 9 !== 0,
        miss: d % 5 === 0 ? ['snack'] : null,
        memo: d === 10 ? '24시간 단식 첫날, 오후가 힘들었지만 해냈어요.' : ''
      });
    }

    /* 3) 이지은 — 어제 시작, 오늘 Day 2 */
    var p3 = participant('p3', '이지은', '4813', M.addDays(t, -1), '지은');
    p3.entries['1'] = mkEntry(p3, 1, { weight: 57.8, muscle: 20.6, fat: 23.4, visceral: 6, water: 6, f14: true, sleep: false, cd: true, bowel: true, se: false, memo: '시작! 내일은 물 더 챙기기.' });

    /* 4) 최하늘 — Day 9인데 기록이 뜸함 */
    var p4 = participant('p4', '최하늘', '6302', M.addDays(t, -8), '하늘');
    p4.entries['1'] = mkEntry(p4, 1, { weight: 72.0, muscle: 24.0, fat: 30.2, visceral: 11, water: 4, sleep: false, wt: false, cd: false, bowel: false, miss: ['lunch', 'snack'], memo: '시작해봅니다.' });
    p4.entries['2'] = mkEntry(p4, 2, { weight: 71.8, muscle: 24.0, fat: 30.0, visceral: 11, water: 5, f14: false, sleep: false, wt: true, bowel: true, miss: ['dinner'] });
    p4.entries['5'] = mkEntry(p4, 5, { weight: 71.6, muscle: 23.9, fat: 29.8, visceral: 10, water: 3, sleep: false, cd: true, bowel: false, se: false, miss: ['breakfast'] });
    p4.feedback.push({
      id: 'f2',
      day: null,
      text: '요즘 기록이 뜸해요. 하루 3분이면 되니 오늘부터 다시 시작해볼까요? 힘들면 언제든 말씀해주세요.',
      createdAt: isoAt(M.addDays(t, -2), '20:05')
    });

    return [p1, p2, p3, p4];
  }

  function promos(today) {
    var t = today || M.todayStr();
    return [
      {
        id: 'pr1',
        type: 'groupbuy',
        category: 'shake',
        title: '단백질 쉐이크 2주 세트',
        memo: '순탄수 15g↓ · 1회 20g 단백질',
        benefit: '참여코드 입력 시 10% 할인',
        link: 'https://example.com/groupbuy/shake',
        imageUrl: '',
        disclosure: false,
        active: true,
        featured: true,
        createdAt: isoAt(t, '07:00'),
        updatedAt: isoAt(t, '07:00')
      },
      {
        id: 'pr2',
        type: 'coupang',
        category: 'supplement',
        title: '종합비타민 60일분',
        memo: '아침 영양제로 무난한 구성',
        benefit: '쿠팡 최저가 · 로켓배송',
        link: 'https://www.coupang.com/',
        imageUrl: '',
        disclosure: true,
        active: true,
        featured: false,
        createdAt: isoAt(M.addDays(t, -1), '10:00'),
        updatedAt: isoAt(M.addDays(t, -1), '10:00')
      },
      {
        id: 'pr3',
        type: 'ad',
        category: 'food',
        title: '무가당 그릭요거트',
        memo: '허용식품 · 단백질 간식으로',
        benefit: '브랜드 공식몰 15% 쿠폰',
        link: 'https://example.com/ad/yogurt',
        imageUrl: '',
        disclosure: false,
        active: true,
        featured: false,
        createdAt: isoAt(M.addDays(t, -3), '09:00'),
        updatedAt: isoAt(M.addDays(t, -3), '09:00')
      },
      {
        id: 'pr4',
        type: 'groupbuy',
        category: 'etc',
        title: '보온 텀블러 공구',
        memo: '물 2L 챙기기용 1L 텀블러',
        benefit: '마감된 공구예요',
        link: 'https://example.com/groupbuy/tumbler',
        imageUrl: '',
        disclosure: false,
        active: false,
        featured: false,
        createdAt: isoAt(M.addDays(t, -7), '11:00'),
        updatedAt: isoAt(M.addDays(t, -7), '11:00')
      }
    ];
  }

  global.App.Seed = { build: build, promos: promos };
})(typeof window !== 'undefined' ? window : globalThis);
