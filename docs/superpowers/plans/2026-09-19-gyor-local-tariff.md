# Győr city tariff implementation plan

**Goal:** Apply reduced prices and free travel only to Győr city addresses, preserving other towns and surrounding villages.

**Architecture:** Extend the current reversible content-clarity overlay. Store local numeric overrides in the tariff snapshot; derive both booking languages and Studio from them. Select local prices only for city `gyor` with zone `belvaros` or `kulso`. Historical baselines stay immutable.

**Tech stack:** Existing JavaScript calculators, deterministic Node preparation, Python byte-edit proof, Node/jsdom offline tests.

## Owner scope

The owner authorized lower prices than the researched competitors, free travel inside Győr, and explicitly limited lower prices to Győr. No minimum order or new restrictions are introduced. Existing discounts continue. The chosen list is an implementation decision within that authorization, not a verified profitable price floor.

Reference prices: ThomasClean https://www.thomasclean.hu/karpittisztitas/ ; KárpitGyőr https://karpitgyor.hu/karpittisztitas-cegeknek/ ; TisztaPont https://tisztapont24.hu/arlista/ (researched 2026-09-19). Chair comparisons use whole-chair prices, not the 500 Ft partial-surface starting price. Combined L/U ranges do not distinguish furniture dimensions. No universal cheapest-in-market claim is justified.

## Tasks

- [x] Add `gyorCity` overrides in `release-support/content-clarity/tariff.json`: sofa 7900, L 17900, U 18900, armchair 3900, dining/office chairs 2400. Dry single mattress 4900/5900, double 6900/7900, child 2900/3900, cot 2400/3400 (one/two sides). Wet supplement 1900 per adult side, 900 per child/cot side. Bed/frame supplement 3900. Cushion 400. Other extras without equivalent public benchmarks retain their rates.
- [ ] Add `gyor-local.mjs` to derive scoped calculator logic, visible prices, travel fees, handoff validation and HU/EN published price lists. Import before cache-key derivation in `prepare.mjs`.
- [x] Test city/zone boundaries, repeated city changes with retained basket, all mattress sides/extras, bilingual parity, tariff handoff and actual request payload offline. Ensure the old tariff remains unchanged outside Győr city.
- [ ] Run prepare/build, Node regression suites, full release verification and package proof in sequence. Review diff; publish via existing release workflow and inspect public assets.

## Boundaries and risks

Costs and margins are unknown; this is an owner-authorized price reduction, not evidence of profitability. Address zone is customer supplied; browser consistency is not a server-side pricing security boundary. Do not send test bookings or messages to customers. Existing durations/capacity remain unchanged. Regional navigation is the next separate work item requested by the owner.
