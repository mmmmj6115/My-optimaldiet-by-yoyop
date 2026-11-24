/* 앱 설정 — 배포 시 여기만 고치면 됩니다.
 * 비밀 키(서비스 롤 키, 카카오 시크릿)는 절대 이 파일에 넣지 마세요.
 * Supabase의 anon(public) 키와 Kakao JavaScript 키는 공개되어도 되는 키입니다.
 */
(function (global) {
  'use strict';

  var CONFIG = {
    appName: '마이옵티멀다이어트 28일 루틴',
    version: '1.3.0',

    /* 'demo' | 'supabase' | 'kakao'
     *  - demo    : 서버·키 없이 로컬 체험 (기본값)
     *  - supabase: Supabase Auth의 Kakao OAuth 사용 (권장)
     *  - kakao   : Kakao JS SDK로 직접 로그인
     */
    authMode: 'demo',

    supabase: {
      url: '',            // 예: https://abcd1234.supabase.co
      anonKey: '',        // Supabase > Project Settings > API > anon public
      redirectTo: ''      // 비우면 현재 페이지 주소 사용
    },

    kakao: {
      jsKey: '',          // developers.kakao.com > JavaScript 키
      redirectUri: ''     // 카카오 로그인 Redirect URI (비우면 현재 페이지)
    },

    /* 데모 체험 계정: 참여코드로 연결 */
    demo: {
      participantCode: '1234',   // 데모 참여자 (가상 인물 김유니, Day 1부터 시작)
      adminCode: 'yoyop2828'     // 관리자 전용 코드 — 로그인 화면의 '관리자 로그인'에서만 입력
    },

    /* 배포 후 실제 데이터 소스로 바꿀 때 사용 (README 참고) */
    dataMode: 'local',   // 'local' | 'rest'
    rest: {
      baseUrl: ''        // 예: https://abcd1234.supabase.co/rest/v1/rpc/app
    }
  };

  global.App = global.App || {};
  global.App.Config = CONFIG;
  if (typeof module !== 'undefined' && module.exports) { module.exports = CONFIG; }
})(typeof window !== 'undefined' ? window : globalThis);
