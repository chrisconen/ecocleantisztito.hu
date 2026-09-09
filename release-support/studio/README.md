# Studio production integration

The finished Studio pages existed only in `demo/`. The live release had the old
hero and service sections with the newer material widget and copy fixes added.
Matching the deployed file hashes therefore did not establish design completeness.

This integration applies the existing Studio renderer to the **current verified
release**, preserving its informal Hungarian copy, original reference photos,
navigation and material-recognition feature. Scope: the 26 online upholstery city
pages plus the homepage's explicit basket-import receiver. The 15 email-only
regional pages, mattress pages and existing booking runtime remain unchanged.

The shared renderer is `demo/studio/transform.mjs`. The standalone demo builder
uses the same function with its original frozen inputs. Production uses the
current release as its input, avoiding restoration of old formal wording.

The new pages include the interior hero, room selector, six illustrated furniture
categories, price configurator, home comparison, wear hotspots, mite illustrations,
material guide, care questions and generated icon atlas. A narrow contrast rule
keeps the rental-menu icon readable on its light background.

The configurator transfers supported product IDs, counts, extras, city and zone
to `index.html#booking?eco-config=…`. The customer explicitly imports the basket;
the live booking code recalculates prices and duration. Importing is not booking.
The email-only cities cannot use this path.

`build.mjs` first validates the parent manifest/report. It snapshots the 27 input
HTML files and only changes those pages, adding 16 Studio runtime/image assets.
`overlay.json` binds those files and their sources by SHA-256. Existing record
metadata is preserved. The homepage is one reversible, marked insertion.

`verify-studio-overlay.py` restores the parent view, then runs the original
copy/widget verification chain. Its previous baselines are never overwritten.
`verify-content.mjs` independently checks retained text, photos and navigation,
new sections/hero, local continuation, emoji removal, IDs and JavaScript syntax.

```powershell
node release-support/studio/build.mjs --write
node release-support/studio/verify-content.mjs
node release-support/verify-release.mjs
python release-support/verify-package.py
python release-support/studio/verify-layout.py
python release-support/studio/verify-booking.py
python release-support/verify-staged.py
```

Layout coverage: 26 pages at 320, 390, 768 and 1440 px, plus Győr at 1920 px.
Booking coverage uses the actual release runtime at 390/1440 px, including
invalid imports, tariff mismatches and the existing large-order branch.
Tests mock all writes and do not create bookings, send emails or process photos.
Detailed screenshots and reports are in `qa/`; they are not part of the public website artifact.

After GitHub Pages deployment, run `verify-material-live.py` for exact public-file
hash checks and the Studio browser tests with `--live`. Design-completeness
checks are required in addition to package/deployment checks.
