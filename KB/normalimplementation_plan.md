# Auto-Trade Module Implementation Plan

Create a standalone production-ready NestJS service to handle automated trading logic independently of the existing AI engine.

## Proposed Changes

### [Component] New Service: `auto-trade-service`
A fresh NestJS project to house the trading flow.

#### [NEW] `auto-trade-service/`
- Standard NestJS scaffold (Main, App Module, etc.)

#### [NEW] `auto-trade/` Module
- **auto-trade.module.ts**: Registers the controller, service, and Mongoose schemas.
- **auto-trade.controller.ts**: Exposes Toggle and Status endpoints.
- **auto-trade.service.ts**: 
    - Implements `onPriceUpdate(price)` logic.
    - Handles state transitions (NONE -> BUY -> SELL).
    - Manages Trailing Profit (Activate @ +5, Exit @ -2 from Peak).
    - Manages Reversal (-5 from Entry).
- **schemas/auto-trade-control.schema.ts**: Persists the toggle state.
- **schemas/trade-state.schema.ts**: Persists the active position state (Entry, Peak, Trailing bool).

## Verification Plan

### Automated Tests
1. **Mock Price Feed Test**: 
    - Toggle Auto-Trade ON.
    - Inject current price -> Verify BUY (1 lot) entry in DB.
    - Inject Peak price (+10) -> Verify `trailingActive` = true.
    - Inject Pullback price (Peak - 3) -> Verify EXIT and Reset.
    - Inject Reversal price (Entry - 6) -> Verify EXIT BUY and Entry SELL.

### Manual Verification
1. Verify the `/auto-trade/status` and `/auto-trade/toggle` endpoints respond correctly.
2. Monitor log activity in terminal for "Trailing Activated", "Position Exited", etc.
