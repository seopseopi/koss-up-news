/*
 * 골든타임 5번 모듈: 재난·뉴스 이벤트
 * - 아침 뉴스(시황·업무 포인트), 1일차 밤 대형지진, 퇴근 후 밤 뉴스, 5일차 엔딩 뉴스를 만들고 화면에 띄운다.
 * - 점수·예산은 건드리지 않는다. 6번 시스템(session)에는 재난 지표와 다음 날 아침에 적용할 결과만 전달한다.
 * - 사용법은 README.md 참고.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GoldenTimeNews = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ═════════════ 1. 시나리오 데이터 ═════════════ */

  const DAYS = 5;
  const QUAKE = { day: 1, time: "23:47", magnitude: 7.8, city: "해원시", status: "규모 7.8 지진 발생" };

  // beginDisaster()에 등록하는 전체 재난 목표. ID는 바꾸지 않는다.
  const OBJECTIVES = [
    { id: "relief-supplies", label: "구호물품 공급", target: 100, unit: "천 세트", icon: "📦" },
    { id: "routes", label: "보급로 복구", target: 5, unit: "개 노선", icon: "🛣️" },
    { id: "drone-deliveries", label: "의료·생활 지원", target: 10, unit: "곳", icon: "🚁" },
    { id: "city-recovery", label: "도시 복구", target: 100, unit: "%", icon: "🏙️" }
  ];

  // 모든 선택이 최선일 때 밤마다 늘어나는 양 (1~5일차 밤)
  const PERFECT = { relief: [15, 25, 25, 20, 15], drone: [0, 3, 3, 2, 2], city: [5, 15, 25, 27, 28] };

  const MATERIALS = [
    { id: "steel", label: "철강", icon: "🔩" }, { id: "cement", label: "시멘트", icon: "🧱" },
    { id: "fuel", label: "경유", icon: "⛽" }, { id: "lumber", label: "목재", icon: "🪵" }
  ];
  // 아침 기준 가격 지수 (1일차 = 100)
  const PRICE_INDEX = {
    1: { steel: 100, cement: 100, fuel: 100, lumber: 100 },
    2: { steel: 118, cement: 125, fuel: 110, lumber: 105 },
    3: { steel: 131, cement: 138, fuel: 128, lumber: 112 },
    4: { steel: 127, cement: 130, fuel: 115, lumber: 134 },
    5: { steel: 112, cement: 115, fuel: 104, lumber: 120 }
  };

  const TABS = {
    contract: { label: "나라장터 계약 심사", icon: "📋", effect: "구호물품 공급" },
    reserve: { label: "원자재 비축 관리", icon: "🏗️", effect: "보급로 복구" },
    innovation: { label: "혁신제품 지원", icon: "💡", effect: "의료·생활 지원" }
  };

  const MORNING = {
    1: {
      tag: "속보", scene: "city",
      title: "동남부 지역 지진 위험 증가…정부, 재난 대비 필요성 강조",
      body: "최근 지각 활동이 증가하면서 주요 시설의 안전 점검과 비상 물자 확보 필요성이 제기되고 있습니다.",
      articles: [
        { cat: "경제", scene: "market", title: "원자재 시장 '폭풍 전 고요'…철강·시멘트 보합", body: "가격은 아직 평소 수준입니다. 전문가들은 재난이 발생하면 복구 자재부터 값이 뛴다며 지금이 비축 적기라고 말합니다." },
        { cat: "계약", scene: "office", title: "나라장터 구호물품 입찰 접수 시작", body: "생수·담요·비상식량 납품 입찰이 몰리고 있습니다. 주소지만 빌린 페이퍼컴퍼니가 섞여 있다는 제보도 있어 꼼꼼한 심사가 필요합니다." },
        { cat: "혁신", scene: "drone", title: "국산 운송 드론, 혁신제품 시범구매 신청", body: "도로가 끊긴 곳에 의약품을 나를 수 있다는 중소기업 드론이 지원을 요청했습니다. 평소에는 쓸 일이 적다는 지적도 있습니다." }
      ],
      ticker: ["기상청 \"동남부 미소지진 일주일 새 14회\"", "철강·시멘트 가격 보합", "구호물품 입찰 접수 급증", "혁신제품 시범구매 심사 진행 중"],
      hints: {
        contract: "구호물품 입찰에 주소만 빌린 업체가 섞여 있어요. 등기부부터 확인해요.",
        reserve: "아직 평소 가격이에요. 복구 자재를 미리 채워 둘 기회예요.",
        innovation: "운송 드론은 길이 끊겼을 때 진가를 발휘해요."
      },
      dari: ["좋은 아침이에요! 오늘의 주요 뉴스를 알려 드릴게요.", "아직은 조용하지만 방심은 금물! 오늘 준비한 만큼 내일이 달라져요."]
    },
    2: {
      tag: "긴급", scene: "quake",
      title: "해원시 규모 7.8 강진…도로·교량 붕괴, 이재민 4만 명",
      body: "어젯밤 23시 47분 해원시에서 규모 7.8 지진이 발생했습니다. 주요 보급로 5개 노선이 모두 끊겼고 대피소마다 구호물품을 기다리고 있습니다.",
      articles: [
        { cat: "경제", scene: "market", title: "복구 자재 가격 급등…시멘트 하루 새 25% 이상↑", body: "철강과 시멘트 값이 크게 올랐습니다. 여진이 이어지면 내일은 더 오를 수 있다는 전망이 우세합니다." },
        { cat: "계약", scene: "office", title: "긴급 조달 공고 폭증…'재난 특수' 노린 유령업체 주의보", body: "수의계약이 늘어난 틈을 타 실체 없는 업체가 입찰에 뛰어들고 있습니다. 등기부와 실제 사업장을 확인해야 합니다." }
      ],
      ticker: ["해원시 특별재난지역 선포", "", "여진 가능성…연료 수급 불안 조짐", "대피소 38곳 운영 중"],
      hints: {
        contract: "긴급 계약이 쏟아져요. 급할수록 실제 사업장을 확인해요.",
        reserve: "값이 뛰었지만 내일 더 오를 수 있어요. 필요한 만큼은 확보해요.",
        innovation: "고립 마을 10곳에 닿을 수단이 필요해요."
      },
      dari: ["큰일이에요…! 밤사이 해원시에 큰 지진이 났어요.", "지금부터는 한 건 한 건이 시민들의 하루를 바꿔요. 힘내요!"]
    },
    3: {
      tag: "재난", scene: "bridge",
      title: "규모 5.1 여진…보급로 복구 '시간과의 싸움'",
      body: "새벽 여진으로 복구 중이던 구간 일부가 다시 막혔습니다. 화물차 연료가 부족해 수송이 늦어지는 곳도 있습니다.",
      articles: [
        { cat: "경제", scene: "market", title: "경유 대란 조짐…철강·시멘트도 최고가", body: "수송 수요가 몰리며 경유 값이 급등했습니다. 다만 해외 긴급 수입 물량이 이틀 뒤 도착한다는 소식이 있어 고점이라는 분석도 나옵니다." },
        { cat: "계약", scene: "office", title: "구호물품 입찰서 '판박이 견적' 발견…담합 의심", body: "서로 다른 업체가 낸 견적서의 오탈자까지 같다는 제보가 접수됐습니다. 전화 확인이 필요해 보입니다." }
      ],
      ticker: ["새벽 4시 12분 규모 5.1 여진", "", "해외 긴급 수입 물량 5일차 도착 예정", "담합 의심 신고 3건 접수"],
      hints: {
        contract: "견적서가 판박이인 업체들은 전화로 확인해 봐요.",
        reserve: "오늘이 고점일 수 있어요. 수입 물량은 5일차에 와요.",
        innovation: "재난 현장에서 바로 쓸 수 있는 제품인지 따져 봐요."
      },
      dari: ["여진이 있었어요. 다들 무사해야 할 텐데…", "가격이 제일 높을 때 무작정 사는 게 정답은 아니에요. 재고와 예산을 같이 봐요!"]
    },
    4: {
      tag: "재난", scene: "shelter",
      title: "대피소 생활 장기화…임시주거 단지 건설 착수",
      body: "이재민들이 사흘째 체육관에서 지내고 있습니다. 정부는 임시주거 단지를 짓기로 했고 목재와 단열재 수요가 급증하고 있습니다.",
      articles: [
        { cat: "경제", scene: "market", title: "목재 30% 넘게 올라 '품귀'…철강·경유는 진정세", body: "임시주거 자재가 부족합니다. 조달청은 규격이 확인된 대체 자재 조합도 검토하고 있습니다." },
        { cat: "혁신", scene: "drone", title: "재난 현장서 혁신제품 재조명", body: "조립식 주택, 이동형 정수 장치 등 중소기업 제품의 지원 요청이 이어집니다. 검증되지 않은 제품도 섞여 있어 선별이 필요합니다." }
      ],
      ticker: ["임시주거 800동 건설 계획 발표", "", "내일 해외 수입 자재 입항"],
      hints: {
        contract: "임시주거 자재 계약이 시작돼요. 납품 실적을 확인해요.",
        reserve: "목재가 품귀예요. 규격이 확인된 대체 조합을 검토해요.",
        innovation: "조립식 주택·정수 장치 제안 중에 옥석을 가려요."
      },
      dari: ["이재민분들이 많이 지쳤대요. 따뜻한 집이 필요해요.", "이제는 복구 단계! 필요한 자재가 바뀌었으니 시황을 다시 확인해요."]
    },
    5: {
      tag: "종합", scene: "city",
      title: "지진 닷새째…해원시, 일상 복귀 '마지막 고비'",
      body: "오늘 업무가 이번 재난 대응의 최종 성적을 결정합니다. 수입 자재가 입항하면서 가격은 내림세로 돌아섰습니다.",
      articles: [
        { cat: "경제", scene: "market", title: "수입 물량 입항…자재값 일제히 하락", body: "철강과 시멘트가 내림세입니다. 지금 과도하게 사들이면 남는 재고가 예산 부담이 될 수 있습니다." },
        { cat: "계약", scene: "office", title: "복구 공사 계약 '막판 러시'", body: "대형 복구 공사 입찰이 몰립니다. 금액이 큰 만큼 부실 업체 한 곳이 끼치는 피해도 큽니다." }
      ],
      ticker: ["해외 수입 자재 입항 완료", "", "복구 공사 입찰 마감 임박", "오늘 밤 재난 대응 종합 보도"],
      hints: {
        contract: "금액이 큰 복구 공사예요. 한 건의 실수가 크게 돌아와요.",
        reserve: "가격이 내려가요. 남는 재고는 예산 부담이에요.",
        innovation: "마지막 지원 기회예요. 당장 현장에 투입할 수 있는지 봐요."
      },
      dari: ["벌써 마지막 날이에요. 여기까지 정말 수고했어요!", "끝까지 원칙대로! 오늘 밤 뉴스에서 결과를 함께 봐요."]
    }
  };

  // 밤 기사 제목: [영역][수준][일차-1]. {d}=오늘 증가, {a}=누적, {x}=회수량, {n}=남은 곳
  const NIGHT_TITLES = {
    contract: {
      good: ["검증된 업체 납품 순조…첫 구호물품 {d} 세트 출발", "생수·담요 {d} 세트 대피소 도착…\"심사가 빨랐다\"", "여진에도 납품 이상 무…누적 {a} 세트", "임시주거 물품 계약도 '깨끗'…{d} 세트 추가 도착", "마지막까지 원칙 심사…구호물품 누적 {a} 세트"],
      mid: ["구호물품 첫 수송 일부 지연…적격 업체 탈락 여파", "담요는 왔는데 식수가 없다…품목별 납품 엇박자", "\"멀쩡한 업체까지 탈락\" 오늘 {d} 세트만 도착", "재입찰에 하루 허비…구호물품 누적 {a} 세트", "막판 납품 몰렸지만 누적 {a} 세트에 그쳐"],
      bad: ["구호 계약 '구멍'…첫날 밤 도착 물품 {d} 세트뿐", "납품 업체 못 정해 창고 텅…대피소 '빈손'", "계약 심사 혼선 계속…오늘도 {d} 세트뿐", "나흘째 물품 부족…대피소 떠나는 시민들", "끝내 메우지 못한 구호 공백…누적 {a} 세트"],
      pending: ["미처리 서류에 발목 잡힌 첫 구호 계약…{d} 세트만 출발", "손도 못 댄 서류 {u}건…구호물품 {d} 세트만 도착", "심사 못 한 서류가 쌓였다…오늘 {d} 세트뿐", "미결 서류 {u}건에 임시주거 계약 지연…누적 {a} 세트", "마지막 날 남은 서류 {u}건…구호물품 누적 {a} 세트"],
      fake: ["[단독] 주소지는 빈 사무실…유령업체가 따낸 구호 계약", "[단독] 상자 열어보니 '불량 담요'…{x} 세트 회수", "[단독] 판박이 견적 업체와 계약…담합 수사 착수", "[단독] 납품업체 '실체 없음'…구호물품 {x} 세트 회수", "[단독] 막판 대형 계약에 부실 업체…{x} 세트 회수"]
    },
    reserve: {
      good: ["비축 창고 문 열렸다…철강·시멘트 즉시 방출", "급등 전 확보한 자재 투입…보급로 {a}개 노선 통행", "여진 피해 구간도 하루 만에 복구…보급로 {a}/5", "목재 품귀 속 대체 자재 조합 '적중'…임시주거 착공", "알뜰한 비축이 길을 열었다…보급로 {a}개 노선 개통"],
      mid: ["비축 물량 '절반'…급한 구간부터 복구", "자재 빠듯해 복구 더뎌…보급로 {a}/5", "비싼 값에 뒤늦게 매입…복구 속도는 제자리", "임시주거 자재 일부만 확보…입주 지연", "막바지 자재 부족…보급로 {a}/5로 마감"],
      bad: ["비축 창고 바닥…복구 장비만 덩그러니", "자재값 급등에 손 놓은 복구 현장…보급로 {a}/5", "최고가에 사들인 철강…예산은 줄고 길은 그대로", "목재 못 구해 임시주거 '첫 삽'도 못 떠", "남은 건 비싼 재고와 끊긴 길…보급로 {a}/5"]
    },
    innovation: {
      good: ["시범구매한 운송 드론, 재난 현장 투입 준비 완료", "국산 드론 첫 비행…고립 마을 {a}곳에 의약품", "길은 끊겨도 하늘길은 열렸다…고립 마을 {a}곳 지원", "조달청이 키운 기업, 드론 증편…{a}곳 도달", "고립 마을 {a}곳 연결…\"혁신제품이 살렸다\""],
      mid: ["드론 일부 확보…내일 시험 투입", "드론 투입됐지만 대수 부족…{a}곳만 도달", "하루 한 번 비행이 한계…고립 마을 {a}/10곳", "\"지원이 조금만 컸다면\" 드론 {a}곳 지원", "드론 지원 {a}곳으로 마감…절반의 하늘길"],
      bad: ["고립 마을 10곳, '하늘길'도 없다", "헬기만으로 역부족…고립 마을 {n}곳 발 묶여", "약 떨어진 산간 마을…걸어서 여섯 시간", "외면했던 드론 기업은 해외로…현장은 여전히 고립", "끝내 닿지 못한 마을 {n}곳"]
    }
  };
  const NIGHT_BODIES = {
    contract: {
      good: "심사에서 부실 업체를 걸러낸 덕분에 불량 없이 물품이 제때 도착했습니다. 누적 {a} 세트가 대피소에 전달됐습니다.",
      mid: "적격 업체가 심사에서 떨어지면서 납품이 늦어진 품목이 있습니다. 오늘 {d} 세트, 누적 {a} 세트가 도착했습니다.",
      bad: "계약 심사가 흔들리면서 납품할 업체가 제대로 정해지지 않았습니다. 대피소 곳곳에서 물품 부족을 호소합니다.",
      pending: "심사하지 못한 서류 {u}건이 남아 그 계약의 납품이 시작되지 못했습니다. 오늘 {d} 세트, 누적 {a} 세트가 도착했습니다.",
      fake: "서류만 갖춘 업체 {f}곳이 계약을 따낸 사실이 드러났습니다. 불량 물품 {x} 세트가 회수돼 그만큼 대피소 공급이 줄었습니다."
    },
    reserve: {
      good: "미리 확보한 자재가 복구 현장에 바로 투입됐습니다. 가격 급등에도 예산 부담을 줄였다는 평가입니다.",
      mid: "필요한 자재의 일부만 확보됐습니다. 현장에서는 남은 구간 공사를 내일로 미뤘습니다.",
      bad: "자재를 구하지 못해 복구가 멈췄습니다. 비싼 값에 뒤늦게 사들여야 할 처지입니다."
    },
    innovation: {
      good: "조달청이 지원한 혁신기업의 드론이 끊긴 길 대신 하늘로 약과 식수를 나르고 있습니다.",
      mid: "지원 규모가 작아 하루 운송량이 제한적입니다. 나머지 마을은 헬기 순서를 기다립니다.",
      bad: "헬기만으로는 역부족입니다. 재난 전에 대체 운송 수단을 확보했어야 한다는 지적이 나옵니다."
    }
  };
  const NIGHT_HEADS = {
    good: [null, { scene: "truck", title: "구호 손길 닿기 시작…대피소에 온기" }, { scene: "bridge", title: "여진 뚫고 복구 속도전…길이 열린다" }, { scene: "shelter", title: "임시주거 입주 시작…일상이 보인다" }],
    mid: [null, { scene: "shelter", title: "구호 시작됐지만 곳곳 '빈틈'" }, { scene: "bridge", title: "복구 '절반의 속도'…현장은 아직 목마르다" }, { scene: "shelter", title: "길어지는 대피소 생활…지쳐 가는 시민들" }],
    bad: [null, { scene: "warehouse", title: "멈춰 선 구호…대피소 '빈손'" }, { scene: "quake", title: "여진에 속수무책…시민 불안 확산" }, { scene: "quake", title: "\"우리는 잊혔나\" 분노로 번진 불안" }]
  };

  const CITIZENS = {
    contract: {
      id: "evacuee", name: "박영순", role: "67세 · 대피소 이재민",
      quotes: {
        good: ["담요랑 따뜻한 밥이 제때 와서 한숨 돌렸어요.", "나라가 우리를 잊지 않았구나 싶어요.", "손주가 오늘은 웃으면서 잠들었어요."],
        mid: ["물은 왔는데 담요가 모자라 번갈아 덮어요.", "기다리면 온다니 믿어 봐야죠.", "조금만 더 빨랐으면 좋겠어요."],
        bad: ["이틀째 찬 바닥에서 자요. 물품은 언제 옵니까.", "받은 상자를 열어 보니 못 쓰는 물건이었어요.", "도대체 세금은 어디에 쓰는 겁니까."]
      }
    },
    reserve: {
      id: "driver", name: "최동훈", role: "42세 · 구호 화물기사",
      quotes: {
        good: ["길이 뚫려서 오늘만 세 번 왕복했습니다.", "복구 자재가 바로바로 와서 공사가 빨라요.", "이 속도면 금방 다 나릅니다."],
        mid: ["우회로로 돌아가느라 시간이 두 배 걸려요.", "자재가 늦게 와서 반나절을 기다렸습니다.", "기름 넣을 곳 찾는 게 일이에요."],
        bad: ["다리가 그대로라 차를 돌렸습니다.", "자재가 없어 인부들도 손을 놓고 있어요.", "실어도 갈 길이 없습니다."]
      }
    },
    innovation: {
      id: "nurse", name: "한지우", role: "29세 · 응급 간호사",
      quotes: {
        good: ["드론이 인슐린을 내려줬을 때 다들 박수 쳤어요.", "고립 마을 환자 처방약이 오늘 도착했습니다.", "이제 약이 떨어질 걱정은 덜었어요."],
        mid: ["드론이 오긴 하는데 하루 한 번이라 빠듯해요.", "급한 약부터 나눠 쓰고 있습니다.", "헬기 순서를 기다리는 환자가 아직 있어요."],
        bad: ["산 너머 마을엔 사흘째 약이 못 들어갔어요.", "헬기는 날씨 때문에 못 뜬대요. 방법이 없습니다.", "환자를 업고 내려오는 수밖에 없었어요."]
      },
      first: { good: "내일부터 드론으로 약이 온다니 버텨 볼게요.", mid: "드론이 몇 대라도 온다니 다행이에요.", bad: "산 너머 마을엔 약이 들어갈 길이 없어요." }
    }
  };

  const MOOD_TEXT = { joy: "환호", relief: "안도", worry: "불안", upset: "불만", angry: "분노" };
  const TIER_TEXT = { good: "잘했어요", mid: "아쉬워요", bad: "위기예요" };

  /* ═════════════ 2. 계산 로직 (화면과 무관) ═════════════ */

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const num = (v, fb) => (typeof v === "number" && isFinite(v) ? v : fb);
  const tier = (q) => (q >= 0.75 ? "good" : q >= 0.4 ? "mid" : "bad");
  const droneTier = (lv) => (lv >= 0.75 ? "good" : lv > 0 ? "mid" : "bad");
  const pick = (list, seed) => list[Math.abs(seed) % list.length];
  const dLabel = (day) => (day <= QUAKE.day ? "D-DAY" : "D+" + (day - QUAKE.day));
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const sets = (n) => (n >= 10 ? Math.floor(n / 10) + "만" + (n % 10 ? " " + (n % 10) + "천" : "") : n + "천"); // 천 세트 단위 → "2만 5천"
  // 그날까지 기대할 수 있는 최선의 진척도 대비 수준
  const paceTier = (day, progress) => { const r = progress / [10, 33, 58, 79, 100][day - 1]; return r >= 0.75 ? "good" : r >= 0.45 ? "mid" : "bad"; };
  const fill = (s, v) => s.replace(/\{(\w)\}/g, (m, k) => (k in v ? v[k] : m));

  /**
   * 다른 탭의 하루 결과를 0~1 품질값으로 바꾼다.
   * raw = {
   *   contract:   { correct, ordinaryWrong, falseApproval }                    // 2번: 오늘 판정 건수
   *   reserve:    { requiredQuantity, availableQuantity } | { fulfillment }    // 3번
   *   innovation: { decision: "success"|"partial"|"failure" } | { drone: boolean } // 4번
   * }
   */
  function normalizeInputs(raw) {
    raw = raw || {};
    const out = { contractQ: null, reserveQ: null, innovationQ: null, falseApprovals: 0, incomplete: [] };
    // 호스트가 "오늘 이 업무를 마치지 못했다"고 알리면 앞날 값을 물려받지 않고 실패로 처리한다.
    if (Array.isArray(raw.incomplete)) out.incomplete = raw.incomplete.filter((k) => k === "reserve" || k === "innovation");
    const c = raw.contract;
    if (c) {
      const ok = num(c.correct, 0), wrong = num(c.ordinaryWrong, 0), fake = num(c.falseApproval, 0);
      const total = ok + wrong + fake + num(c.unresolved, 0);
      if (total > 0) out.contractQ = clamp((ok - 0.5 * fake) / total, 0, 1);
      out.falseApprovals = fake;
    }
    const r = raw.reserve;
    if (r) {
      if (typeof r.fulfillment === "number") out.reserveQ = clamp(r.fulfillment, 0, 1);
      else if (num(r.requiredQuantity, 0) > 0) out.reserveQ = clamp(num(r.availableQuantity, 0) / r.requiredQuantity, 0, 1);
    }
    const i = raw.innovation;
    if (i) {
      const map = { success: 1, partial: 0.5, failure: 0 };
      if (i.decision in map) out.innovationQ = map[i.decision];
      else if (typeof i.drone === "boolean") out.innovationQ = i.drone ? 1 : 0;
    }
    return out;
  }

  const freshState = () => ({ inputs: {}, raw: {}, nights: {}, seenMorning: 0, routeAcc: 0, droneAcc: 0, droneLevel: 0 });

  function progressOf(metrics) {
    return Math.round((metrics.reduce((a, m) => a + Math.min(m.achieved / m.target, 1), 0) / metrics.length) * 100);
  }

  /** 그날 아침 자재 가격 지수. 전날 비축 대응이 부족했으면 철강·시멘트가 최대 6%p 더 오른다. */
  function getMarket(st, day) {
    day = clamp(day, 1, DAYS);
    const penaltyOf = (d) => {
      const prev = st.inputs[d - 1];
      return d > QUAKE.day && prev && prev.reserveQ != null ? Math.round((1 - prev.reserveQ) * 6) : 0;
    };
    const indexOf = (m, d) => PRICE_INDEX[d][m.id] + (m.id === "steel" || m.id === "cement" ? penaltyOf(d) : 0);
    return MATERIALS.map((m) => {
      const history = [];
      for (let d = 1; d <= day; d++) history.push(indexOf(m, d));
      const index = history[history.length - 1];
      return { id: m.id, label: m.label, icon: m.icon, index, change: day === 1 ? 0 : index - history[history.length - 2], history };
    });
  }

  function effectiveInputs(st, day, scores) {
    const cur = st.inputs[day] || {}, prev = st.inputs[day - 1] || {};
    const resolve = (key, scoreKey) => {
      if (cur[key] != null) return cur[key];
      if (scores && typeof scores[scoreKey] === "number") return clamp(scores[scoreKey] / 100, 0, 1);
      if (prev[key] != null) return prev[key];
      return 0.5;
    };
    return {
      contractQ: resolve("contractQ", "integrity"), reserveQ: resolve("reserveQ", "economicDefense"),
      innovationQ: resolve("innovationQ", "innovation"), falseApprovals: cur.falseApprovals || 0
    };
  }

  function computeNight(st, day, scores) {
    const q = effectiveInputs(st, day, scores);
    const idx = day - 1, prev = st.nights[day - 1];
    const base = {};
    OBJECTIVES.forEach((o) => { base[o.id] = 0; });
    if (prev) prev.metrics.forEach((m) => { base[m.id] = m.achieved; });

    // 한 번 키운 기업은 계속 조력자로 남는다 (최고 수준 유지)
    st.droneLevel = Math.max(st.droneLevel || 0, q.innovationQ);
    const supply = 0.3 + 0.7 * (0.6 * q.contractQ + 0.4 * q.reserveQ);

    let reliefGain = Math.round(PERFECT.relief[idx] * supply);
    const defect = Math.min(reliefGain, q.falseApprovals * 4); // 부실 업체 납품분은 불량으로 회수
    reliefGain -= defect;

    st.routeAcc = (st.routeAcc || 0) + 0.3 + 0.7 * q.reserveQ;
    const routes = clamp(Math.floor(st.routeAcc + 1e-9), 0, 5);

    // 드론이 없으면 헬기로 이틀에 한 곳만 닿는다
    st.droneAcc = (st.droneAcc || 0) + (st.droneLevel > 0 ? PERFECT.drone[idx] * st.droneLevel : day >= 3 ? 0.5 : 0);
    const drone = clamp(Math.floor(st.droneAcc + 1e-9), 0, 10);

    const cityQ = (clamp((supply - 0.3) / 0.7, 0, 1) + q.reserveQ + st.droneLevel) / 3;
    const cityGain = Math.round(PERFECT.city[idx] * (0.25 + 0.75 * cityQ));

    const achieved = {
      "relief-supplies": clamp(base["relief-supplies"] + reliefGain, 0, 100),
      "routes": Math.max(base["routes"], routes),
      "drone-deliveries": Math.max(base["drone-deliveries"], drone),
      "city-recovery": clamp(base["city-recovery"] + cityGain, 0, 100)
    };
    const metrics = OBJECTIVES.map((o) => ({ id: o.id, label: o.label, icon: o.icon, target: o.target, unit: o.unit, achieved: achieved[o.id], prev: base[o.id], delta: achieved[o.id] - base[o.id] }));
    const progress = progressOf(metrics);
    const satisfaction = Math.round(clamp(
      28 + 62 * (0.35 * q.contractQ + 0.3 * q.reserveQ + 0.2 * st.droneLevel + 0.15 * (progress / 100)) - 9 * q.falseApprovals, 5, 98));
    const mood = satisfaction >= 80 ? "joy" : satisfaction >= 62 ? "relief" : satisfaction >= 45 ? "worry" : satisfaction >= 28 ? "upset" : "angry";
    return { day, q, droneLevel: st.droneLevel, metrics, progress, satisfaction, mood, defect };
  }

  function inputText(key, raw, r) {
    const v = raw && raw[key];
    if (key === "contract") {
      if (!v) return "오늘 심사 기록이 없어요";
      const ok = num(v.correct, 0), wrong = num(v.ordinaryWrong, 0), fake = num(v.falseApproval, 0), un = num(v.unresolved, 0);
      return "심사 " + (ok + wrong + fake + un) + "건 · 정확 " + ok + "건" + (wrong ? " · 오반려 " + wrong + "건" : "") + (fake ? " · 부실 승인 " + fake + "건" : "") + (un ? " · 미처리 " + un + "건" : "");
    }
    const inc = (raw && raw.incomplete) || [];
    if (key === "reserve") return inc.indexOf("reserve") >= 0 ? "오늘 비축 업무를 마치지 못했어요" : v ? "필요한 자재의 " + Math.round(r.q.reserveQ * 100) + "% 확보" : "오늘 비축 기록이 없어요";
    if (key === "innovation" && inc.indexOf("innovation") >= 0) return r.droneLevel > 0 ? "오늘은 새 지원을 정하지 못했어요 · 앞서 지원한 기업은 활약 중" : "오늘 지원 결정을 마치지 못했어요";
    if (v && v.decision) return { success: "혁신제품 판단이 좋은 결과로 이어졌어요", partial: "판단이 절반의 성과에 그쳤어요", failure: "판단이 성과로 이어지지 못했어요" }[v.decision];
    if (v && typeof v.drone === "boolean") return v.drone ? "운송 드론 기업을 지원했어요" : "운송 드론 지원을 보류했어요";
    return r.droneLevel > 0 ? "앞서 지원한 기업이 활약 중이에요" : "오늘 지원 평가가 없어요";
  }

  /** 업무 3개 각각의 "내 선택 → 현장 결과 → 시민 반응" */
  function buildCauses(st, r) {
    const m = {}; r.metrics.forEach((x) => { m[x.id] = x; });
    const idx = r.day - 1, raw = st.raw[r.day] || {};
    const defs = [
      { key: "contract", metric: m["relief-supplies"], t: r.q.falseApprovals > 0 ? "fake" : num(raw.contract && raw.contract.unresolved, 0) > 0 && tier(r.q.contractQ) !== "good" ? "pending" : tier(r.q.contractQ), scenes: { good: "truck", mid: "truck", bad: "warehouse", fake: "office", pending: "office" } },
      { key: "reserve", metric: m["routes"], t: tier(r.q.reserveQ), scenes: { good: "bridge", mid: "bridge", bad: "warehouse" } },
      { key: "innovation", metric: m["drone-deliveries"], t: droneTier(r.droneLevel), scenes: { good: "drone", mid: "drone", bad: "mountain" } }
    ];
    return defs.map((d, i) => {
      const money = d.key === "contract";
      const vars = { d: money ? sets(d.metric.delta) : d.metric.delta, a: money ? sets(d.metric.achieved) : d.metric.achieved, x: sets(r.defect), f: r.q.falseApprovals, u: num(raw.contract && raw.contract.unresolved, 0), n: d.metric.target - d.metric.achieved };
      const t3 = d.t === "fake" ? "bad" : d.t === "pending" ? "mid" : d.t;
      const person = CITIZENS[d.key];
      const quote = r.day === QUAKE.day && person.first ? person.first[t3] : pick(person.quotes[t3], r.day + i);
      const face = t3 === "good" ? (r.satisfaction >= 80 ? "joy" : "relief") : t3 === "mid" ? "worry" : r.satisfaction < 28 ? "angry" : "upset";
      return {
        key: d.key, tab: TABS[d.key].label, icon: TABS[d.key].icon, tier: t3, tierText: TIER_TEXT[t3],
        input: inputText(d.key, raw, r), cat: { contract: "계약", reserve: "경제", innovation: "혁신" }[d.key],
        tone: t3 === "good" ? "good" : t3 === "mid" ? "neutral" : "bad", scene: d.scenes[d.t],
        title: fill(NIGHT_TITLES[d.key][d.t][idx], vars), body: fill(NIGHT_BODIES[d.key][d.t], vars),
        metric: { id: d.metric.id, label: d.metric.label, achieved: d.metric.achieved, target: d.metric.target, delta: d.metric.delta, unit: d.metric.unit },
        citizen: { id: person.id, name: person.name, role: person.role, mood: face, quote }
      };
    });
  }

  function nightHeadline(r) {
    const p = r.progress, d = dLabel(r.day), city = r.metrics[3].achieved;
    if (r.day === QUAKE.day) {
      return { tag: "호외", scene: "quake", title: QUAKE.city + " 규모 " + QUAKE.magnitude + " 강진…도로·교량 붕괴", body: "오늘 밤 " + QUAKE.time + " " + QUAKE.city + "에서 강한 지진이 발생했습니다. 보급로 5개 노선이 모두 끊겼고 산간 마을 10곳이 고립됐습니다. 낮 동안의 준비가 첫날 밤 대응을 갈랐습니다." };
    }
    const t = paceTier(r.day, r.progress);
    const h = NIGHT_HEADS[t][Math.min(r.day - 1, 3)];
    const body = { good: "구호와 복구가 계획대로 진행되고 있습니다.", mid: "일부 지역은 안정을 찾았지만 지원이 닿지 않은 곳도 남아 있습니다.", bad: "물품과 자재가 제때 닿지 않아 현장이 멈춰 있습니다." }[t];
    return { tag: "저녁", scene: h.scene, title: d + " " + h.title, body: body + " 재난 대응 진척도는 " + p + "%, 도시 복구율은 " + city + "%입니다." };
  }

  function statusText(r) {
    if (r.day === QUAKE.day) return QUAKE.status;
    if (r.progress >= 85) return "주요 기능 대부분 복구";
    if (r.metrics[1].achieved >= 3) return "주요 보급로 일부 복구";
    if (r.progress >= 30) return "구호 진행 중 · 보급로 복구 지연";
    return "구호 지연 · 고립 지역 다수";
  }

  /** 엔딩에서 보여 줄 "결정적 순간" 최대 3개 */
  function turningPoints(st) {
    const out = [];
    let best = null, firstFake = null, droneDay = null, worstReserve = null;
    for (let d = 1; d <= DAYS; d++) {
      const n = st.nights[d]; if (!n) continue;
      const prevP = st.nights[d - 1] ? st.nights[d - 1].progress : 0;
      const gain = n.progress - prevP;
      if (!best || gain > best.gain) best = { d, gain };
      if (!firstFake && n.inputs.falseApprovals > 0) firstFake = { d, x: n.defect };
      if (!droneDay && n.droneLevel > 0) droneDay = { d, lv: n.droneLevel };
      if (n.inputs.reserveQ < 0.4 && (!worstReserve || n.inputs.reserveQ < worstReserve.q)) worstReserve = { d, q: n.inputs.reserveQ };
    }
    if (firstFake) out.push({ tone: "bad", day: firstFake.d, text: "부실 업체를 승인해 구호물품 " + sets(firstFake.x) + " 세트가 회수됐어요." });
    if (droneDay) out.push({ tone: "good", day: droneDay.d, text: "운송 드론 기업을 지원해 고립 마을에 하늘길이 열렸어요." });
    else out.push({ tone: "bad", day: 1, text: "드론 기업을 키우지 못해 고립 마을이 끝까지 발이 묶였어요." });
    if (worstReserve) out.push({ tone: "bad", day: worstReserve.d, text: "자재를 " + Math.round(worstReserve.q * 100) + "%만 확보해 보급로 복구가 멈췄어요." });
    if (best && out.length < 3) out.push({ tone: "good", day: best.d, text: "하룻밤 새 진척도가 " + best.gain + "%p 올랐어요. 가장 크게 나아간 날이에요." });
    return out.slice(0, 3).sort((a, b) => a.day - b.day);
  }

  function buildNightNews(st, day, scores) {
    const r = computeNight(st, day, scores);
    const prev = st.nights[day - 1];
    const ending = day === DAYS;
    const causes = buildCauses(st, r);
    const news = {
      type: ending ? "ending" : "night", day, dLabel: dLabel(day), time: day === QUAKE.day ? QUAKE.time : "21:00", quake: day === QUAKE.day,
      headline: nightHeadline(r), causes,
      articles: causes.map((c) => ({ cat: c.cat, tone: c.tone, scene: c.scene, title: c.title, body: c.body })),
      citizens: causes.map((c) => c.citizen),
      satisfaction: r.satisfaction, satisfactionDelta: prev ? r.satisfaction - prev.satisfaction : null, mood: r.mood, moodText: MOOD_TEXT[r.mood],
      metrics: r.metrics, progress: r.progress, progressDelta: r.progress - (prev ? prev.progress : 0), recovery: r.metrics[3].achieved,
      status: statusText(r), inputs: r.q, droneLevel: r.droneLevel, defect: r.defect
    };
    const goods = causes.filter((c) => c.tier === "good").length, bads = causes.filter((c) => c.tier === "bad").length;
    const overall = bads >= 2 ? "bad" : goods >= 2 && !bads ? "good" : "mid"; // 오늘 하루에 대한 달이의 반응
    news.dariMood = day === QUAKE.day ? "worry" : { good: "happy", mid: "calm", bad: "sad" }[overall];
    news.dari = [
      day === QUAKE.day ? "지, 지진이에요…! 침착하게 상황을 전해 드릴게요." : "오늘 하루도 수고했어요. 저녁 뉴스예요.",
      { good: "주무관님의 선택이 현장에서 이렇게 돌아왔어요!", mid: "잘된 곳도, 아쉬운 곳도 있어요. 하나씩 볼까요?", bad: "어디서 막혔는지 같이 살펴봐요." }[overall],
      { good: "시민들 표정이 밝아졌어요. 내일도 이대로!", mid: "내일 만회할 기회가 있어요. 힘내요!", bad: "시민들이 많이 힘들어해요. 내일은 꼭 달라져야 해요." }[overall]
    ];
    if (ending) {
      const e = r.progress >= 85 ? { rank: "best", title: "골든타임을 지켰다", body: "닷새 만에 " + QUAKE.city + "가 일상을 되찾았습니다. 투명한 계약과 준비된 비축, 미리 키운 혁신기업이 만든 결과입니다." }
        : r.progress >= 55 ? { rank: "normal", title: "절반의 회복", body: QUAKE.city + "는 고비를 넘겼지만 아직 도움을 기다리는 시민이 있습니다. 몇 번의 선택이 달랐다면 더 빨랐을 것입니다." }
          : { rank: "bad", title: "늦어진 복구", body: "닷새가 지났지만 " + QUAKE.city + "의 복구는 더딥니다. 조달의 빈틈이 시민의 일상으로 이어졌습니다." };
      news.ending = e;
      news.headline = { tag: "특집", scene: e.rank === "bad" ? "quake" : e.rank === "best" ? "sunrise" : "city", title: "[재난 대응 종합] " + e.title, body: e.body };
      news.dariMood = { best: "happy", normal: "calm", bad: "sad" }[e.rank];
      news.dari[0] = "닷새간의 재난 대응을 종합해 전해 드릴게요.";
      news.dari[2] = "해원시의 복구 상황을 함께 확인해 봐요.";
      news.dari[3] = { best: "정말 멋졌어요, 주무관님! 해원시가 다시 웃고 있어요.", normal: "수고했어요. 다음엔 더 많은 시민을 지킬 수 있을 거예요.", bad: "아쉬움이 크지만, 무엇이 중요했는지 알게 됐어요. 다시 도전해 봐요!" }[e.rank];
    }
    return news;
  }

  /** 엔딩 뉴스에 5일 기록을 붙인다 (5일차 밤이 st.nights에 저장된 뒤 호출) */
  function attachHistory(st, news) {
    news.history = [];
    for (let d = 1; d <= DAYS; d++) if (st.nights[d]) news.history.push({ day: d, progress: st.nights[d].progress, satisfaction: st.nights[d].satisfaction });
    news.turningPoints = turningPoints(st);
    return news;
  }

  /** queueMorningOutcome()에 넣는 구조화 결과 */
  function toMorningOutcome(st, news) {
    return {
      source: "night-news-outcome",
      label: news.day + "일차 밤 결과 및 " + (news.day + 1) + "일차 아침 반영 자료",
      disasterStatus: news.status,
      disasterMetrics: news.metrics.map((m) => ({ id: m.id, achieved: m.achieved })),
      details: {
        newsInputs: { supplyChain: news.articles[0].title, materialMarket: news.articles[1].title, innovation: news.articles[2].title, citizenSatisfaction: news.satisfaction },
        effects: { nextDayDeliveryCapacity: news.metrics[0].achieved, openRoutes: news.metrics[1].achieved, droneLevel: st.droneLevel, market: getMarket(st, news.day + 1).map((m) => ({ id: m.id, label: m.label, index: m.index, change: m.change })) }
      }
    };
  }

  function buildMorningNews(st, day) {
    day = clamp(day, 1, DAYS);
    const base = MORNING[day], market = getMarket(st, day), last = st.nights[day - 1];
    const news = {
      type: "morning", day, dLabel: day > QUAKE.day ? dLabel(day) : "D-1", time: "08:30",
      headline: { tag: base.tag, scene: base.scene, title: base.title, body: base.body },
      articles: clone(base.articles), ticker: base.ticker.slice(), market, dari: base.dari.slice(), dariMood: day === 1 || day === 5 ? "happy" : "calm",
      hints: Object.keys(TABS).map((k) => ({ key: k, tab: TABS[k].label, icon: TABS[k].icon, effect: TABS[k].effect, text: base.hints[k] }))
    };
    const moved = market.filter((m) => m.change !== 0).map((m) => m.label + " " + (m.change > 0 ? "▲" : "▼") + Math.abs(m.change));
    if (moved.length) news.ticker[1] = "원자재 지수 " + moved.join(" · ");
    news.ticker = news.ticker.filter(Boolean);
    if (last) {
      news.metrics = last.metrics; news.progress = last.progress; news.status = last.status; news.satisfaction = last.satisfaction;
      news.articles.unshift({
        cat: "밤사이", tone: last.satisfaction >= 62 ? "good" : last.satisfaction >= 45 ? "neutral" : "bad", scene: last.satisfaction >= 45 ? "shelter" : "warehouse",
        title: "밤사이 구호 현황: 진척도 " + last.progress + "% · 시민 만족도 " + last.satisfaction + "%",
        body: "구호물품 누적 " + sets(last.metrics[0].achieved) + " 세트, 보급로 " + last.metrics[1].achieved + "/5개 노선, 고립 마을 지원 " + last.metrics[2].achieved + "/10곳입니다. 어젯밤 주요 소식은 \"" + last.articles[0].title + "\"였습니다."
      });
      news.ticker.unshift("재난 대응 진척도 " + last.progress + "% (" + last.status + ")");
      const prevIn = st.inputs[day - 1];
      if (prevIn && prevIn.reserveQ != null && prevIn.reserveQ < 0.5) news.ticker.push("공공 비축 방출 부족에 철강·시멘트 추가 상승");
    }
    return news;
  }

  /* ═════════════ 3. 그림 (SVG) ═════════════ */

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const SCENES = {
    city: '<rect width="200" height="120" fill="#a8d4fb"/><circle cx="162" cy="26" r="15" fill="#ffe69a"/><ellipse cx="46" cy="24" rx="20" ry="7" fill="#fff" opacity=".8"/><ellipse cx="112" cy="16" rx="14" ry="5" fill="#fff" opacity=".7"/><rect x="8" y="52" width="26" height="68" fill="#5b7fc7"/><rect x="40" y="32" width="30" height="88" fill="#2b3a67"/><rect x="76" y="58" width="24" height="62" fill="#7d9de0"/><rect x="106" y="42" width="34" height="78" fill="#3d568f"/><rect x="146" y="64" width="42" height="56" fill="#5b7fc7"/><g fill="#ffe69a" opacity=".85"><rect x="46" y="40" width="5" height="6"/><rect x="58" y="40" width="5" height="6"/><rect x="46" y="54" width="5" height="6"/><rect x="58" y="68" width="5" height="6"/><rect x="113" y="52" width="6" height="7"/><rect x="126" y="52" width="6" height="7"/><rect x="113" y="68" width="6" height="7"/><rect x="14" y="62" width="5" height="6"/><rect x="154" y="74" width="6" height="6"/><rect x="170" y="74" width="6" height="6"/></g><rect x="0" y="108" width="200" height="12" fill="#e5eefb"/><circle cx="24" cy="106" r="7" fill="#6dbb7a"/><circle cx="178" cy="106" r="7" fill="#6dbb7a"/>',
    sunrise: '<rect width="200" height="120" fill="#ffd9a0"/><rect width="200" height="60" fill="#ffc37a" opacity=".6"/><circle cx="100" cy="92" r="40" fill="#fff0b8"/><circle cx="100" cy="92" r="27" fill="#ffdf7a"/><rect x="10" y="60" width="26" height="60" fill="#4a6fb5"/><rect x="42" y="44" width="28" height="76" fill="#2b3a67"/><rect x="132" y="50" width="30" height="70" fill="#3d568f"/><rect x="166" y="66" width="26" height="54" fill="#4a6fb5"/><g fill="#fff3c4"><rect x="48" y="52" width="5" height="6"/><rect x="59" y="52" width="5" height="6"/><rect x="139" y="60" width="6" height="7"/><rect x="150" y="60" width="6" height="7"/><rect x="16" y="70" width="5" height="6"/></g><rect x="0" y="108" width="200" height="12" fill="#7fb08a"/>',
    quake: '<rect width="200" height="120" fill="#7f8aa3"/><circle cx="166" cy="34" r="22" fill="#b9bfcc" opacity=".65"/><circle cx="146" cy="46" r="14" fill="#c9ced9" opacity=".65"/><circle cx="40" cy="22" r="12" fill="#aab1c2" opacity=".5"/><rect x="12" y="48" width="30" height="72" fill="#3d4a66" transform="rotate(-8 27 120)"/><rect x="58" y="28" width="36" height="92" fill="#2b3550"/><path d="M78 28l6 28-10 18 9 20-5 26" stroke="#ffc94a" stroke-width="2.6" fill="none"/><g fill="#55607c"><rect x="64" y="38" width="6" height="7"/><rect x="64" y="56" width="6" height="7"/><rect x="84" y="74" width="6" height="7"/></g><rect x="112" y="62" width="30" height="58" fill="#4a5777" transform="rotate(10 127 120)"/><path d="M0 106h64l12-10 16 14 20-12 14 8h74v14H0z" fill="#5b4a43"/><path d="M96 120l6-12 10 4 6-8" stroke="#2f2622" stroke-width="2" fill="none"/><g fill="#e5484d"><rect x="150" y="96" width="4" height="12"/><path d="M146 96h12l-6-8z"/></g>',
    bridge: '<rect width="200" height="120" fill="#aed6f5"/><ellipse cx="40" cy="22" rx="18" ry="6" fill="#fff" opacity=".8"/><path d="M0 96q50-10 100 0t100 0v24H0z" fill="#5f9bd1"/><path d="M0 104q50-8 100 0t100 0" stroke="#8fc0ea" stroke-width="2" fill="none"/><rect x="0" y="60" width="76" height="11" fill="#4a5777"/><rect x="124" y="60" width="76" height="11" fill="#4a5777"/><rect x="80" y="70" width="26" height="10" fill="#4a5777" transform="rotate(26 93 75)"/><rect x="22" y="71" width="10" height="36" fill="#3d4a66"/><rect x="166" y="71" width="10" height="36" fill="#3d4a66"/><path d="M0 58h76M124 58h76" stroke="#ffc94a" stroke-width="2" stroke-dasharray="6 5"/><rect x="134" y="44" width="24" height="16" rx="2" fill="#ffc94a"/><rect x="158" y="34" width="5" height="26" fill="#e5a100"/><path d="M160 34l-22-8" stroke="#e5a100" stroke-width="3"/><circle cx="140" cy="60" r="4" fill="#222b40"/><circle cx="154" cy="60" r="4" fill="#222b40"/>',
    truck: '<rect width="200" height="120" fill="#d3e9fc"/><ellipse cx="150" cy="24" rx="22" ry="7" fill="#fff" opacity=".85"/><path d="M0 80q40-18 80-6t120-10v30H0z" fill="#b5dcae"/><rect x="0" y="92" width="200" height="28" fill="#7c8aa5"/><path d="M0 106h200" stroke="#fff" stroke-width="2" stroke-dasharray="12 10" opacity=".7"/><rect x="30" y="44" width="88" height="48" rx="4" fill="#4a6fb5"/><rect x="36" y="50" width="76" height="14" fill="#6c8fd6"/><path d="M118 58h30l18 20v14h-48z" fill="#2b3a67"/><path d="M126 64h18l11 13h-29z" fill="#d3e9fc"/><circle cx="60" cy="94" r="11" fill="#222b40"/><circle cx="60" cy="94" r="4.5" fill="#9aa6c0"/><circle cx="144" cy="94" r="11" fill="#222b40"/><circle cx="144" cy="94" r="4.5" fill="#9aa6c0"/><circle cx="74" cy="76" r="11" fill="#fff"/><path d="M68 76h12M74 70v12" stroke="#e5484d" stroke-width="4"/>',
    drone: '<rect width="200" height="120" fill="#c2e3fb"/><ellipse cx="38" cy="26" rx="20" ry="7" fill="#fff" opacity=".85"/><ellipse cx="166" cy="40" rx="16" ry="6" fill="#fff" opacity=".7"/><path d="M0 120l44-50 30 28 36-44 90 66z" fill="#7fb08a"/><path d="M110 54l-10 14 20 2z" fill="#fff" opacity=".8"/><rect x="80" y="32" width="40" height="15" rx="7.5" fill="#2b3a67"/><circle cx="100" cy="39.500" r="4" fill="#8fd0ff"/><path d="M80 36l-18-6M120 36l18-6" stroke="#2b3a67" stroke-width="4" stroke-linecap="round"/><ellipse cx="60" cy="28" rx="15" ry="3" fill="#2b3a67" opacity=".45"/><ellipse cx="140" cy="28" rx="15" ry="3" fill="#2b3a67" opacity=".45"/><path d="M100 47v12" stroke="#2b3a67" stroke-width="2"/><rect x="89" y="59" width="22" height="17" rx="2" fill="#ffc94a"/><path d="M95 67.500h10M100 62.500v10" stroke="#e5484d" stroke-width="3"/><rect x="24" y="100" width="14" height="12" fill="#fff"/><path d="M22 100l9-8 9 8z" fill="#e5484d"/>',
    mountain: '<rect width="200" height="120" fill="#b9c6d8"/><ellipse cx="60" cy="24" rx="30" ry="9" fill="#dfe5ee"/><ellipse cx="150" cy="34" rx="26" ry="8" fill="#dfe5ee"/><path d="M0 120l50-64 34 40 34-52 82 76z" fill="#6f8f78"/><path d="M118 44l-12 18 24 4z" fill="#eef2f6"/><rect x="34" y="94" width="16" height="14" fill="#f4efe6"/><path d="M31 94l11-9 11 9z" fill="#8c5a44"/><rect x="58" y="98" width="13" height="11" fill="#f4efe6"/><path d="M56 98l8.500-7 8.500 7z" fill="#8c5a44"/><path d="M96 120l10-16 14 6 10-12" stroke="#4a3b35" stroke-width="5" fill="none"/><path d="M104 96l10 10M114 96l-10 10" stroke="#e5484d" stroke-width="4" stroke-linecap="round"/>',
    warehouse: '<rect width="200" height="120" fill="#d5dae5"/><path d="M12 54l88-36 88 36v66H12z" fill="#7b8499"/><path d="M12 54l88-36 88 36" stroke="#5b6479" stroke-width="4" fill="none"/><rect x="36" y="64" width="128" height="56" fill="#2f3a55"/><path d="M36 78h128M36 92h128M36 106h128" stroke="#4a5674" stroke-width="2"/><rect x="48" y="104" width="20" height="16" fill="#c79a5b" opacity=".4"/><rect x="130" y="108" width="16" height="12" fill="#c79a5b" opacity=".3"/><circle cx="100" cy="92" r="13" fill="none" stroke="#e5484d" stroke-width="3"/><path d="M100 84v10M100 99v1" stroke="#e5484d" stroke-width="3.500" stroke-linecap="round"/>',
    market: '<rect width="200" height="120" fill="#eef3fb"/><path d="M20 30h164M20 54h164M20 78h164" stroke="#d6deee" stroke-width="1.5"/><path d="M20 100V16M20 100h168" stroke="#2b3a67" stroke-width="3" stroke-linecap="round"/><g fill="#8fb8f0"><rect x="32" y="88" width="16" height="12"/><rect x="60" y="80" width="16" height="20"/><rect x="88" y="68" width="16" height="32"/><rect x="116" y="56" width="16" height="44"/><rect x="144" y="40" width="16" height="60"/></g><path d="M26 84l28-10 24 4 26-28 24 8 36-36" stroke="#e5484d" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M148 20h18v18" stroke="#e5484d" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    shelter: '<rect width="200" height="120" fill="#c9e5f9"/><ellipse cx="46" cy="22" rx="20" ry="7" fill="#fff" opacity=".85"/><rect x="0" y="94" width="200" height="26" fill="#9cc39a"/><path d="M14 96l36-46 36 46z" fill="#4a6fb5"/><path d="M50 50l8 46H42z" fill="#3d5ea0"/><path d="M42 96l8-20 8 20z" fill="#2b3a67"/><path d="M90 96l36-46 36 46z" fill="#7d9de0"/><path d="M126 50l8 46h-16z" fill="#6687cf"/><path d="M118 96l8-20 8 20z" fill="#2b3a67"/><rect x="170" y="54" width="4" height="42" fill="#2b3a67"/><path d="M174 54h22v15h-22z" fill="#e5484d"/><path d="M181 61.500h8M185 57.500v8" stroke="#fff" stroke-width="2.500"/><rect x="72" y="100" width="16" height="12" fill="#c79a5b"/><path d="M72 106h16" stroke="#8c6a3a" stroke-width="1.500"/>',
    office: '<rect width="200" height="120" fill="#e6ecf8"/><rect x="46" y="10" width="108" height="104" rx="5" fill="#fff" stroke="#b9c6de" stroke-width="2"/><rect x="46" y="10" width="108" height="20" rx="5" fill="#4a6fb5"/><path d="M58 20h50" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M60 44h80M60 58h80M60 72h52" stroke="#9db0d2" stroke-width="5" stroke-linecap="round"/><circle cx="130" cy="92" r="17" fill="#fff" stroke="#e5484d" stroke-width="4"/><path d="M121 84l18 16M139 84l-18 16" stroke="#e5484d" stroke-width="4" stroke-linecap="round"/>'
  };
  // 팀 디자인 이미지가 생기면 create({ assets: { dari, citizens: { evacuee, driver, nurse }, scenes: { quake, ... } } })로 교체한다.
  let ASSETS = {};
  const sceneSvg = (name) => ASSETS.scenes && ASSETS.scenes[name] ? '<img class="gtn-scene" src="' + esc(ASSETS.scenes[name]) + '" alt="">' : '<svg class="gtn-scene" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + (SCENES[name] || SCENES.city) + "</svg>";

  /*
   * 캐릭터 그림체: 3D 장난감(비닐 피규어) 느낌.
   * 외곽선 대신 면마다 방사형 그라데이션으로 부피를 주고, 흐린 흰 하이라이트와 바닥 그림자, 눈 광택을 얹는다.
   * 그라데이션 정의는 문서에 한 번만 넣는다(ensureDefs). 숨겨진 SVG 안의 정의는 브라우저가 무시하기 때문이다.
   */
  const TONES = {
    orange: ["#ffcf94", "#f59a3c", "#c9651a"], orangeD: ["#f9ad5c", "#e37f25", "#ad5410"], cream: ["#ffffff", "#fff1d6", "#e8cb9c"],
    navy: ["#6177bb", "#33457a", "#1b2650"], skin: ["#fff3e8", "#fdd9bf", "#ecae8e"], skinR: ["#ffe2d6", "#f7b9a6", "#dd8a78"],
    gray: ["#f4f5f8", "#c3c7d1", "#8c92a1"], brown: ["#a87558", "#6b4532", "#41261a"], purple: ["#decbf3", "#b08fd6", "#7f5fa8"],
    mint: ["#d3f6f0", "#8fd6cc", "#57a79c"], yellow: ["#fff3ae", "#ffd23f", "#dc9c00"], cap: ["#7389cb", "#3a4c86", "#202b58"],
    white: ["#ffffff", "#f3f5fb", "#c5cde0"], paw: ["#ffdcab", "#fbb866", "#dc8c34"], shawl: ["#fffaf0", "#f6e7c8", "#d9c296"]
  };
  function defsSvg() {
    return '<svg id="gtn-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>' +
      Object.keys(TONES).map((k) => '<radialGradient id="gtnG-' + k + '" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="' + TONES[k][0] + '"/><stop offset=".55" stop-color="' + TONES[k][1] + '"/><stop offset="1" stop-color="' + TONES[k][2] + '"/></radialGradient>').join("") +
      '<filter id="gtnBlur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.400"/></filter><filter id="gtnBlur2" x="-60%" y="-120%" width="220%" height="340%"><feGaussianBlur stdDeviation="4"/></filter></defs></svg>';
  }
  function ensureDefs() {
    if (typeof document !== "undefined" && !document.getElementById("gtn-defs")) document.body.insertAdjacentHTML("beforeend", defsSvg());
  }
  const G = (k) => "url(#gtnG-" + k + ")";
  const HI = (cx, cy, rx, ry, o, rot) => '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" opacity="' + o + '" filter="url(#gtnBlur)" transform="rotate(' + (rot || 0) + " " + cx + " " + cy + ')"/>';
  const FACE = '<g stroke="#5a3226" stroke-width="2.800" stroke-linejoin="round" stroke-linecap="round">';
  const EMOTE = {
    bars: (x, y) => '<rect x="' + x + '" y="' + y + '" width="8" height="17" rx="3" fill="' + G("yellow") + '" transform="rotate(-20 ' + (x + 4) + " " + (y + 8) + ')"/><rect x="' + (x + 13) + '" y="' + (y + 7) + '" width="8" height="15" rx="3" fill="' + G("yellow") + '" transform="rotate(30 ' + (x + 17) + " " + (y + 14) + ')"/>',
    drops: (x, y) => '<path d="M' + x + " " + y + 'q9 9 3 15q-9-2-3-15z" fill="#7cc0ff"/><path d="M' + (x + 12) + " " + (y + 10) + 'q6 6 2 10q-6-1-2-10z" fill="#7cc0ff"/><circle cx="' + (x + 2.500) + '" cy="' + (y + 9) + '" r="1.300" fill="#fff"/>',
    scribble: (x, y) => '<path d="M' + x + " " + (y + 10) + 'c0-10 15-12 17-2s-13 14-15 4 10-10 11-3-8 6-8 1" fill="none" stroke="#6a6578" stroke-width="2.400" stroke-linecap="round"/>',
    sparkle: (x, y) => '<path d="M' + (x + 9) + " " + y + 'l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="' + G("yellow") + '"/>',
    bang: (x, y) => '<path d="M' + (x + 4) + " " + y + 'h8l-2 15h-4z" fill="#e5484d"/><circle cx="' + (x + 8) + '" cy="' + (y + 21) + '" r="3.600" fill="#e5484d"/>'
  };
  // 얼굴 공통: 눈 중심 (ex1, ex2, ey), 입 중심 (mx, my)
  function faceParts(mood, ex1, ex2, ey, mx, my, small) {
    const rx = small ? 4 : 5.200, ry = small ? 6.500 : 8.600;
    const oval = (cx) => '<ellipse cx="' + cx + '" cy="' + ey + '" rx="' + rx + '" ry="' + ry + '" fill="#2a1c1a" stroke="none"/><circle cx="' + (cx + 1.700) + '" cy="' + (ey - ry * 0.42) + '" r="' + (small ? 1.700 : 2.400) + '" fill="#fff" stroke="none"/><circle cx="' + (cx - 1.800) + '" cy="' + (ey + ry * 0.45) + '" r="1" fill="#fff" opacity=".75" stroke="none"/>';
    const arc = (cx) => '<path d="M' + (cx - 7) + " " + (ey + 3) + "q7-10 14 0" + '" fill="none" stroke-width="3.400"/>';
    const lid = (cx) => '<path d="M' + (cx - 7) + " " + (ey - 1) + "h14" + '" fill="none" stroke-width="3.400"/><path d="M' + (cx - 5) + " " + (ey - 1) + 'q5 8 10 0z" fill="#2a1c1a" stroke="none"/>';
    const eyes = { joy: arc(ex1) + arc(ex2), happy: arc(ex1) + arc(ex2), upset: lid(ex1) + lid(ex2) }[mood] || oval(ex1) + oval(ex2);
    const browDown = '<path d="M' + (ex1 - 8) + " " + (ey - 15) + "l15-4M" + (ex2 + 8) + " " + (ey - 15) + 'l-15-4" fill="none" stroke-width="3"/>';
    const browAngry = '<path d="M' + (ex1 - 9) + " " + (ey - 19) + "l16 7M" + (ex2 + 9) + " " + (ey - 19) + 'l-16 7" fill="none" stroke-width="3.400"/>';
    const brows = { worry: browDown, sad: browDown, upset: browDown, angry: browAngry }[mood] || "";
    const smile = '<path d="M' + (mx - 6) + " " + my + 'q6 5 12 0" fill="none"/>';
    const open = '<path d="M' + (mx - 10) + " " + (my - 3) + "h20q-1 13-10 13t-10-13z" + '" fill="#a8323a" stroke-width="2"/><path d="M' + (mx - 6) + " " + (my + 6) + 'q6-4 12 0q-6 5-12 0z" fill="#ff9a9a" stroke="none"/>';
    const oh = '<ellipse cx="' + mx + '" cy="' + (my + 2) + '" rx="4.200" ry="5.200" fill="#a8323a" stroke-width="2"/>';
    const frown = '<path d="M' + (mx - 6) + " " + (my + 3) + 'q6-6 12 0" fill="none"/>';
    const shout = '<path d="M' + (mx - 9) + " " + (my + 8) + 'q9-15 18 0z" fill="#a8323a" stroke-width="2"/>';
    const mouth = { joy: open, happy: open, relief: smile, calm: smile, worry: oh, upset: frown, sad: frown, angry: shout }[mood] || smile;
    return FACE + eyes + brows + mouth + "</g>";
  }

  /** 달이(뉴스 담당 다람쥐). mood: happy | calm | worry | sad */
  function dariSvg(mood) {
    const armL = mood === "happy" ? '<path d="M44 124C30 120 22 108 24 94" fill="none" stroke="#2a3a6e" stroke-width="13" stroke-linecap="round"/><path d="M43 122C31 118 25 108 26 96" fill="none" stroke="#5a70b4" stroke-width="5" stroke-linecap="round" opacity=".7"/><circle cx="24" cy="90" r="9.500" fill="' + G("paw") + '"/>'
      : mood === "worry" ? "" : '<ellipse cx="38" cy="134" rx="8" ry="11" fill="' + G("navy") + '"/>';
    const armR = mood === "worry" ? "" : '<ellipse cx="94" cy="134" rx="8" ry="11" fill="' + G("navy") + '"/>';
    const paws = mood === "worry" ? '<circle cx="50" cy="106" r="10" fill="' + G("paw") + '"/><circle cx="82" cy="106" r="10" fill="' + G("paw") + '"/>' : "";
    const tears = mood === "sad" ? '<path d="M41 80q-5 11 1 15q7-3-1-15z" fill="#7cc0ff"/><path d="M91 80q5 11-1 15q-7-3 1-15z" fill="#7cc0ff"/>' : "";
    const emote = { happy: EMOTE.bars(118, 8), calm: "", worry: EMOTE.drops(120, 14), sad: EMOTE.scribble(118, 10) }[mood] || "";
    const teeth = mood === "calm" ? '<rect x="62" y="85.500" width="8" height="6" rx="2" fill="#fff" stroke="#d9c9b0" stroke-width="1"/>' : "";
    return '<svg class="gtn-dari gtn-toy" viewBox="0 0 150 168" aria-hidden="true">' +
      '<ellipse cx="74" cy="158" rx="48" ry="7" fill="#151c44" opacity=".32" filter="url(#gtnBlur2)"/>' +
      '<path d="M94 152C142 156 154 104 136 76C124 58 98 60 92 80C88 93 97 104 108 102C106 122 99 140 84 150Z" fill="' + G("orangeD") + '"/><path d="M122 134c13-15 13-38 2-50-8-8-19-5-20 5" fill="none" stroke="#ffd9a6" stroke-width="8" stroke-linecap="round" opacity=".85"/>' + HI(128, 86, 7, 12, 0.45, 20) +
      '<ellipse cx="52" cy="153" rx="13" ry="6.500" fill="' + G("orangeD") + '"/><ellipse cx="80" cy="153" rx="13" ry="6.500" fill="' + G("orangeD") + '"/>' +
      '<path d="M38 152C35 127 46 111 66 111C86 111 97 127 94 152Z" fill="' + G("navy") + '"/><path d="M54 113L66 131L78 113Z" fill="' + G("white") + '"/>' +
      '<path d="M57 114L66 134L75 114" fill="none" stroke="#4f8df0" stroke-width="3.400" stroke-linecap="round" stroke-linejoin="round"/><rect x="59" y="131" width="14" height="15" rx="3" fill="' + G("white") + '" stroke="#b9c2d8" stroke-width="1"/><circle cx="66" cy="138" r="3.400" fill="#e5484d"/><path d="M62.600 138a3.400 3.400 0 0 0 6.800 0z" fill="#3f6fd1"/>' +
      armL + armR +
      '<path d="M30 42C21 19 27 6 36 4C47 10 53 22 55 33Z" fill="' + G("orangeD") + '"/><path d="M35 34C31 22 33 14 38 12C44 17 46 24 47 30Z" fill="#ffc9b0"/><path d="M102 42C111 19 105 6 96 4C85 10 79 22 77 33Z" fill="' + G("orangeD") + '"/><path d="M97 34C101 22 99 14 94 12C88 17 86 24 85 30Z" fill="#ffc9b0"/>' +
      '<ellipse cx="66" cy="64" rx="49" ry="43" fill="' + G("orange") + '"/><path d="M66 22q-10 13 0 26q10-13 0-26z" fill="#cf6c1a" opacity=".75"/>' +
      '<path d="M66 53C51 44 34 53 30 69C26 89 45 103 66 103C87 103 106 89 102 69C98 53 81 44 66 53Z" fill="' + G("cream") + '"/>' + HI(42, 36, 17, 8, 0.6, -28) +
      '<ellipse cx="33" cy="82" rx="8.500" ry="5.500" fill="#ff8f8f" opacity=".5" filter="url(#gtnBlur)"/><ellipse cx="99" cy="82" rx="8.500" ry="5.500" fill="#ff8f8f" opacity=".5" filter="url(#gtnBlur)"/>' +
      '<path d="M60.500 75.500h11q1 0 .4 1l-5 5.500q-.9.900-1.800 0l-5-5.500q-.6-1 .4-1z" fill="#5a3620"/><ellipse cx="64" cy="77" rx="2" ry="1" fill="#fff" opacity=".5"/>' +
      faceParts(mood, 47, 85, 68, 66, 88, false) + teeth + tears + paws + emote + "</svg>";
  }

  /** 시민 초상 (상반신). id: evacuee | driver | nurse, mood: joy | relief | worry | upset | angry */
  function portraitSvg(id, mood) {
    const skin = G(mood === "angry" ? "skinR" : "skin");
    const emote = { joy: EMOTE.bars(98, 2), relief: EMOTE.sparkle(100, 2), worry: EMOTE.drops(102, 6), upset: EMOTE.scribble(100, 2), angry: EMOTE.bang(104, 0) }[mood] || "";
    const shade = mood === "upset" ? '<path d="M22 50q38-16 76 0v8q-38-9-76 0z" fill="#59607c" opacity=".22"/>' : "";
    const blush = mood === "angry" ? "" : '<ellipse cx="35" cy="75" rx="8.500" ry="5.500" fill="#ff8f8f" opacity=".5" filter="url(#gtnBlur)"/><ellipse cx="85" cy="75" rx="8.500" ry="5.500" fill="#ff8f8f" opacity=".5" filter="url(#gtnBlur)"/>';
    const ears = '<ellipse cx="20" cy="64" rx="7.500" ry="8.500" fill="' + skin + '"/><ellipse cx="100" cy="64" rx="7.500" ry="8.500" fill="' + skin + '"/><ellipse cx="20" cy="64" rx="3" ry="4" fill="#f0a896" opacity=".8"/><ellipse cx="100" cy="64" rx="3" ry="4" fill="#f0a896" opacity=".8"/>';
    const head = '<path d="M60 16C86 16 100 34 100 58C100 82 84 97 60 97C36 97 20 82 20 58C20 34 34 16 60 16Z" fill="' + skin + '"/>';
    const torso = (k) => '<path d="M22 132C22 110 38 99 60 99C82 99 98 110 98 132Z" fill="' + G(k) + '"/>';
    const styles = {
      evacuee: {
        back: '<circle cx="60" cy="12" r="12" fill="' + G("gray") + '"/>',
        body: torso("purple") + '<path d="M30 112C42 100 78 100 90 112L84 124C70 112 50 112 36 124Z" fill="' + G("shawl") + '"/>',
        front: '<path d="M17 58C14 30 36 12 60 12C84 12 106 30 103 58C97 47 91 41 84 39C76 46 66 45 60 39C54 45 44 46 36 39C29 41 23 47 17 58Z" fill="' + G("gray") + '"/>' + HI(42, 24, 14, 5, 0.75, -22) +
          '<g fill="#fff" fill-opacity=".28" stroke="#7d6a94" stroke-width="2.600"><circle cx="42" cy="62" r="12"/><circle cx="78" cy="62" r="12"/></g><path d="M54 62h12" fill="none" stroke="#7d6a94" stroke-width="2.600"/><path d="M34 55q4-5 9-5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>',
        small: true
      },
      driver: {
        back: "",
        body: torso("navy") + '<path d="M36 132V106L48 100L60 113L72 100L84 106V132Z" fill="' + G("yellow") + '"/><path d="M36 119H84" fill="none" stroke="#fffbe0" stroke-width="5" opacity=".9"/>',
        front: '<path d="M21 52C19 62 21 70 25 74L30 54ZM99 52C101 62 99 70 95 74L90 54Z" fill="' + G("brown") + '"/><path d="M21 44C21 22 38 8 60 8C82 8 99 22 99 44Z" fill="' + G("cap") + '"/>' + HI(42, 20, 14, 6, 0.5, -24) +
          '<path d="M17 42H98C108 42 115 48 116 55C90 51 50 49 17 51Z" fill="#26335f"/><path d="M19 43.500H98q9 0 14 6" fill="none" stroke="#6d84c4" stroke-width="2" stroke-linecap="round" opacity=".7"/><circle cx="60" cy="27" r="7.500" fill="' + G("yellow") + '"/>',
        small: false
      },
      nurse: {
        back: '<path d="M13 70C8 30 34 6 60 6C86 6 112 30 107 70C105 86 99 95 92 98H28C21 95 15 86 13 70Z" fill="' + G("brown") + '"/>',
        body: torso("mint") + '<path d="M47 100L60 114L73 100Z" fill="' + G("white") + '"/><path d="M50 101L60 120L70 101" fill="none" stroke="#4f8df0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="54" y="117" width="12" height="12" rx="2.500" fill="#fff" stroke="#b9c2d8" stroke-width="1"/>',
        front: '<path d="M21 56C20 30 38 14 60 14C82 14 100 30 99 56C92 51 86 43 82 33C75 42 62 47 46 47C37 47 28 51 21 56Z" fill="' + G("brown") + '"/>' + HI(44, 25, 15, 5, 0.5, -20) +
          '<path d="M40 15L44 1H76L80 15Z" fill="' + G("white") + '"/><path d="M54 8h12M60 3v10" fill="none" stroke="#e5484d" stroke-width="3.200" stroke-linecap="round"/>',
        small: false
      }
    };
    const s = styles[id] || styles.evacuee;
    return '<svg class="gtn-toy" viewBox="0 0 126 132" aria-hidden="true">' + s.back + s.body + ears + head + HI(42, 36, 13, 7, 0.55, -25) + shade + blush +
      faceParts(mood, 42, 78, 62, 60, 80, s.small) + s.front + emote + "</svg>";
  }

  /** 시민 얼굴: 이미지가 등록돼 있으면 그것을 쓴다. citizens[id]는 주소 하나이거나 { joy, relief, worry, upset, angry } 표정별 주소 */
  function faceHtml(id, mood) {
    const a = ASSETS.citizens && ASSETS.citizens[id];
    const src = typeof a === "string" ? a : a && (a[mood] || a.default);
    return src ? '<img src="' + esc(src) + '" alt="">' : portraitSvg(id, mood);
  }

  /** 해원시 재난 현황 지도. metrics는 OBJECTIVES 순서, 각 항목에 achieved/prev가 있다. */
  function mapSvg(metrics) {
    const get = (i, k) => (metrics[i] ? num(metrics[i][k], 0) : 0);
    const now = { shelters: Math.round((get(0, "achieved") / 100) * 5), routes: get(1, "achieved"), villages: get(2, "achieved"), buildings: Math.round(get(3, "achieved") / 10) };
    const was = { shelters: Math.round((get(0, "prev") / 100) * 5), routes: get(1, "prev"), villages: get(2, "prev"), buildings: Math.round(get(3, "prev") / 10) };
    const hub = { x: 180, y: 196 }, sx = [50, 115, 180, 245, 310];
    let s = '<svg class="gtn-map" viewBox="0 0 360 232" role="img" aria-label="해원시 재난 현황 지도: 보급로 ' + now.routes + "개 노선 통행, 대피소 " + now.shelters + "곳 공급, 고립 마을 " + now.villages + "곳 지원, 건물 " + now.buildings * 10 + '% 복구">';
    s += '<rect width="360" height="232" rx="12" fill="#e3f1dc"/><path d="M0 70q60-14 120 0t120 0 120 0V0H0z" fill="#cfe2c8"/>';
    s += '<path d="M0 150q50-16 96 2t84-6 96 8 84-10" stroke="#a9d3f2" stroke-width="9" fill="none" stroke-linecap="round" opacity=".8"/>';
    for (let i = 0; i < 5; i++) s += '<path d="M' + (i * 72 + 6) + " 66l30-42 30 42z\" fill=\"#9bbd97\"/><path d=\"M" + (i * 72 + 29) + " 34l7-10 7 10-7 4z\" fill=\"#f2f6f1\"/>";
    // 보급로
    sx.forEach((x, i) => {
      const open = i < now.routes, fresh = open && i >= was.routes;
      const d = "M" + hub.x + " " + (hub.y - 10) + "Q" + (hub.x + (x - hub.x) * 0.5) + " " + 150 + " " + x + " 128";
      s += '<path d="' + d + '" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>';
      s += '<path class="' + (open ? "gtn-road-open" : "gtn-road-shut") + (fresh ? " gtn-new" : "") + '" d="' + d + '" stroke="' + (open ? "#4a6fb5" : "#b7bdc9") + '" stroke-width="5" fill="none" stroke-linecap="round"' + (open ? ' stroke-dasharray="2 9"' : ' stroke-dasharray="7 7"') + "/>";
      if (!open) { const mx = hub.x + (x - hub.x) * 0.55, my = 152 + Math.abs(x - hub.x) * 0.02; s += '<g transform="translate(' + mx + " " + my + ')"><circle r="7.500" fill="#fff"/><path d="M-3.500-3.500l7 7M3.500-3.500l-7 7" stroke="#e5484d" stroke-width="2.600" stroke-linecap="round"/></g>'; }
    });
    // 건물 (도시 복구)
    for (let i = 0; i < 10; i++) {
      const left = i < 5, bx = left ? 12 + i * 19 : 254 + (i - 5) * 19, hgt = [26, 34, 22, 30, 38][i % 5];
      const ok = i < now.buildings, fresh = ok && i >= was.buildings;
      s += ok ? '<g class="' + (fresh ? "gtn-new" : "") + '"><rect x="' + bx + '" y="' + (220 - hgt) + '" width="15" height="' + hgt + '" rx="1.500" fill="#5b7fc7"/><rect x="' + (bx + 3) + '" y="' + (225 - hgt) + '" width="3.500" height="4" fill="#ffe69a"/><rect x="' + (bx + 9) + '" y="' + (225 - hgt) + '" width="3.500" height="4" fill="#ffe69a"/></g>'
        : '<path d="M' + bx + " 220v-" + Math.round(hgt * 0.45) + "l5 4 4-7 6 5v" + (Math.round(hgt * 0.45) - 2) + 'z" fill="#a9afbd"/>';
    }
    // 대피소
    sx.forEach((x, i) => {
      const ok = i < now.shelters, fresh = ok && i >= was.shelters;
      s += '<g transform="translate(' + x + ' 112)"><g class="' + (fresh ? "gtn-new" : "") + '"><path d="M-17 14l17-24 17 24z" fill="' + (ok ? "#4a6fb5" : "#a3aabb") + '"/><path d="M-4 14l4-10 4 10z" fill="#2b3a67"/>' +
        (ok ? '<g transform="translate(13 -9)"><rect x="-6" y="-6" width="12" height="11" rx="1.500" fill="#ffc94a"/><path d="M-6-1h12M0-6v11" stroke="#c98a00" stroke-width="1.200"/></g>' : '<g transform="translate(13 -9)"><circle r="6.500" fill="#e5484d"/><path d="M0-3.500v4M0 3v.4" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>') + "</g></g>";
    });
    // 고립 마을
    for (let i = 0; i < 10; i++) {
      const x = 22 + i * 35, y = i % 2 ? 50 : 40, ok = i < now.villages, fresh = ok && i >= was.villages;
      if (ok) s += '<path d="M' + x + " " + (y + 8) + "L" + sx[Math.min(4, Math.floor(i / 2))] + ' 100" stroke="#3fa565" stroke-width="1.400" stroke-dasharray="2 4" fill="none" opacity=".8"/>';
      s += '<g transform="translate(' + x + " " + y + ')"><g class="' + (fresh ? "gtn-new" : "") + '"><rect x="-6" y="-2" width="12" height="9" fill="' + (ok ? "#fff" : "#d5d9e2") + '"/><path d="M-8-2l8-7 8 7z" fill="' + (ok ? "#3fa565" : "#8e96a8") + '"/>' +
        (ok ? '<circle cx="8" cy="-10" r="5" fill="#3fa565"/><path d="M5.500-10l2 2 3.500-4" stroke="#fff" stroke-width="1.600" fill="none" stroke-linecap="round"/>' : "") + "</g></g>";
    }
    s += '<g transform="translate(' + hub.x + " " + hub.y + ')"><circle r="17" fill="#2b3a67"/><circle r="17" fill="none" stroke="#ffc94a" stroke-width="2.500"/><path d="M-8 5v-9l8-5 8 5v9z" fill="#fff"/><rect x="-3" y="-1" width="6" height="6" fill="#4a6fb5"/></g><text x="' + hub.x + '" y="227" text-anchor="middle" font-size="9" fill="#2b3a67" font-weight="700">조달 물류기지</text>';
    return s + "</svg>";
  }

  function sparkSvg(history, change) {
    if (history.length < 2) return '<svg class="gtn-spark" viewBox="0 0 72 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="M6 16h60" stroke="#b9c6de" stroke-width="2" stroke-dasharray="3 4"/></svg>';
    const lo = Math.min.apply(null, history) - 3, hi = Math.max.apply(null, history) + 3;
    const pts = history.map((v, i) => [6 + (i * 60) / (history.length - 1), 26 - ((v - lo) / (hi - lo)) * 20]);
    const color = change > 0 ? "#e5484d" : change < 0 ? "#2f6fd0" : "#8fa3c7", last = pts[pts.length - 1];
    return '<svg class="gtn-spark" viewBox="0 0 72 32" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="M' + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + '" stroke="' + color + '" stroke-width="2.200" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="' + last[0] + '" cy="' + last[1].toFixed(1) + '" r="2.800" fill="' + color + '"/></svg>';
  }

  function historySvg(history) {
    const X = (i) => 30 + i * 62, Y = (v) => 96 - v * 0.8;
    const line = (key, color) => '<path d="M' + history.map((h, i) => X(i) + " " + Y(h[key]).toFixed(1)).join("L") + '" stroke="' + color + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      history.map((h, i) => '<circle cx="' + X(i) + '" cy="' + Y(h[key]).toFixed(1) + '" r="4" fill="#fff" stroke="' + color + '" stroke-width="2.500"/>').join("");
    let s = '<svg class="gtn-history" viewBox="0 0 310 126" role="img" aria-label="5일간 재난 대응 진척도와 시민 만족도 변화">';
    [0, 50, 100].forEach((v) => { s += '<path d="M24 ' + Y(v) + 'h270" stroke="#dbe3f2" stroke-width="1"/><text x="20" y="' + (Y(v) + 3) + '" text-anchor="end" font-size="8" fill="#8090b0">' + v + "</text>"; });
    s += line("satisfaction", "#3fa565") + line("progress", "#e0a100");
    history.forEach((h, i) => {
      s += '<text x="' + X(i) + '" y="118" text-anchor="middle" font-size="9" fill="#52607e">' + h.day + "일차</text>";
      s += '<text x="' + X(i) + '" y="' + (Y(h.progress) - 8).toFixed(1) + '" text-anchor="middle" font-size="9" font-weight="700" fill="#a87800">' + h.progress + "</text>";
    });
    return s + "</svg>";
  }

  /* ═════════════ 4. 효과음 (WebAudio, 파일 불필요) ═════════════ */

  const Sound = (function () {
    let ctx = null, muted = false, enabled = true, resuming = null;
    function ac() {
      if (!enabled || muted || typeof window === "undefined") return null;
      try {
        if (!ctx || ctx.state === "closed") { resuming = null; const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
        if ((ctx.state === "suspended" || ctx.state === "interrupted") && !resuming) {
          const pending = Promise.resolve(ctx.resume()); resuming = pending;
          pending.finally(() => { if (resuming === pending) resuming = null; }).catch(() => {});
        }
        return ctx;
      } catch (e) { return null; }
    }
    function tone(freq, at, dur, type, vol) {
      const c = ac(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
      o.type = type || "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.07, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    function rumble(dur) {
      const c = ac(); if (!c) return;
      const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = "lowpass"; f.frequency.value = 110; g.gain.value = 0.9;
      src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    }
    const fx = {
      chime() { tone(660, 0, 0.14); tone(880, 0.13, 0.14); tone(1320, 0.26, 0.32); },
      page() { tone(540, 0, 0.06, "triangle", 0.04); },
      alert() { for (let i = 0; i < 6; i++) tone(i % 2 ? 640 : 900, i * 0.2, 0.18, "square", 0.045); },
      rumble() { rumble(2); },
      good() { tone(523, 0, 0.14); tone(659, 0.11, 0.14); tone(784, 0.22, 0.3); },
      bad() { tone(392, 0, 0.2, "triangle"); tone(311, 0.18, 0.36, "triangle"); },
      tick() { tone(1200, 0, 0.03, "square", 0.02); }
    };
    return {
      play(name) {
        if (typeof window !== "undefined" && window.GoldenTimeAudio && window.GoldenTimeAudio.isActive()) { window.GoldenTimeAudio.play(name).catch(() => {}); return; }
        const c = ac(); if (!c || !fx[name]) return;
        if (resuming) resuming.then(() => { if (ctx === c && enabled && !muted) fx[name](); }).catch(() => {});
        else fx[name]();
      },
      reconnect() {
        if (typeof window !== "undefined" && window.GoldenTimeAudio) { enabled = true; muted = false; return window.GoldenTimeAudio.reconnect(); }
        const previous = ctx; ctx = null; resuming = null; enabled = true; muted = false;
        if (previous && previous.state !== "closed" && previous.close) { try { Promise.resolve(previous.close()).catch(() => {}); } catch (e) {} }
        const c = ac();
        if (!c) return Promise.reject(new Error("이 브라우저에서 오디오를 시작하지 못했어요."));
        return Promise.resolve(resuming).then(() => {
          if (c !== ctx || c.state !== "running") throw new Error("브라우저가 오디오 시작을 허용하지 않았어요.");
          fx.chime(); return c.state;
        });
      },
      resume() { if (typeof window !== "undefined" && window.GoldenTimeAudio && window.GoldenTimeAudio.isActive()) { window.GoldenTimeAudio.prime(); return; } return ac(); },
      setMuted(v) { muted = !!v; if (typeof window !== "undefined" && window.GoldenTimeAudio) window.GoldenTimeAudio.setMuted(v); }, isMuted: () => muted,
      setEnabled(v) { enabled = !!v; if (typeof window !== "undefined" && window.GoldenTimeAudio) window.GoldenTimeAudio.setEnabled(v); }
    };
  })();

  /* ═════════════ 5. 화면 ═════════════ */

  const reduced = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function prepareMount(mount) {
    const fixed = mount === document.body;
    if (!fixed && getComputedStyle(mount).position === "static") mount.style.position = "relative";
    return fixed;
  }
  function closeOverlay(el, done) {
    el.classList.add("gtn-leave");
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); done(); }, 200);
  }
  function trapFocus(el, e) {
    if (e.key !== "Tab") return;
    const list = Array.prototype.filter.call(el.querySelectorAll("button:not([disabled])"), (b) => b.offsetParent !== null);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function animateIn(page) {
    const still = reduced();
    Array.prototype.forEach.call(page.querySelectorAll("[data-to]"), (node) => {
      const to = Number(node.dataset.to), from = Number(node.dataset.from || 0);
      if (still || from === to) { node.textContent = to; return; }
      const t0 = performance.now();
      (function step(now) {
        const k = Math.min(1, (now - t0) / 800), e = 1 - Math.pow(1 - k, 3);
        node.textContent = Math.round(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Array.prototype.forEach.call(page.querySelectorAll("[data-w]"), (bar) => { bar.style.width = bar.dataset.w + "%"; });
    }));
  }
  const deltaChip = (d, unit) => (d == null ? "" : d > 0 ? '<em class="gtn-up">▲ ' + d + (unit || "") + "</em>" : d < 0 ? '<em class="gtn-down">▼ ' + Math.abs(d) + (unit || "") + "</em>" : '<em class="gtn-flat">변동 없음</em>');
  const pct = (m, k) => Math.round(Math.min(num(m[k], 0) / m.target, 1) * 100);

  function metricRows(metrics) {
    return metrics.map((m) => '<div class="gtn-metric"><span class="gtn-metric-ic" aria-hidden="true">' + (m.icon || "") + '</span><div class="gtn-metric-main"><div class="gtn-metric-top"><span>' + esc(m.label) + '</span><b><i data-to="' + m.achieved + '" data-from="' + num(m.prev, m.achieved) + '">' + m.achieved + "</i>/" + m.target + '<small>' + esc(m.unit || "") + "</small></b></div>" +
      '<div class="gtn-bar"><i style="width:' + pct(m, m.prev == null ? "achieved" : "prev") + '%" data-w="' + pct(m, "achieved") + '"></i></div></div>' + (m.delta == null ? "" : '<span class="gtn-metric-delta">' + (m.delta > 0 ? '<em class="gtn-up">+' + m.delta + "</em>" : '<em class="gtn-flat">–</em>') + "</span>") + "</div>").join("");
  }

  function leadHtml(item, withBack) {
    return '<div class="gtn-lead-img">' + sceneSvg(item.scene) + '<span class="gtn-tag gtn-tag-' + (item.tone || "hot") + '">' + esc(item.tag || item.cat) + "</span>" + (withBack ? '<button type="button" class="gtn-back">← 머리기사로</button>' : "") + "</div><h2>" + esc(item.title) + "</h2><p>" + esc(item.body) + "</p>";
  }

  function buildPages(news) {
    const pages = [];
    if (news.type === "morning") {
      pages.push({
        label: "머리기사",
        html: '<div class="gtn-split"><article class="gtn-lead" data-lead></article><div class="gtn-list">' + news.articles.map((a, i) =>
          '<button type="button" class="gtn-item gtn-tone-' + (a.tone || "neutral") + '" data-i="' + (i + 1) + '"><span class="gtn-thumb">' + sceneSvg(a.scene) + '</span><span class="gtn-item-text"><em>' + esc(a.cat) + "</em><strong>" + esc(a.title) + "</strong></span></button>").join("") +
          '<p class="gtn-tip">기사를 누르면 자세히 볼 수 있어요</p></div></div>'
      });
      pages.push({
        label: "시황·업무 포인트",
        html: '<div class="gtn-brief"><section class="gtn-card"><h3>오늘의 원자재 시황 <span>1일차 가격 = 100</span></h3><ul class="gtn-market">' + news.market.map((m) =>
          '<li><span class="gtn-market-name">' + m.icon + " " + esc(m.label) + '</span><b data-to="' + m.index + '" data-from="' + (m.index - m.change) + '">' + m.index + "</b>" + sparkSvg(m.history, m.change) + (m.change > 0 ? '<em class="gtn-rise">▲ ' + m.change + "</em>" : m.change < 0 ? '<em class="gtn-fall">▼ ' + Math.abs(m.change) + "</em>" : '<em class="gtn-flat">변동 없음</em>') + "</li>").join("") + "</ul>" +
          (news.metrics ? '<div class="gtn-now"><span>재난 대응 진척도</span><div class="gtn-bar gtn-bar-gold"><i style="width:0%" data-w="' + news.progress + '"></i></div><b>' + news.progress + "%</b><small>" + esc(news.status) + "</small></div>" : '<div class="gtn-now gtn-now-calm"><span>재난 상황</span><small>아직 발생한 재난이 없어요. 대비할 수 있는 시간이에요.</small></div>') +
          '</section><section class="gtn-card"><h3>오늘의 업무 포인트 <span>달이의 귀띔</span></h3><ul class="gtn-hints">' + news.hints.map((h) =>
            '<li><span class="gtn-hint-ic" aria-hidden="true">' + h.icon + "</span><div><strong>" + esc(h.tab) + "</strong><p>" + esc(h.text) + '</p><small>잘하면 → ' + esc(h.effect) + "</small></div></li>").join("") + "</ul></section></div>"
      });
      return pages;
    }
    // 밤·엔딩 1쪽: 머리기사 + 오늘의 숫자
    pages.push({
      label: "머리기사",
      html: '<div class="gtn-split gtn-split-night"><article class="gtn-lead">' + leadHtml(news.headline) + '</article><div class="gtn-stats">' +
        '<div class="gtn-stat gtn-stat-gold"><span>재난 대응 진척도</span><b><i data-to="' + news.progress + '" data-from="' + (news.progress - news.progressDelta) + '">' + news.progress + "</i>%</b>" + deltaChip(news.progressDelta, "%p") + "</div>" +
        '<div class="gtn-stat gtn-mood-' + news.mood + '"><span>시민 만족도</span><b><i data-to="' + news.satisfaction + '" data-from="' + (news.satisfactionDelta == null ? 50 : news.satisfaction - news.satisfactionDelta) + '">' + news.satisfaction + "</i>%</b>" + (news.satisfactionDelta == null ? '<em class="gtn-flat">' + esc(news.moodText) + "</em>" : deltaChip(news.satisfactionDelta, "%p")) + "</div>" +
        '<div class="gtn-stat"><span>도시 복구율</span><b><i data-to="' + news.recovery + '" data-from="' + news.metrics[3].prev + '">' + news.recovery + "</i>%</b>" + deltaChip(news.metrics[3].delta, "%p") + "</div></div></div>"
    });
    // 2쪽: 내 선택 → 현장 결과 → 시민 반응
    pages.push({
      label: "내 선택의 결과",
      html: '<div class="gtn-causes">' + news.causes.map((c, i) =>
        '<section class="gtn-cause gtn-tier-' + c.tier + '" style="--i:' + i + '"><header><span aria-hidden="true">' + c.icon + "</span><strong>" + esc(c.tab) + '</strong><em>' + esc(c.tierText) + "</em></header>" +
        '<div class="gtn-cause-in"><small>오늘 내 업무</small><p>' + esc(c.input) + '</p></div><div class="gtn-arrow" aria-hidden="true">▼</div>' +
        '<div class="gtn-cause-out"><div class="gtn-cause-img">' + sceneSvg(c.scene) + "</div><h4>" + esc(c.title) + "</h4><p>" + esc(c.body) + '</p><div class="gtn-cause-metric"><span>' + esc(c.metric.label) + "</span><b>" + c.metric.achieved + "/" + c.metric.target + "</b>" + (c.metric.delta > 0 ? '<em class="gtn-up">+' + c.metric.delta + "</em>" : '<em class="gtn-flat">변동 없음</em>') + "</div></div>" +
        '<div class="gtn-arrow" aria-hidden="true">▼</div><div class="gtn-cause-voice gtn-mood-' + c.citizen.mood + '"><span class="gtn-face">' + faceHtml(c.citizen.id, c.citizen.mood) + "</span><div><q>" + esc(c.citizen.quote) + "</q><small>" + esc(c.citizen.name) + " · " + esc(c.citizen.role) + "</small></div></div></section>").join("") + "</div>"
    });
    // 3쪽: 지도 + 지표
    pages.push({
      label: "재난 현황",
      html: '<div class="gtn-situation"><section class="gtn-card gtn-map-card"><h3>해원시 재난 현황 <span>' + esc(news.status) + "</span></h3>" + mapSvg(news.metrics) +
        '<ul class="gtn-legend"><li><i class="gtn-lg-road"></i>통행 보급로</li><li><i class="gtn-lg-tent"></i>공급된 대피소</li><li><i class="gtn-lg-village"></i>지원 닿은 마을</li><li><i class="gtn-lg-build"></i>복구된 건물</li></ul></section>' +
        '<section class="gtn-card gtn-status"><h3>목표별 달성 <span>오늘 밤 기준</span></h3>' + metricRows(news.metrics) +
        '<div class="gtn-total"><span>재난 대응 진척도</span><div class="gtn-bar gtn-bar-gold"><i style="width:' + (news.progress - news.progressDelta) + '%" data-w="' + news.progress + '"></i></div><b><i data-to="' + news.progress + '" data-from="' + (news.progress - news.progressDelta) + '">' + news.progress + "</i>%</b></div>" +
        '<div class="gtn-satis gtn-mood-' + news.mood + '"><span class="gtn-face">' + faceHtml("evacuee", news.mood) + '</span><div><small>시민 만족도</small><b>' + news.satisfaction + "% · " + esc(news.moodText) + "</b></div>" + deltaChip(news.satisfactionDelta, "%p") + "</div></section></div>"
    });
    if (news.type === "ending" && news.history) {
      pages.push({
        label: "5일의 기록",
        html: '<div class="gtn-final"><section class="gtn-card gtn-final-chart"><h3>닷새의 기록 <span><i class="gtn-dot gtn-dot-gold"></i>진척도 <i class="gtn-dot gtn-dot-green"></i>시민 만족도</span></h3>' + historySvg(news.history) + "</section>" +
          '<section class="gtn-card gtn-final-side"><div class="gtn-stamp gtn-stamp-' + news.ending.rank + '"><small>재난 대응 종합 평가</small><strong>' + esc(news.ending.title) + "</strong><span>진척도 " + news.progress + "% · 복구율 " + news.recovery + "% · 만족도 " + news.satisfaction + '%</span></div><h3>결정적 순간</h3><ul class="gtn-turning">' +
          news.turningPoints.map((t) => '<li class="gtn-tone-' + t.tone + '"><b>' + t.day + "일차</b><p>" + esc(t.text) + "</p></li>").join("") + "</ul></section></div>"
      });
    }
    return pages;
  }

  /**
   * 뉴스 패널을 mount 위에 띄운다. 마지막 쪽의 버튼을 누르면 resolve.
   * opts = { assets:{dari}, confirmLabel, readOnly, intro, onMute }
   */
  function showNews(mount, news, opts) {
    opts = opts || {};
    ASSETS = opts.assets || {};
    ensureDefs();
    return new Promise((resolve) => {
      const night = news.type !== "morning";
      const pages = buildPages(news);
      const finalLabel = opts.confirmLabel || (opts.readOnly ? "닫기" : news.type === "morning" ? "업무 시작" : news.type === "ending" ? "결과 확인" : "퇴근하기");
      const sub = news.type === "ending" ? "재난 대응 종합 특집" : night ? "퇴근길 저녁 뉴스" : "출근길 아침 뉴스";
      const tickerText = (news.ticker || news.articles.map((a) => a.title)).map(esc).join("　◆　");
      const el = document.createElement("div");
      el.className = "gtn-overlay gtn-" + news.type + (prepareMount(mount) ? " gtn-fixed" : "");
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "조달청 뉴스 · " + sub);
      // assets.dari는 주소 하나이거나 { happy, calm, worry, sad } 표정별 주소
      const dariAsset = opts.assets && opts.assets.dari;
      const dariSrc = typeof dariAsset === "string" ? dariAsset : dariAsset && (dariAsset[news.dariMood] || dariAsset.calm || dariAsset.default);
      const mascot = dariSrc ? '<img class="gtn-dari" src="' + esc(dariSrc) + '" alt="">' : dariSvg(news.dariMood || "calm");
      el.innerHTML =
        (opts.intro === false || reduced() ? "" : '<div class="gtn-intro" aria-hidden="true"><div><span>📰</span><strong>조달청 뉴스</strong><small>' + news.day + "일차 · " + esc(sub) + "</small></div></div>") +
        '<div class="gtn-wrap"><div class="gtn-side"><div class="gtn-bubble" aria-live="polite"><b>달이</b><p></p></div>' + mascot + "</div>" +
        '<div class="gtn-panel"><header class="gtn-head"><div class="gtn-brand"><span class="gtn-logo" aria-hidden="true">📰</span><div><strong>조달청 뉴스</strong><small>' + esc(sub) + '</small></div></div><div class="gtn-meta"><span class="gtn-chip gtn-chip-day">' + news.day + "일차 · " + esc(news.dLabel) + '</span><span class="gtn-chip">' + (night ? "🌙" : "☀️") + " " + esc(news.time) + '</span><button type="button" class="gtn-mute" aria-label="효과음 켜기/끄기"></button></div></header>' +
        '<div class="gtn-ticker" aria-hidden="true"><b>' + (night ? "현장 속보" : "오늘의 한 줄") + '</b><div><span>' + tickerText + "</span></div></div>" +
        '<div class="gtn-pages">' + pages.map((p, i) => '<div class="gtn-page" data-page="' + i + '" hidden>' + p.html + "</div>").join("") + "</div>" +
        '<footer class="gtn-foot"><button type="button" class="gtn-prev">← 이전</button><ol class="gtn-dots">' + pages.map((p, i) => '<li data-go="' + i + '"><i></i><span>' + esc(p.label) + "</span></li>").join("") + '</ol><button type="button" class="gtn-next"></button></footer></div></div>';

      const bubble = el.querySelector(".gtn-bubble p"), nextBtn = el.querySelector(".gtn-next"), prevBtn = el.querySelector(".gtn-prev"), muteBtn = el.querySelector(".gtn-mute");
      const leadBox = el.querySelector("[data-lead]");
      const all = [news.headline].concat(news.articles);
      let cur = -1, lead = 0, finished = false;
      const seen = {};
      /* sound-recovery-ui */
      const recovery = document.createElement("span"); recovery.className = "gtn-recovery";
      recovery.innerHTML = '<button type="button" class="gtn-reconnect">소리 다시 연결</button><span class="gtn-reconnect-status" role="status" hidden></span>';
      el.querySelector(".gtn-meta").appendChild(recovery);
      const reconnectBtn = recovery.querySelector("button"), reconnectStatus = recovery.querySelector("[role=status]");
      reconnectBtn.addEventListener("click", () => {
        reconnectBtn.disabled = true; reconnectStatus.hidden = true;
        if (typeof window !== "undefined" && window.GoldenTimeAudio) {
          reconnectStatus.textContent = ""; reconnectStatus.appendChild(window.GoldenTimeAudio.player()); reconnectStatus.hidden = false;
        }
        Sound.reconnect().then(() => {
          setMuteIcon(); if (opts.onMute) opts.onMute(false);
          if (!window.GoldenTimeAudio) reconnectStatus.textContent = "확인음 재생 요청을 보냈어요.";
        }).catch((error) => { const message = document.createElement("span"); message.textContent = "재생 실패: " + error.message; reconnectStatus.appendChild(message); }).finally(() => {
          reconnectBtn.disabled = false; reconnectStatus.hidden = false;
        });
      });
      /* end-sound-recovery-ui */


      function setLead(i) {
        if (!leadBox) return;
        lead = i;
        leadBox.innerHTML = leadHtml(all[i], i > 0);
        Array.prototype.forEach.call(el.querySelectorAll(".gtn-item"), (b) => b.classList.toggle("gtn-on", Number(b.dataset.i) === i));
      }
      function setMuteIcon() { muteBtn.textContent = Sound.isMuted() ? "🔇" : "🔊"; muteBtn.setAttribute("aria-pressed", String(Sound.isMuted())); }
      function go(i, silent) {
        if (i < 0 || i >= pages.length || i === cur) return;
        const back = i < cur; cur = i;
        Array.prototype.forEach.call(el.querySelectorAll(".gtn-page"), (p) => {
          const on = Number(p.dataset.page) === i;
          p.hidden = !on; p.classList.toggle("gtn-page-back", on && back);
        });
        Array.prototype.forEach.call(el.querySelectorAll(".gtn-dots li"), (d, k) => { d.classList.toggle("gtn-on", k === i); d.classList.toggle("gtn-done", k < i); });
        prevBtn.disabled = i === 0;
        const last = i === pages.length - 1;
        nextBtn.textContent = last ? finalLabel : "다음 →";
        nextBtn.classList.toggle("gtn-final-btn", last);
        bubble.textContent = (news.dari && (news.dari[i] || news.dari[news.dari.length - 1])) || "";
        const page = el.querySelector('.gtn-page[data-page="' + i + '"]');
        if (!seen[i]) { seen[i] = true; animateIn(page); }
        if (!silent) Sound.play("page");
        if (night && i === 1 && !silent) {
          const good = news.causes.filter((c) => c.tier === "good").length, bad = news.causes.filter((c) => c.tier === "bad").length;
          setTimeout(() => Sound.play(good > bad ? "good" : bad > good ? "bad" : "page"), 350);
        }
        nextBtn.focus();
      }
      function finish() {
        if (finished) return; finished = true;
        document.removeEventListener("keydown", onKey);
        closeOverlay(el, () => resolve(news));
      }
      function onKey(e) {
        trapFocus(el, e);
        if (e.key === "ArrowRight") { e.preventDefault(); cur === pages.length - 1 ? nextBtn.focus() : go(cur + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
        else if (e.key === "Escape" && opts.readOnly) finish();
      }
      el.addEventListener("click", (e) => {
        const t = e.target;
        if (t.closest(".gtn-intro")) return el.querySelector(".gtn-intro").remove();
        if (t.closest(".gtn-mute")) { Sound.setMuted(!Sound.isMuted()); if (!Sound.isMuted()) Sound.resume(); setMuteIcon(); if (opts.onMute) opts.onMute(Sound.isMuted()); return; }
        const item = t.closest(".gtn-item");
        if (item) { Sound.play("tick"); return setLead(Number(item.dataset.i) === lead ? 0 : Number(item.dataset.i)); }
        if (t.closest(".gtn-back")) return setLead(0);
        const dot = t.closest("[data-go]");
        if (dot) return go(Number(dot.dataset.go));
        if (t.closest(".gtn-prev")) return go(cur - 1);
        if (t.closest(".gtn-next")) return cur === pages.length - 1 ? finish() : go(cur + 1);
      });
      document.addEventListener("keydown", onKey);
      // 마우스를 따라 패널과 달이가 살짝 기울어 입체로 보인다
      if (!reduced()) el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      });
      mount.appendChild(el);
      setMuteIcon(); setLead(0); go(0, true);
      const introEl = el.querySelector(".gtn-intro");
      if (introEl) { Sound.play("chime"); setTimeout(() => { if (introEl.parentNode) introEl.remove(); }, 1500); }
    });
  }

  /** 지진 발생 연출: 고요한 밤 → 진동 → 긴급재난문자. 버튼을 누르면 resolve. */
  function showQuake(mount) {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "gtn-overlay gtn-quake" + (prepareMount(mount) ? " gtn-fixed" : "");
      el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "긴급재난문자: " + QUAKE.city + " 규모 " + QUAKE.magnitude + " 지진");
      el.innerHTML = '<div class="gtn-quake-bg">' + sceneSvg("quake") + '</div><div class="gtn-quake-flash"></div>' +
        '<div class="gtn-quake-night"><small>1일차 밤</small><strong>' + QUAKE.time + "</strong><span>" + QUAKE.city + ", 모두가 잠든 시각…</span></div>" +
        '<div class="gtn-quake-boom" aria-hidden="true">쿠구구궁!</div>' +
        '<div class="gtn-alert"><div class="gtn-alert-head"><span>🚨 긴급재난문자</span><span>' + QUAKE.time + '</span></div><p class="gtn-alert-mag">규모 <b>' + QUAKE.magnitude + "</b></p><h2>" + QUAKE.city + " 강진 발생</h2><p>[행정안전부] 오늘 " + QUAKE.time + " " + QUAKE.city + " 인근에서 규모 " + QUAKE.magnitude + ' 지진이 발생했습니다. 낙하물에 주의하고 안전한 곳으로 대피하세요.</p><ul><li>보급로 <b>5개 노선</b> 전면 통제</li><li>산간 마을 <b>10곳</b> 고립</li><li>조달청 <b>비상근무</b> 전환</li></ul><button type="button" class="gtn-next gtn-final-btn">호외 뉴스 보기</button></div>';
      mount.appendChild(el);
      const still = reduced();
      const timers = [];
      let stage = 0;
      function toStage(n) {
        if (n <= stage) return; stage = n;
        el.dataset.stage = String(n);
        if (n === 1) { Sound.play("rumble"); if (!still) { mount.classList.add("gtn-shaking"); timers.push(setTimeout(() => mount.classList.remove("gtn-shaking"), 1900)); } }
        if (n === 2) { mount.classList.remove("gtn-shaking"); Sound.play("alert"); el.querySelector(".gtn-next").focus(); }
      }
      if (still) toStage(2);
      else { el.dataset.stage = "0"; timers.push(setTimeout(() => toStage(1), 1700), setTimeout(() => toStage(2), 3700)); }
      const onKey = (e) => trapFocus(el, e);
      document.addEventListener("keydown", onKey);
      el.addEventListener("click", (e) => {
        if (e.target.closest(".gtn-next")) {
          timers.forEach(clearTimeout); mount.classList.remove("gtn-shaking"); document.removeEventListener("keydown", onKey);
          return closeOverlay(el, resolve);
        }
        toStage(2); // 아무 곳이나 누르면 연출을 건너뛴다
      });
    });
  }

  /* ═════════════ 6. 세션 연결 ═════════════ */

  /**
   * opts = { session, system, mount, assets:{dari}, storage, storageKey, sound }
   * session: 6번 system.createSession()이 만든 객체 (모든 탭이 같은 객체를 쓴다)
   */
  function create(opts) {
    opts = opts || {};
    const session = opts.session;
    const system = opts.system || (typeof GoldenTimeSystem !== "undefined" ? GoldenTimeSystem : null);
    const storage = opts.storage !== undefined ? opts.storage : typeof localStorage !== "undefined" ? localStorage : null;
    const key = opts.storageKey || "golden-time-news";
    const read = (k) => { try { return storage && storage.getItem(k); } catch (e) { return null; } };
    const write = (k, v) => { try { if (storage) storage.setItem(k, v); } catch (e) { /* 저장 실패는 진행을 막지 않는다 */ } };
    let st = Object.assign(freshState(), JSON.parse(read(key) || "null") || {});
    const save = () => write(key, JSON.stringify(st));
    if (st.nights[DAYS]) { st.nights[DAYS].dari[2] = "해원시의 복구 상황을 함께 확인해 봐요."; save(); }
    Sound.setEnabled(opts.sound !== false);
    Sound.setMuted(read(key + "-muted") === "1");

    const safe = (fn, fallback) => { try { return fn(); } catch (e) { if (typeof console !== "undefined") console.warn("[GoldenTimeNews]", e); return fallback; } };
    const gameState = () => (session && session.getState ? safe(() => session.getState(), null) : null);
    const summary = () => { const g = gameState(); return g && system && system.summarize ? safe(() => system.summarize(g), g) : g; };
    const mount = () => opts.mount || document.body;
    const today = () => (gameState() || {}).day || 1;
    const lastClosedDay = () => { const s = summary(), list = s && s.dailyResults; return list && list.length ? list[list.length - 1].day : null; };
    function scoresFor() {
      const s = summary(); if (!s || !s.scores) return null;
      const out = {};
      Object.keys(s.scores).forEach((k) => { if (!s.scoredCategories || s.scoredCategories.indexOf(k) >= 0) out[k] = s.scores[k]; });
      return out;
    }
    const uiOpts = (o) => ({ assets: opts.assets, confirmLabel: o && o.confirmLabel, readOnly: o && o.readOnly, intro: o && o.intro, onMute: (m) => write(key + "-muted", m ? "1" : "0") });

    const api = {
      objectives: OBJECTIVES, quake: QUAKE, days: DAYS,

      /** 2·3·4번 탭의 하루 결과를 알려 준다. 같은 날 여러 번 부르면 항목별로 덮어쓴다. */
      reportDay(day, raw) {
        raw = raw || {};
        const n = normalizeInputs(raw), cur = st.inputs[day] || {};
        const inc = new Set((st.raw[day] && st.raw[day].incomplete) || []);
        ["contractQ", "reserveQ", "innovationQ"].forEach((k) => { if (n[k] != null) cur[k] = n[k]; });
        if (raw.contract) cur.falseApprovals = n.falseApprovals;
        n.incomplete.forEach((k) => { const qk = k === "reserve" ? "reserveQ" : "innovationQ"; if (cur[qk] == null) { cur[qk] = 0; inc.add(k); } });
        ["reserve", "innovation"].forEach((k) => { if (raw[k]) inc.delete(k); }); // 나중에 결과가 들어오면 미완료 표시를 푼다
        st.inputs[day] = cur;
        st.raw[day] = Object.assign(st.raw[day] || {}, clone(raw));
        st.raw[day].incomplete = Array.from(inc);
        save(); return clone(cur);
      },

      getMarket: (day) => getMarket(st, day || today()),
      getMorningNews: (day) => buildMorningNews(st, day || today()),
      getTicker: (day) => api.getMorningNews(day).ticker,
      getHints: (day) => api.getMorningNews(day).hints,

      /** 그날 밤 뉴스를 계산한다. 한 번 계산한 밤은 다시 불러도 같은 결과다. */
      getNightNews(day) {
        if (!st.nights[day]) {
          st.nights[day] = buildNightNews(st, day, scoresFor());
          if (day === DAYS) attachHistory(st, st.nights[day]);
          save();
        }
        return clone(st.nights[day]);
      },

      /** 아침: 뉴스를 띄우고, 마지막 버튼을 누르면 applyMorningOutcomes()로 전날 밤 결과를 한 번 반영한다. */
      playMorning(o) {
        o = o || {};
        const news = api.getMorningNews(o.day);
        st.seenMorning = Math.max(st.seenMorning || 0, news.day); save();
        return showNews(mount(), news, uiOpts(o)).then(() => {
          if (o.apply !== false && session && session.applyMorningOutcomes) safe(() => session.applyMorningOutcomes());
          return news;
        });
      },

      /**
       * 밤: closeDay() 뒤에 부른다. 1일차 밤이면 지진을 일으키고 beginDisaster()를 호출한다.
       * 1~4일차는 결과를 queueMorningOutcome()으로 다음 날 아침에 넘긴다. 5일차는 엔딩 뉴스다.
       */
      playNight(o) {
        o = o || {};
        const day = o.day || lastClosedDay() || today();
        const news = api.getNightNews(day), g = gameState();
        let chain = Promise.resolve();
        if (day === QUAKE.day) {
          if (session && session.beginDisaster && !(g && g.disaster && g.disaster.active)) {
            safe(() => session.beginDisaster(QUAKE.status, OBJECTIVES.map((x) => ({ id: x.id, label: x.label, target: x.target }))));
          }
          if (o.quake !== false) chain = showQuake(mount());
        }
        if (day < DAYS && session && session.queueMorningOutcome && !st.nights[day].queued) {
          safe(() => session.queueMorningOutcome(toMorningOutcome(st, news), "day-" + day + "-night-outcome"));
          st.nights[day].queued = true; save();
        }
        return chain.then(() => showNews(mount(), news, uiOpts(o)));
      },

      /** 지나간 뉴스를 다시 본다 (업무 중 언제든 호출 가능). */
      openArchive() {
        const items = [];
        for (let d = 1; d <= DAYS; d++) {
          if (d <= (st.seenMorning || 0)) items.push({ day: d, type: "morning", label: d + "일차 아침 뉴스", title: MORNING[d].title });
          if (st.nights[d]) items.push({ day: d, type: "night", label: d + "일차 밤 뉴스", title: st.nights[d].headline.title });
        }
        return new Promise((resolve) => {
          const host = mount();
          (function list() {
            const el = document.createElement("div");
            el.className = "gtn-overlay gtn-archive" + (prepareMount(host) ? " gtn-fixed" : "");
            el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "지난 뉴스");
            el.innerHTML = '<div class="gtn-archive-box"><header><strong>📰 지난 뉴스</strong><button type="button" class="gtn-x" aria-label="닫기">✕</button></header>' +
              (items.length ? "<ul>" + items.map((it, i) => '<li><button type="button" data-a="' + i + '"><em class="gtn-a-' + it.type + '">' + esc(it.label) + "</em><span>" + esc(it.title) + "</span></button></li>").join("") + "</ul>" : '<p class="gtn-empty">아직 지나간 뉴스가 없어요.</p>') + "</div>";
            const close = (then) => { document.removeEventListener("keydown", onKey); closeOverlay(el, then); };
            const onKey = (e) => { trapFocus(el, e); if (e.key === "Escape") close(resolve); };
            document.addEventListener("keydown", onKey);
            el.addEventListener("click", (e) => {
              const b = e.target.closest("[data-a]");
              if (b) {
                const it = items[Number(b.dataset.a)];
                const news = it.type === "morning" ? buildMorningNews(st, it.day) : clone(st.nights[it.day]);
                return close(() => showNews(host, news, uiOpts({ readOnly: true, intro: false })).then(list));
              }
              if (e.target.closest(".gtn-x") || e.target === el) close(resolve);
            });
            host.appendChild(el);
            (el.querySelector("[data-a]") || el.querySelector(".gtn-x")).focus();
          })();
        });
      },

      /** 상단 티커 영역에 오늘 아침 한 줄 뉴스를 흘린다. */
      mountTicker(el, day) {
        el.classList.add("gtn-ticker", "gtn-ticker-inline");
        el.innerHTML = "<b>뉴스</b><div><span>" + api.getTicker(day).map(esc).join("　◆　") + "</span></div>";
      },
      /** 1번 화면에 지도를 직접 그리고 싶을 때: 현재까지의 재난 현황 지도 SVG 문자열 */
      getMapSvg(day) { const n = st.nights[day || Math.max(1, today() - 1)]; return n ? mapSvg(n.metrics) : ""; },

      resumeSound() { Sound.resume(); },
      setMuted(v) { Sound.setMuted(v); write(key + "-muted", v ? "1" : "0"); },
      /** 새 게임을 시작할 때 부른다. */
      reset() { st = freshState(); try { if (storage) storage.removeItem(key); } catch (e) { /* 무시 */ } },
      getState: () => clone(st)
    };
    return api;
  }

  return {
    create, OBJECTIVES, QUAKE, DAYS,
    // 화면 없이 쓰는 순수 함수 (테스트·다른 셸 연동용)
    freshState, normalizeInputs, buildMorningNews, buildNightNews, attachHistory, toMorningOutcome, getMarket,
    showNews, showQuake, mapSvg, dariSvg, portraitSvg, defsSvg, ensureDefs
  };
});
