/* 내 기록 백업 · 복원 — 이 기기의 '내 기록'(개인 참여자)만 JSON 파일로 내보내고 되돌립니다.
 * 관리자·데모·참여코드 참여자의 기록은 백업 파일에 담지 않습니다.
 * 파일 형식:
 *   { app: 'my-optimal-diet', type: 'personal-backup', schemaVersion: 1,
 *     appVersion, exportedAt, nickname, startDate, summary, participant: {...} }
 */
(function (global) {
  'use strict';

  var M = global.App.Model;

  var APP_ID = 'my-optimal-diet';
  var TYPE = 'personal-backup';
  var SCHEMA = 1;
  var MAX_BYTES = 30 * 1024 * 1024;
  /* 백업 파일에 담는 개인 기록 항목 — id·code·personal 같은 기기 식별자는 담지 않는다 */
  var RECORD_KEYS = ['name', 'nickname', 'startDate', 'settings', 'planOverrides', 'entries', 'feedback', 'rounds', 'createdAt'];

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function isArr(v) { return Array.isArray(v); }
  function str(v) { return typeof v === 'string' ? v : ''; }

  function entriesOf(record) {
    return record && isObj(record.entries) ? record.entries : {};
  }

  function dayKeys(record) {
    var e = entriesOf(record);
    return Object.keys(e).filter(function (k) { return /^\d+$/.test(k); });
  }

  function dayCount(record) { return dayKeys(record).length; }

  function photoCount(record) {
    var e = entriesOf(record), n = 0;
    dayKeys(record).forEach(function (k) {
      var ph = e[k] && e[k].photos;
      if (!isObj(ph)) return;
      Object.keys(ph).forEach(function (key) {
        if (ph[key] && ph[key].dataUrl) n += 1;
      });
    });
    return n;
  }

  function roundCount(record) {
    return isArr(record && record.rounds) ? record.rounds.length : 0;
  }

  /* 로그인한 '내 기록'(personal)만 백업 객체로 만든다. 다른 참여자 기록은 거부. */
  function build(participant) {
    if (!participant || participant.personal !== true) {
      throw new Error('내 기록(개인)에서만 백업을 만들 수 있어요.');
    }
    var record = {};
    RECORD_KEYS.forEach(function (k) {
      if (participant[k] !== undefined) record[k] = clone(participant[k]);
    });
    record.name = str(record.name);
    record.nickname = str(record.nickname);
    record.startDate = str(record.startDate);
    record.settings = isObj(record.settings) ? record.settings : {};
    record.planOverrides = isObj(record.planOverrides) ? record.planOverrides : {};
    record.entries = isObj(record.entries) ? record.entries : {};
    record.feedback = isArr(record.feedback) ? record.feedback : [];
    record.rounds = isArr(record.rounds) ? record.rounds : [];
    var nickname = record.nickname || record.name || '나';
    return {
      app: APP_ID,
      type: TYPE,
      schemaVersion: SCHEMA,
      appVersion: (global.App.Program && global.App.Program.version) || '',
      exportedAt: new Date().toISOString(),
      nickname: nickname,
      startDate: record.startDate,
      summary: { days: dayCount(record), photos: photoCount(record), rounds: roundCount(record) },
      participant: record
    };
  }

  function stringify(backup) { return JSON.stringify(backup, null, 2); }

  /* 파일 이름: yoyop-diet-backup-{닉네임}-{YYYY-MM-DD}.json */
  function fileName(participant, dateStr) {
    var raw = (participant && (participant.nickname || participant.name)) || '나';
    var nick = String(raw).replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || '나';
    var day = M && M.isDateStr(dateStr) ? String(dateStr) : (M ? M.todayStr() : '');
    return 'yoyop-diet-backup-' + nick + '-' + day + '.json';
  }

  /* 백업 파일 검증 — 형식/버전/필수 항목이 하나라도 어긋나면 사람이 읽을 수 있는 오류를 던진다.
   * 기존 기록을 건드리기 전에 먼저 부르므로, 잘못된 파일은 여기서 막힌다. */
  function parse(text) {
    var raw = String(text === undefined || text === null ? '' : text).replace(/^\uFEFF/, '');
    if (!raw.trim()) throw new Error('백업 파일이 비어 있어요.');
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { throw new Error('백업 파일을 읽지 못했어요. 파일이 손상되었는지 확인해 주세요.'); }
    if (!isObj(data)) throw new Error('백업 파일 형식이 올바르지 않아요.');
    if (data.app !== APP_ID || data.type !== TYPE) {
      throw new Error('마이옵티멀다이어트 내 기록 백업 파일이 아니에요.');
    }
    var ver = Number(data.schemaVersion);
    if (!isFinite(ver) || ver < 1) throw new Error('백업 파일 버전을 확인할 수 없어요.');
    if (ver > SCHEMA) {
      throw new Error('더 새로운 버전에서 만든 백업 파일이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.');
    }
    var src = data.participant;
    if (!isObj(src)) throw new Error('백업 파일에 내 기록이 없어요.');
    if (!M.isDateStr(src.startDate)) throw new Error('백업 파일의 시작일이 올바르지 않아요.');
    if (!isObj(src.entries)) throw new Error('백업 파일의 28일 기록 형식이 올바르지 않아요.');
    var keys = Object.keys(src.entries);
    for (var i = 0; i < keys.length; i++) {
      if (!/^\d+$/.test(keys[i]) || !isObj(src.entries[keys[i]])) {
        throw new Error('백업 파일의 28일 기록 형식이 올바르지 않아요.');
      }
    }
    if (src.settings !== undefined && !isObj(src.settings)) {
      throw new Error('백업 파일의 내 정보 형식이 올바르지 않아요.');
    }
    if (src.planOverrides !== undefined && !isObj(src.planOverrides)) {
      throw new Error('백업 파일의 식단 기록 형식이 올바르지 않아요.');
    }
    if (src.feedback !== undefined && !isArr(src.feedback)) {
      throw new Error('백업 파일의 피드백 형식이 올바르지 않아요.');
    }
    if (src.nickname !== undefined && typeof src.nickname !== 'string') {
      throw new Error('백업 파일의 프로필 형식이 올바르지 않아요.');
    }
    if (src.name !== undefined && typeof src.name !== 'string') {
      throw new Error('백업 파일의 프로필 형식이 올바르지 않아요.');
    }
    if (src.rounds !== undefined) {
      if (!isArr(src.rounds)) throw new Error('백업 파일의 회차 기록 형식이 올바르지 않아요.');
      for (var r = 0; r < src.rounds.length; r++) {
        var rd = src.rounds[r];
        if (!isObj(rd) || !isObj(rd.entries)) {
          throw new Error('백업 파일의 회차 기록 형식이 올바르지 않아요.');
        }
      }
    }
    /* 기기 식별자·참여코드 등은 파일에 있어도 복원 대상에서 뺀다 (본인 기록만) */
    var record = {};
    RECORD_KEYS.forEach(function (k) { if (src[k] !== undefined) record[k] = clone(src[k]); });
    record.name = str(record.name);
    record.nickname = str(record.nickname);
    record.startDate = String(src.startDate);
    record.settings = isObj(record.settings) ? record.settings : {};
    record.planOverrides = isObj(record.planOverrides) ? record.planOverrides : {};
    record.entries = record.entries || {};
    record.feedback = isArr(record.feedback) ? record.feedback : [];
    record.rounds = isArr(record.rounds) ? record.rounds : [];
    return {
      record: record,
      meta: {
        nickname: record.nickname || record.name || '내 기록',
        startDate: record.startDate,
        exportedAt: str(data.exportedAt),
        appVersion: str(data.appVersion),
        days: dayCount(record),
        photos: photoCount(record),
        rounds: roundCount(record)
      }
    };
  }

  global.App.Backup = {
    appId: APP_ID,
    type: TYPE,
    schemaVersion: SCHEMA,
    maxBytes: MAX_BYTES,
    recordKeys: RECORD_KEYS.slice(),
    build: build,
    parse: parse,
    stringify: stringify,
    fileName: fileName,
    dayCount: dayCount,
    photoCount: photoCount,
    roundCount: roundCount
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = global.App.Backup; }
})(typeof window !== 'undefined' ? window : globalThis);
