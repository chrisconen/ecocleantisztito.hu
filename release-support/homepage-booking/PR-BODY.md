Remove the full booking form from the Hungarian and English homepages. Homepage calls to action now lead to city discovery, while the unchanged booking section lives at `megrendeles.html` and `en/booking.html` with its existing calendar, accessibility enhancements and cart UI.

All 52 Studio calculators explicitly hand off to the appropriate dedicated form. Existing HTML booking links are updated; previously saved homepage `#booking` URLs and encoded carts redirect to the new form without losing the fragment. Inquiry-only regions remain unchanged. The homepage travel description now reflects Győr's free city travel and other regions' local fees.

Financial and calendar runtimes remain byte-identical. Tests compare the entire relocated form with the previous production HTML. Validation: 51 structure, pricing, navigation and booking checks; HU/EN mobile and desktop handoff and legacy-link browser checks; local 15:00 selection; independent review; release, package and staged gates. All external booking writes are blocked during browser testing.

The two checkout pages intentionally use `noindex,follow`; public landing-page indexing is unchanged. A narrowly scoped package check permits that exact directive only for those two files. The previous English booking runtime's language behavior is retained.
