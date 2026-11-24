/* 인증 어댑터
 * - demo    : 로컬 체험 (서버 없음)
 * - supabase: Supabase Auth의 signInWithOAuth({ provider: 'kakao' })
 * - kakao   : Kakao JS SDK authorize
 * 세션은 localStorage에 저장하고, 앱은 App.Auth.getSession()만 봅니다.
 */
(function (global) {
  'use strict';

  var CFG = global.App.Config;
  var SESSION_KEY = 'mod.v2.session';

  function readSession() {
    try {
      var raw = global.localStorage ? global.localStorage.getItem(SESSION_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeSession(session) {
    if (global.localStorage) global.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    if (global.localStorage) global.localStorage.removeItem(SESSION_KEY);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = global.document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = function () { resolve(true); };
      el.onerror = function () { reject(new Error('스크립트를 불러오지 못했어요: ' + src)); };
      global.document.head.appendChild(el);
    });
  }

  function currentPageUrl() {
    if (!global.location) return '';
    return global.location.origin + global.location.pathname;
  }

  /* 카카오 로그인 시작. 데모 모드에서는 { demo: true }를 돌려줍니다. */
  async function signInWithKakao() {
    if (CFG.authMode === 'supabase') {
      if (!CFG.supabase.url || !CFG.supabase.anonKey) {
        return { error: 'Supabase URL과 anon 키를 js/config.js에 넣어주세요.' };
      }
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      var client = global.supabase.createClient(CFG.supabase.url, CFG.supabase.anonKey);
      global.App._supabase = client;
      var handled = await restoreSupabaseSession(client);
      if (handled) return { session: handled };
      var res = await client.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: CFG.supabase.redirectTo || currentPageUrl() }
      });
      return res.error ? { error: res.error.message } : { redirecting: true };
    }

    if (CFG.authMode === 'kakao') {
      if (!CFG.kakao.jsKey) return { error: '카카오 JavaScript 키를 js/config.js에 넣어주세요.' };
      await loadScript('https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js');
      if (!global.Kakao.isInitialized()) global.Kakao.init(CFG.kakao.jsKey);
      global.Kakao.Auth.authorize({ redirectUri: CFG.kakao.redirectUri || currentPageUrl() });
      return { redirecting: true };
    }

    return { demo: true };
  }

  /* Supabase OAuth 리다이렉트로 돌아왔을 때 세션 복구 시도 */
  async function restoreSupabaseSession(client) {
    try {
      if (!client) return null;
      var res = await client.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      if (!session || !session.user) return null;
      var user = session.user;
      var meta = user.user_metadata || {};
      return {
        provider: 'kakao',
        authUserId: user.id,
        name: meta.name || meta.nickname || meta.full_name || '',
        email: user.email || '',
        participantId: null,
        role: 'participant'
      };
    } catch (e) { return null; }
  }

  async function resume() {
    var saved = readSession();
    if (!saved) return null;
    if (saved.provider === 'supabase' && global.App._supabase) {
      var restored = await restoreSupabaseSession(global.App._supabase);
      if (restored) {
        restored.participantId = saved.participantId || null;
        restored.role = saved.role || 'participant';
        writeSession(restored);
        return restored;
      }
    }
    return saved;
  }

  function signInDemo(participantId) {
    var session = {
      provider: 'demo',
      role: 'participant',
      participantId: participantId,
      createdAt: new Date().toISOString()
    };
    writeSession(session);
    return session;
  }

  /* 관리자 코드 입력으로만 만드는 세션 (로그인 화면의 원클릭 체험 버튼 없음) */
  function signInAdmin(participantId) {
    var session = {
      provider: 'admin',
      role: 'admin',
      adminLogin: true,
      participantId: participantId || null,
      createdAt: new Date().toISOString()
    };
    writeSession(session);
    return session;
  }

  function signInCode(participant) {
    var session = {
      provider: 'code',
      role: 'participant',
      participantId: participant.id,
      createdAt: new Date().toISOString()
    };
    writeSession(session);
    return session;
  }

  async function signOut() {
    clearSession();
    try {
      if (CFG.authMode === 'supabase' && global.App._supabase) {
        await global.App._supabase.auth.signOut();
      }
      if (CFG.authMode === 'kakao' && global.Kakao && global.Kakao.Auth) {
        global.Kakao.Auth.logout();
      }
    } catch (e) { /* 무시 */ }
  }

  global.App.Auth = {
    readSession: readSession,
    writeSession: writeSession,
    signInWithKakao: signInWithKakao,
    signInDemo: signInDemo,
    signInAdmin: signInAdmin,
    signInCode: signInCode,
    signOut: signOut,
    resume: resume,
    isDemo: function () { return CFG.authMode === 'demo'; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
