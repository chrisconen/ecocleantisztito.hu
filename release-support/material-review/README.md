# Online material review

The customer can request human review by providing an email and purpose-specific
consent. The same chosen photo can be sent directly or after the instant result.
This route makes no vision-provider call and never sends customer email to one.
No onsite-check promise remains in the material-result flow.

The Worker validates the photo, email, consent, origin, challenge and quota, then
stores `reviews/photos/<uuid>.jpg` and a finalized `reviews/records/<uuid>.json`.
It acknowledges receipt only after both writes. The queue is private, separate
from reference collection. A preceding browser result is explicitly unverified.

The existing Windows background task downloads requests into the private folder
`E:\ECOCLEAN\anyag-referenciak\emailes-ellenorzes`. Open `index.html` there to review
photos and prepare a reply. Reply links open editable drafts in the operator's
mail application: **the operator reviews and sends the email**. This is not an
SMTP/transactional-email integration and it never auto-approves a photo.

Commands from the project folder:

```powershell
python services/material-recognition/review_inbox.py sync
python services/material-recognition/review_inbox.py gallery
python services/material-recognition/review_inbox.py complete --id UUID
```

The `complete` command marks a request closed locally after the operator sends
the reply; it does not send mail. No review image is activated as a reference.
The private operator endpoint permits deletion of a specific request when needed.

Deployment uses a bounded `reviewOverlay`: only the two widget assets and their
versioned references on 35 existing pages change. The parent Studio/copy/widget
proof is restored and rerun; the existing baselines are not overwritten. The
new sources are in `demo/material-review`, based on the current informal release
copy. Do not rerun the earlier widget/Studio builders over this later layer.

```powershell
python release-support/material-review/build.py --write
node release-support/verify-release.mjs
python release-support/verify-package.py
python release-support/material-review/verify-ui.py
```

Browser tests use mocked submission on index, Győr and Kalocsa at 320/390/1440 px.
The synthetic live round-trip test creates and removes only its own labelled
test request, with no real customer photo, provider call or email sending.
