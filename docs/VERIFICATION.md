# Verification record

Date: 2026-10-04 UTC. Version: 0.1.0.

## Pinned hosted evidence

- Repository: [Masanori-Spec/bar-proof](https://github.com/Masanori-Spec/bar-proof)
- Tested commit: `3d93da05e35a5f42b7c3be336ca1c2f1b1dc2389`
- Successful [GitHub Actions run 37172746598](https://github.com/Masanori-Spec/bar-proof/actions/runs/37172746598)
- Downloaded artifact: `barproof-browser-evidence`
- Artifact archive SHA-256: `c3b8d96e077168c1de8ffba8f6c0650c0a5292f4e63ad29c7f8371d41565bb4e`, verified before extraction by the publisher
- Per-file hashes, exact scenarios, tested-source fingerprints and remaining limits: [browser-evidence/evidence.json](browser-evidence/evidence.json)

All five jobs passed. Four model jobs cover Node 22/24 × UTC/Asia/Tokyo; each passed 75 Node tests and the independent Python oracle with 22 cases / 28 measures. The browser job ran on `ubuntu-22.04`, Playwright 1.56.0, Chromium, with `chromiumSandbox: true`. All 12 scenarios passed with zero uncaught page errors.

This evidence describes the tested commit above. The later documentation/evidence publication head needs its own exact-head audit. The embedded record deliberately does not guess or self-certify that future commit.

## Browser scenarios actually exercised

1. Japanese initial view, keyboard skip link, demos and English navigation
2. Duplicate measure labels distinguished by ordinal and source evidence
3. Unsupported state visible, with reversible filtering
4. Reset cancellation, replacement preservation and repeated same-file imports
5. Real deflated MXL rootfile selection and error retention
6. Interrupted worker, newer import wins, no old-result resurrection after reset
7. Oversized replacement invalidates an interrupted generation and preserves the last completed result
8. Offline-after-load import and actual JSON / bilingual HTML downloads
9. Hostile imported text, external DTD and asset references execute/fetch nothing
10. Long Japanese labels and viewport widths 1440, 768, 390, 320 stay within the viewport
11. Selected-measure screen print keeps its scope and limitations visible
12. Reload clears state, IDs are unique and no uncaught page errors occur

The initial passing browser run exposed print-polish issues during artifact review. Those were fixed with meaningful A4 margins, compact selected-measure printing and a clipped/transparent unfocused skip link, then re-run in the corrected commit above. Only corrected artifacts are preserved as public evidence.

## Artifact inspection and content checks

- [Japanese desktop](browser-evidence/desktop-ja.png), [English source evidence](browser-evidence/desktop-en-evidence.png), [Japanese 390px viewport](browser-evidence/mobile-ja.png): inspected; no skip-link overlay in the corrected desktop capture
- [Full bilingual review PDF](browser-evidence/review.pdf): all six actual PDF pages inspected, with readable margins, source evidence and explicit limits
- [Selected-measure PDF](browser-evidence/selected-measure.pdf): one actual page inspected; all selected-measure scope and limitation text retained
- Actual [review.json](browser-evidence/review.json) deep-equals the production model output for the synthetic fixture and independently computed input SHA-256
- Actual [review.html](browser-evidence/review.html) is byte-identical to the report generator output
- The PDF checks verify Chromium-generated documents, not physical printer output

## Local and independent numerical verification

The final local aggregate passed syntax/security-primitive checks, all 75 Node tests, deterministic oracle verification, worker-bundle consistency/execution and static build. Local runtime: Node 24.19.0 / Python 3.12.14.

Sixteen independently authored reviewer regressions cover optional/differing chord voices, exact timing witnesses, inherited uncertainty, bounded composite-meter growth, diagnostic identity amplification, XML stylesheet processing instructions, MXL provenance and report escaping. The Python oracle supplies explicit arithmetic expectations without importing the production parser. Metamorphic checks cover positive scaling, whitespace/notation changes and equivalent voice-block reordering. A separate synthetic 20,000-event smoke case passed; its timing is not a general performance guarantee.

Local browser execution was restricted, so no local sandbox bypass was attempted. The actual browser execution used the standard hosted CI route above.

## Still unverified or out of scope

- Other browser engines, operating systems and physical mobile devices
- Real printers and hardware-specific print behavior
- Formal accessibility, WCAG conformance and screen-reader audits; keyboard checks alone do not establish these
- Permission-cleared real exports from multiple notation programs, measured false-positive rates, unsupported-context frequency and user usefulness interviews
- A later publication/documentation head unless its own exact-head CI/audit confirms it
- Full MusicXML/XSD validation, performance interpretation or musical correctness

No customer, usage, accuracy-rate, revenue, market-demand or patent-novelty claim is made. Unsupported calculations and declared limits remain part of the result.
