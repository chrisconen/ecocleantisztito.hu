# ECO Clean material follow-up implementation

Goal: simplify the result, fix narrow-screen layout, and make human review and
verified sample collection practical without confusing model output with evidence.

Execute sequentially in this session. Existing release baselines remain immutable.

- [x] Result: update `demo/material-review/app.js` and `design.css`; show one
  structural reason and calculator/email actions, put optional label and detailed
  information in native details elements for likely_other only. Extend the existing
  `verify-ui.py` to cover all four result states and keyboard-accessible disclosure.
- [x] Mobile: reproduce the 320 px service title and booking header overflow.
  Append scoped mobile CSS from `demo/material-review/home-mobile.css` to the
  verified parent `ui/design.css`; version only its index reference. Extend the
  review overlay's exact scope and restoration verification for this third asset.
  Verify 320/360/390/768/1440 px with actual element geometry and screenshots.
- [x] Operations: enhance `review_inbox.py` with pending-first oldest-first order,
  counts, last refresh, a daily checklist and recorded completion (outcome, evidence,
  timestamp, explicit reply-sent attestation). Test ordering and completion state.
  Provide a local interactive launcher so closing requests needs no UUID typing.
- [x] Samples: provide a private, evidence-labelled validation collection and its
  collection guide. Seed the user's own woven caravan photo as owner-attested,
  keeping exact composition/brand unknown. No email-review consent is reused and
  no sample becomes an active provider reference automatically. Test hash,
  provenance and duplicate handling; generate a local gallery.
- [x] Verify, publish and check live: release gate and package provenance, UI
  checks, operational tests, scoped staging, GitHub Pages deployment and exact
  public hashes. Regenerate the private review dashboard and check background sync.

Boundaries: browser result is unverified; a human records the decision and sends
the reply. Review storage and reusable reference storage are separate. A local
dashboard is a snapshot and cannot imply current online state while the PC is off.
Future specimen accuracy requires real evidence; this implementation cannot
manufacture independently verified labels for future customer photos.


Completed 2026-09-09. Website commit `a8c9661`; GitHub Pages run `34358299125`
succeeded. Manifest SHA-256:
`7bcf43df63650f32cf6b8bfe29e22f654456a1b394039d5e4be2599cda05696b`.

- Release: 142 pages, 21,279 links, 2,660 assets; zero issues.
- Staged package: 371 files; no private photographs or customer records.
- Live static verification: 160 requests / 159 unique files; all hashes match.
- Local and live UI: 9 cases each, including all four result states.
- Local and live main page: 320/360/390/768/1440 px; no tested element overflow.
- Actual owner photo: live UI at 390/1440 px, likely_other, three references,
  no archive writes, one calculator action, optional label control hidden.
- Operations: 14 tests across review inbox, validation samples and background sync.
- Private launcher and guide installed. Background sync restarted successfully.
- One owner-attested woven control photo stored privately and kept out of active
  provider references. Future collection remains an ongoing operator routine;
  the documented 12-specimen target is not a claim of samples already collected.
