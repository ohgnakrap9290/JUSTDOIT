# BITLAB

업비트 `KRW-BTC` 15분봉으로 전략을 검증하는 브라우저 백테스트 도구입니다.

## Commands

```bash
npm install
npm run dev
npm test
npm run backtest -- --days=365 --strategy=pullback-breakout
```

## Strategy modules

전략은 `src/strategies`에 추가하고 `src/strategies/index.js`에 등록합니다.

각 전략은 다음 인터페이스를 구현합니다.

- `prepare`: 전체 데이터에서 지표 계산
- `createRuntime`: 실행 중 상태 생성
- `onFlat`: 미보유 상태에서 진입 신호 생성
- `buildEntry`: 다음 봉 시가 기준 포지션 크기와 손절가 계산
- `onPosition`: 보유 중 종가 기반 청산 신호 생성

체결, 비용, 일일 손실 제한, 연속 손실 쿨다운은 공통 엔진에서 처리합니다.

## Current research result

2026-06-14 기준 1년 백테스트:

- 전략: 추세 돌파 후 눌림목
- 거래: 20회
- 승률: 35%
- 순수익률: -1.445%
- 최대 낙폭: 1.445%
- Profit Factor: 0.335

현재 전략은 paper trading 통과 기준을 충족하지 못했습니다.
