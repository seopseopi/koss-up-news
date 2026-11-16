# 5번 재난·뉴스 이벤트 (담당: 이민섭)

아침 뉴스, 1일차 밤 대형지진, 퇴근 후 밤 뉴스, 5일차 엔딩 뉴스를 만들고 화면에 띄우는 모듈입니다.
점수와 예산은 건드리지 않고, 6번 시스템에는 재난 지표와 다음 날 아침에 적용할 결과만 넘깁니다.

| 파일 | 내용 |
| --- | --- |
| `golden-time-news.js` | 시나리오 데이터, 뉴스 생성 로직, 화면, 효과음 (`GoldenTimeNews`). 이미지·음원 파일 없이 동작 |
| `golden-time-news.css` | 뉴스·지진 연출 스타일. 클래스는 모두 `gtn-` 접두사라 다른 탭과 겹치지 않음 |
| `index.html` | 5번만 따로 돌려 보는 데모 (임시 세션 사용) |

데모 실행: 이 폴더에서 `python3 -m http.server` 후 `index.html` 열기.

## 화면 구성

- **아침 뉴스 (2쪽)**: ① 머리기사와 기사 목록(누르면 본문) ② 원자재 시황(지수·추세선) + 탭별 "오늘의 업무 포인트"
- **지진 연출 (1일차 밤)**: 23:47 고요한 밤 → 화면 흔들림 → 긴급재난문자. 아무 곳이나 누르면 건너뜀
- **밤 뉴스 (3쪽)**: ① 머리기사 + 진척도·시민 만족도·복구율 ② **내 선택 → 현장 결과 → 시민 반응**을 업무별 세로 카드 3장으로 ③ 해원시 지도(보급로·대피소·고립 마을·건물)와 목표별 달성
- **엔딩 뉴스 (4쪽)**: 위 3쪽 + 닷새의 기록(진척도·만족도 그래프, 결정적 순간, 종합 평가)
- **지난 뉴스**: 업무 중 언제든 지나간 뉴스를 다시 볼 수 있음
- 조작: 버튼 또는 ← → 키, 효과음 켜기/끄기(🔊), 움직임 줄이기 설정을 켠 기기에서는 연출 생략

## 확정한 시나리오

- 지진: **1일차 밤 23:47, 해원시 규모 7.8**. 1일차 낮은 전조 단계(D-1), 2일차가 D+1
- 재난 목표 4개 (지진 순간 `beginDisaster`로 한 번 등록, ID 고정)

| id | 표시명 | 목표 | 주로 좌우하는 업무 |
| --- | --- | --- | --- |
| `relief-supplies` | 구호물품 공급 | 100 (천 세트) | 2번 계약 심사 + 3번 비축 |
| `routes` | 보급로 복구 | 5 (개 노선) | 3번 비축 |
| `drone-deliveries` | 의료·생활 지원 | 10 (고립 마을 수) | 4번 기업 지원(운송 드론) |
| `city-recovery` | 도시 복구 | 100 (%) | 세 업무 종합 |

- 아침 시황(1일차=100 지수): 철강·시멘트는 2~3일차 급등 후 5일차 하락, 경유는 3일차 고점, 목재는 4일차 급등. 전날 비축 충족률이 낮으면 철강·시멘트가 최대 6%p 더 오름
- 밤 기사: 업무 3개 × 수준 3단계 × 5일로 날마다 다른 제목. 부실 업체를 승인하면 [단독] 불량 물품 회수 기사
- 엔딩: 최종 진척도 85% 이상 "골든타임을 지켰다", 55% 이상 "절반의 회복", 그 미만 "늦어진 복구"

## 연결 방법

```html
<link rel="stylesheet" href="golden-time-news.css">
<script src="golden-time-system.js"></script>
<script src="golden-time-news.js"></script>
```

