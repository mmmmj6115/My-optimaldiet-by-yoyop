/* 데이터 레이어 — 화면(app.js)은 아래 메서드만 사용합니다.
 * 로컬(localStorage) 어댑터와 REST(Supabase/API) 어댑터가 같은 인터페이스를 가집니다.
 * 나중에 js/config.js의 dataMode를 'rest'로 바꾸면 화면 코드는 그대로 둔 채 서버에 붙습니다.
 */
(function (global) {
  'use strict';

  var DEFAULT_NS = 'mod.v1';

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function nowIso() { return new Date().toISOString(); }
  function makeId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function normalizeCode(code) { return String(code || '').trim().toUpperCase(); }

  /* ---------------- 로컬 저장소 ---------------- */
  function createLocal(options) {
    options = options || {};
    var storage = options.storage || global.localStorage;
    var ns = options.namespace || DEFAULT_NS;
    var K = {
      participants: ns + '.participants',
      promos: ns + '.promos',
      seeded: ns + '.seeded'
    };

    function read(key, fallback) {
      try {
        var raw = storage.getItem(key);
        if (!raw) return fallback;
        var parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallback : parsed;
      } catch (e) { return fallback; }
    }
    function write(key, value) {
      storage.setItem(key, JSON.stringify(value));
      return value;
    }
    function participants() { return read(K.participants, []); }
    function promos() { return read(K.promos, []); }
    function find(list, id) {
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
      return -1;
    }
    function uniqueCode(list, proposed) {
      var code = normalizeCode(proposed);
      var taken = function (c) { return list.some(function (p) { return normalizeCode(p.code) === c; }); };
      if (code && !taken(code)) return code;
      do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (taken(code));
      return code;
    }

    var api = {
      kind: 'local',

      async init(opts) {
        opts = opts || {};
        if (!read(K.seeded, false)) {
          write(K.participants, opts.participants || []);
          write(K.promos, opts.promos || []);
          write(K.seeded, true);
        }
        return true;
      },

      async listParticipants() { return clone(participants()); },

      async getParticipant(id) {
        var list = participants();
        var i = find(list, id);
        return i < 0 ? null : clone(list[i]);
      },

      async findByCode(code) {
        var list = participants();
        var c = normalizeCode(code);
        for (var i = 0; i < list.length; i++) {
          if (normalizeCode(list[i].code) === c) return clone(list[i]);
        }
        return null;
      },

      async createParticipant(data) {
        var list = participants();
        /* personal: 이 기기에서 혼자 쓰는 '내 기록' — 이름·참여코드 없이도 만들 수 있다 */
        var personal = !!(data && data.personal);
        var name = String((data && data.name) || '').trim();
        if (!name && !personal) throw new Error('이름을 입력해주세요.');
        var startDate = (data && data.startDate) || null;
        if (!startDate) throw new Error('시작일을 입력해주세요.');
        var p = {
          id: makeId('p'),
          name: name,
          nickname: String((data && data.nickname) || '').trim(),
          code: personal ? '' : uniqueCode(list, data.code),
          startDate: startDate,
          createdAt: nowIso(),
          personal: personal || undefined,
          settings: Object.assign({
            lastMeal: (global.App.Program && global.App.Program.check.lastMeal) || '19:30',
            wake: (global.App.Program && global.App.Program.check.wakeTime) || '07:00'
          }, (data && data.settings) || {}),
          planOverrides: {},
          entries: {},
          feedback: [],
          rounds: []
        };
        list.push(p);
        write(K.participants, list);
        return clone(p);
      },

      async getPersonal() {
        var list = participants();
        for (var i = 0; i < list.length; i++) {
          if (list[i] && list[i].personal) return clone(list[i]);
        }
        return null;
      },

      async updateParticipant(id, patch) {
        var list = participants();
        var i = find(list, id);
        if (i < 0) throw new Error('참여자를 찾지 못했어요.');
        Object.keys(patch || {}).forEach(function (k) { list[i][k] = patch[k]; });
        write(K.participants, list);
        return clone(list[i]);
      },

      async putEntry(id, dayNumber, entry) {
        var list = participants();
        var i = find(list, id);
        if (i < 0) throw new Error('참여자를 찾지 못했어요.');
        if (!list[i].entries) list[i].entries = {};
        var next = clone(entry || {});
        next.updatedAt = next.updatedAt || nowIso();
        list[i].entries[String(dayNumber)] = next;
        write(K.participants, list);
        return clone(list[i]);
      },

      async setPlanOverride(id, dayNumber, meals) {
        var list = participants();
        var i = find(list, id);
        if (i < 0) throw new Error('참여자를 찾지 못했어요.');
        if (!list[i].planOverrides) list[i].planOverrides = {};
        if (meals === null || meals === undefined) {
          delete list[i].planOverrides[String(dayNumber)];
        } else {
          list[i].planOverrides[String(dayNumber)] = clone(meals);
        }
        write(K.participants, list);
        return clone(list[i]);
      },

      async addFeedback(id, data) {
        var list = participants();
        var i = find(list, id);
        if (i < 0) throw new Error('참여자를 찾지 못했어요.');
        var text = String((data && data.text) || '').trim();
        if (!text) throw new Error('피드백 내용을 입력해주세요.');
        if (!list[i].feedback) list[i].feedback = [];
        list[i].feedback.push({
          id: makeId('f'),
          day: data.day || null,
          text: text,
          createdAt: nowIso()
        });
        write(K.participants, list);
        return clone(list[i]);
      },

      async deleteFeedback(id, feedbackId) {
        var list = participants();
        var i = find(list, id);
        if (i < 0) throw new Error('참여자를 찾지 못했어요.');
        list[i].feedback = (list[i].feedback || []).filter(function (f) { return f.id !== feedbackId; });
        write(K.participants, list);
        return clone(list[i]);
      },

      async listPromos() {
        var list = promos().slice();
        list.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
        return clone(list);
      },

      async createPromo(data) {
        var list = promos();
        var p = Object.assign({
          id: makeId('pr'),
          type: 'groupbuy',
          category: 'etc',
          startsAt: '',
          endsAt: '',
          title: '',
          memo: '',
          benefit: '',
          link: '',
          imageUrl: '',
          disclosure: false,
          active: true,
          featured: false
        }, clone(data || {}));
        p.type = p.type || 'groupbuy';
        p.category = p.category || 'etc';
        p.createdAt = nowIso();
        p.updatedAt = p.createdAt;
        list.push(p);
        write(K.promos, list);
        return clone(p);
      },

      async updatePromo(id, patch) {
        var list = promos();
        var i = find(list, id);
        if (i < 0) throw new Error('추천템을 찾지 못했어요.');
        Object.keys(patch || {}).forEach(function (k) { list[i][k] = patch[k]; });
        list[i].updatedAt = nowIso();
        write(K.promos, list);
        return clone(list[i]);
      },

      async deletePromo(id) {
        var list = promos().filter(function (p) { return p.id !== id; });
        write(K.promos, list);
        return true;
      },

      async resetDemo(seed) {
        write(K.participants, (seed && seed.participants) || []);
        write(K.promos, (seed && seed.promos) || []);
        write(K.seeded, true);
        return true;
      }
    };

    return api;
  }

  /* ---------------- REST 어댑터 (Supabase PostgREST/RPC 또는 자체 API) ----------------
   * 아래 경로 규칙만 맞추면 화면 코드 수정 없이 서버에 연결됩니다.
   *  GET    {base}/participants
   *  GET    {base}/participants/:id
   *  POST   {base}/participants                       { name, code, startDate }
   *  PATCH  {base}/participants/:id                   { ...patch }
   *  PUT    {base}/participants/:id/entries/:day      entry
   *  PATCH  {base}/participants/:id/plans/:day        { meals } | { meals: null }
   *  POST   {base}/participants/:id/feedback          { day, text }
   *  DELETE {base}/participants/:id/feedback/:fid
   *  GET    {base}/promos
   *  POST   {base}/promos
   *  PATCH  {base}/promos/:id
   *  DELETE {base}/promos/:id
   */
  function createRest(options) {
    options = options || {};
    var base = String(options.baseUrl || '').replace(/\/$/, '');
    var token = options.token || '';

    async function request(path, opts) {
      if (!base) throw new Error('REST baseUrl이 설정되지 않았어요. js/config.js를 확인해주세요.');
      opts = opts || {};
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      var res = await fetch(base + path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
      });
      if (!res.ok) {
        var detail = '';
        try { detail = await res.text(); } catch (e) { /* 무시 */ }
        throw new Error('요청 실패(' + res.status + ') ' + detail);
      }
      if (res.status === 204) return null;
      return res.json();
    }

    return {
      kind: 'rest',
      async init() { return true; },
      listParticipants() { return request('/participants'); },
      getParticipant(id) { return request('/participants/' + encodeURIComponent(id)); },
      findByCode(code) { return request('/participants?code=' + encodeURIComponent(normalizeCode(code))).then(function (r) { return (r || [])[0] || null; }); },
      createParticipant(data) { return request('/participants', { method: 'POST', body: data }); },
      getPersonal() { return request('/participants?personal=1').then(function (r) { return (r || [])[0] || null; }); },
      updateParticipant(id, patch) { return request('/participants/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
      putEntry(id, day, entry) { return request('/participants/' + encodeURIComponent(id) + '/entries/' + day, { method: 'PUT', body: entry }); },
      setPlanOverride(id, day, meals) { return request('/participants/' + encodeURIComponent(id) + '/plans/' + day, { method: 'PATCH', body: { meals: meals } }); },
      addFeedback(id, data) { return request('/participants/' + encodeURIComponent(id) + '/feedback', { method: 'POST', body: data }); },
      deleteFeedback(id, fid) { return request('/participants/' + encodeURIComponent(id) + '/feedback/' + encodeURIComponent(fid), { method: 'DELETE' }); },
      listPromos() { return request('/promos'); },
      createPromo(data) { return request('/promos', { method: 'POST', body: data }); },
      updatePromo(id, patch) { return request('/promos/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
      deletePromo(id) { return request('/promos/' + encodeURIComponent(id), { method: 'DELETE' }); },
      async resetDemo() { throw new Error('데모 초기화는 로컬 모드에서만 지원해요.'); }
    };
  }

  global.App.Store = {
    createLocal: createLocal,
    createRest: createRest,
    makeId: makeId
  };
})(typeof window !== 'undefined' ? window : globalThis);
