# ECO Clean material follow-up implementation

Goal: simplify the result, fix narrow-screen layout, and make human review and
verified sample collection practical without confusing model output with evidence.

Execute sequentially in this session. Existing release baselines remain immutable.

- [ ] Result: update `demo/material-review/app.js` and `design.css`; show one
  structural reason and calculator/email actions, put optional label and detailed
  information in native details elements for likely_other only. Extend the existing
  `verify-ui.py` to cover all four result states and keyboard-accessible disclosure.
- [ ] Mobile: reproduce the 320 px service title and booking header overflow.
  Append scoped mobile CSS from `demo/material-review/home-mobile.css` to the
  verified parent `ui/design.css`; version only its index reference. Extend the
  review overlay's exact scope and restoration verification for this third asset.
  Verify 320/360/390/768/1440 px with actual element geometry and screenshots.
- [ ] Operations: enhance `review_inbox.py` with pending-first oldest-first order,
  counts, last refresh, a daily checklist and recorded completion (outcome, evidence,
  timestamp, explicit reply-sent attestation). Test ordering and completion state.
  Provide a local interactive launcher so closing requests needs no UUID typing.
- [ ] Samples: provide a private, evidence-labelled validation collection and its
  collection guide. Seed the user's own woven caravan photo as owner-attested,
  keeping exact composition/brand unknown. No email-review consent is reused and
  no sample becomes an active provider reference automatically. Test hash,
  provenance and duplicate handling; generate a local gallery.
- [ ] Verify, publish and check live: release gate and package provenance, UI
  checks, operational tests, scoped staging, GitHub Pages deployment and exact
  public hashes. Regenerate the private review dashboard and check background sync.

Boundaries: browser result is unverified; a human records the decision and sends
the reply. Review storage and reusable reference storage are separate. A local
dashboard is a snapshot and cannot imply current online state while the PC is off.
Future specimen accuracy requires real evidence; this implementation cannot
manufacture independently verified labels for future customer photos.