```js
// 1번: 세션을 만든 곳에서 한 번 생성. mount는 게임 화면 컨테이너
const news = GoldenTimeNews.create({
  session,                          // 6번 createSession()이 만든 객체
  mount: document.querySelector("#game"),
  assets: {                         // 전부 선택. 생략한 것은 내장 그림 사용
    dari: { happy: "img/dari-happy.png", calm: "img/dari-calm.png", worry: "img/dari-worry.png", sad: "img/dari-sad.png" }, // 달이 (한 장 또는 표정별)
    citizens: { evacuee: "img/grandma.png", driver: { joy: "img/driver-joy.png", default: "img/driver.png" } }, // 시민 (id별 한 장 또는 표정별)
    scenes: { quake: "img/quake.jpg" }                            // 기사 사진 (city, quake, bridge, truck, drone, mountain, warehouse, market, shelter, office, sunrise)
  }
});

news.reset();                       // 새 게임 시작 시

// 아침: 뉴스를 띄우고, "업무 시작"을 누르면 session.applyMorningOutcomes()까지 호출
await news.playMorning();
news.mountTicker(document.querySelector("#ticker")); // 상단 한 줄 뉴스

// 낮: 2·3·4번은 그날 결과가 확정되면 한 줄씩 알려 주세요 (6번 applyOutcome과 별개)
news.reportDay(day, { contract: { correct: 2, ordinaryWrong: 0, falseApproval: 1 } }); // 2번: 오늘 판정 건수
news.reportDay(day, { reserve: { requiredQuantity: 100, availableQuantity: 80 } });    // 3번
news.reportDay(day, { innovation: { decision: "success" } });                          // 4번: success | partial | failure

// 저녁: closeDay() 다음에 호출. 1일차는 지진 연출 + beginDisaster, 1~4일차는 queueMorningOutcome까지 처리
session.closeDay();
await news.playNight({ day });      // 5일차는 엔딩 뉴스

news.openArchive();                 // "지난 뉴스" 버튼에 연결
```

- `reportDay`를 안 부른 항목은 6번 점수(청렴도·경제 방어력·혁신 기여도) → 전날 값 → 중간값 순으로 대신 씁니다.
- 3번이 쓸 시황: `news.getMarket(day)` → `[{ id: "steel", label: "철강", index: 118, change: 18, history: [100, 118] }, ...]`
- 화면 없이 데이터만: `news.getMorningNews(day)`, `news.getNightNews(day)`, `news.getHints(day)`, `news.getMapSvg(day)`
- 다음 날 아침에 넘기는 값: `queueMorningOutcome(outcome, "day-N-night-outcome")`의 `disasterStatus`, `disasterMetrics`(누적 달성량), `details.effects`(`nextDayDeliveryCapacity`, `openRoutes`, `droneLevel`, `market`). `budgetDelta`는 보내지 않습니다.
- 5일차 밤 결과는 규칙대로 큐에 넣지 않습니다. 엔딩 화면에 최종 재난 수치가 필요하면 `news.getNightNews(5)`의 `metrics`, `progress`를 쓰세요.
- 효과음을 아예 끄려면 `create({ sound: false })`.

## 팀 통합 현황 (11/16 기준)

- **1번 채린님**의 [koss-up-ui](https://github.com/odidoddixb/koss-up-ui)가 이 모듈을 `modules/`에 넣어 메인 화면·2번·6번과 연결해 돌리고 있습니다(3·4번은 추가 연결 예정). 그 과정에서 채린님이 고친 아래 항목을 이 레포에도 같은 내용으로 반영했습니다.
  - `reportDay`의 `contract`에 `unresolved`(미처리 건수)를 넣을 수 있음. 전체 건수에 포함됩니다.
  - 시황 그래프 끝 점이 잘리던 문제(좌표와 여백) 수정
  - 5일차(엔딩) 지도 쪽 달이 대사에서 "내일"이 나오던 문제 수정
  - Safari에서 소리가 끊기던 문제 보완(`interrupted` 복구, 닫힌 컨텍스트 재생성), 뉴스 상단 "소리 다시 연결" 버튼, `news.resumeSound()` 추가
  - 이전/다음 버튼 글자 가운데 정렬
- **4번 서린님**은 `news.reportDay(day, { innovation: { decision } })`로 결과를 넘깁니다. 1일차 드론은 3일차에 결과가 확정되므로 1일차에 넘기는 값은 잠정 판단입니다.
- **6번 서윤님**의 [golden-time-system.js](https://github.com/seoyoon-riley/26-KOSS-UP)가 공개돼 실제로 붙여 봤습니다. `createSession`으로 5일을 돌리며 `beginDisaster`, `queueMorningOutcome`, `applyMorningOutcomes`, `closeDay`를 모두 호출했고 오류 없이 끝까지 진행됩니다(Node 로직 검증, 화면 제외).
- 알아둘 차이: 시스템의 `disaster.progress`는 소수(예: 3.5)이고 뉴스 화면은 반올림한 정수(4)라 최대 0.5%p 다를 수 있습니다. 메인 화면에서 둘을 같이 보여 줄 때만 신경 쓰면 됩니다.

## 아직 확인하지 못한 것

- 실제 Mac Safari 스피커 출력은 확인하지 못했습니다(채린님 쪽도 같은 상태).
- 달이·시민 그림은 이미지 생성 AI로 만든 3D 렌더이고, 기사 사진 일부는 팀 디자인 시트의 배경 그림을 잘라 썼습니다. 해상도가 낮아 원본 파일이 있으면 `img/`에 바꿔 넣으면 됩니다.
