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
      if (o.noMeals) { e.meals[m] = false; return; }
      e.meals[m] = !(o.miss && o.miss.indexOf(m) >= 0);
    });
    return e;
  }

  function participant(id, name, code, startDate, nickname, opts) {
    opts = opts || {};
    var settings = { lastMeal: '19:30', wake: '07:00' };
    /* 지난 기록이 있는 가상 참여자는 튜토리얼을 이미 마친 상태 */
    if (opts.tutorialDone) {
      settings.tutorialDone = true;
      settings.tutorialDoneAt = isoAt(startDate, '07:20');
    }
    if (opts.gender) settings.gender = opts.gender;
    if (opts.cycleStart) settings.cycleStart = opts.cycleStart;
    if (opts.cycleLength) settings.cycleLength = opts.cycleLength;
    if (opts.periodDays) settings.periodDays = opts.periodDays;
    return {
      id: id,
      name: name,
      nickname: nickname || '',
      code: code,
      startDate: startDate,
      createdAt: isoAt(startDate, '07:30'),
      settings: settings,
      planOverrides: {},
      entries: {},
      feedback: []
    };
  }

  function build(today) {
    var t = today || M.todayStr();

    /* 1) 김유니 — 가상 인물. 시작일이 오늘(Day 1)이고, 시작 인바디만 입력한 상태 */
    var p1 = participant('p1', '김유니', '1234', t, '유니');
    p1.entries['1'] = mkEntry(p1, 1, {
      weight: 61.5, muscle: 21.5, fat: 21.0, visceral: 5,
      water: 0, sm: false, se: false, noMeals: true,
      memo: '오늘부터 28일 시작!' });
    p1.feedback.push({
      id: 'f1',
      day: 1,
      text: '첫날이에요! 물 8잔과 공복 14시간만 챙겨도 절반은 성공이에요. 28일 함께 가요.',
      createdAt: isoAt(t, '07:40')
    });

    /* 2) 김서연 — 오늘 Day 16, 꾸준히 기록 중 (여성 · 생리주기 입력됨) */
    var p2 = participant('p2', '김서연', '2751', M.addDays(t, -15), '서연', {
      tutorialDone: true,
      gender: 'female',
      cycleStart: M.addDays(t, -12),
      cycleLength: 28,
      periodDays: 5
    });
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
    var p3 = participant('p3', '이지은', '4813', M.addDays(t, -1), '지은', { tutorialDone: true });
    p3.entries['1'] = mkEntry(p3, 1, { weight: 57.8, muscle: 20.6, fat: 23.4, visceral: 6, water: 6, f14: true, sleep: false, cd: true, bowel: true, se: false, memo: '시작! 내일은 물 더 챙기기.' });

    /* 4) 최하늘 — Day 9인데 기록이 뜸함 */
    var p4 = participant('p4', '최하늘', '6302', M.addDays(t, -8), '하늘', { tutorialDone: true });
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
    function mk(o) {
      return Object.assign({
        type: 'groupbuy', category: 'etc', startsAt: '', endsAt: '',
        title: '', memo: '', benefit: '', link: '', imageUrl: '',
        disclosure: false, active: true, featured: false,
        createdAt: isoAt(t, '07:00'), updatedAt: isoAt(t, '07:00')
      }, o);
    }
    return [
      /* 공구 — 일정(시작·마감일)이 있어야 일정순으로 정렬된다 */
      mk({
        id: 'pr1', type: 'groupbuy', title: '단백질쉐이크 2주 세트',
        memo: '순탄수 15g↓ · 1회 20g 단백질',
        benefit: '참여코드 입력 시 10% 할인',
        startsAt: M.addDays(t, -2), endsAt: M.addDays(t, 5),
        link: 'https://example.com/groupbuy/shake', featured: true, createdAt: isoAt(t, '07:00')
      }),
      mk({
        id: 'pr5', type: 'groupbuy', title: '유기농 곤약면 10팩',
        memo: '점심 2/3공기와 함께 먹기 좋은 저탄수 면',
        benefit: '3팩 더 증정 · 오늘 자정 마감',
        startsAt: M.addDays(t, -4), endsAt: M.addDays(t, 1),
        link: 'https://example.com/groupbuy/konjac', createdAt: isoAt(M.addDays(t, -4), '09:00')
      }),
      mk({
        id: 'pr6', type: 'groupbuy', title: '저당 그래놀라 6팩',
        memo: '유지기 아침 간식용 · 당류 3g↓',
        benefit: '오픈 준비 중 · 시작 알림',
        startsAt: M.addDays(t, 3), endsAt: M.addDays(t, 10),
        link: 'https://example.com/groupbuy/granola', active: true, createdAt: isoAt(t, '08:00')
      }),
      mk({
        id: 'pr4', type: 'groupbuy', title: '보온 텀블러',
        memo: '물 2L 챙기기용 1L 텀블러',
        benefit: '마감된 공구예요',
        startsAt: M.addDays(t, -14), endsAt: M.addDays(t, -7),
        link: 'https://example.com/groupbuy/tumbler', active: false, createdAt: isoAt(M.addDays(t, -14), '11:00')
      }),
      /* 쿠팡 — 하위 카테고리 쉐이크 / 식단템 / 운동템 / 기타 */
      mk({
        id: 'pr2', type: 'coupang', category: 'shake', title: '단백질쉐이크 30팩',
        memo: '1회 20g 단백질 · 순탄수 15g 미만',
        benefit: '쿠팡 최저가 · 로켓배송', link: 'https://www.coupang.com/',
        disclosure: true, createdAt: isoAt(M.addDays(t, -1), '10:00')
      }),
      mk({
        id: 'pr7', type: 'coupang', category: 'meal', title: '닭가슴살 100g · 20팩',
        memo: '점심 단백질 반찬으로 한 팩씩',
        benefit: '로켓프레시', link: 'https://www.coupang.com/',
        disclosure: true, createdAt: isoAt(M.addDays(t, -1), '10:10')
      }),
      mk({
        id: 'pr8', type: 'coupang', category: 'workout', title: '요가매트 6mm',
        memo: 'HIIT·홈트 할 때 무릎 부담 적은 두께',
        benefit: '무료배송', link: 'https://www.coupang.com/',
        disclosure: true, createdAt: isoAt(M.addDays(t, -1), '10:20')
      }),
      mk({
        id: 'pr9', type: 'coupang', category: 'etc', title: '종합비타민 60일분',
        memo: '4일차 이후 아침 영양제로 무난한 구성',
        benefit: '쿠팡 최저가 · 로켓배송', link: 'https://www.coupang.com/',
        disclosure: true, createdAt: isoAt(M.addDays(t, -1), '10:30')
      }),
      /* 광고 */
      mk({
        id: 'pr3', type: 'ad', title: '무가당 그릭요거트',
        memo: '허용식품 · 단백질 간식으로',
        benefit: '브랜드 공식몰 15% 쿠폰',
        link: 'https://example.com/ad/yogurt', createdAt: isoAt(M.addDays(t, -3), '09:00')
      })
    ];
  }

  global.App.Seed = { build: build, promos: promos };
})(typeof window !== 'undefined' ? window : globalThis);
