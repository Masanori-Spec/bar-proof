# Verification record

Date: 2026-10-04 UTC. Version: 0.1.0. Source revised after independent review; browser and publication stages remain pending.

## Passed locally

- Node 24.19.0 / Python 3.12.14
- Syntax checks across application, scripts, Node tests and authored browser tests
- Runtime source check rejects direct fetch, XMLHttpRequest, eval/new Function and persistent storage primitives
- `python3 tests/oracle.py --check`: independent exact fixture matches, 22 cases / 28 measures
- `npm test`: 75 tests passed, 0 failed, 0 skipped
- `npm run build`: static application and deterministic standalone worker bundle built
- Worker bundle/source identity and isolated execution of the actual standalone worker code checked
- `npm run check`: aggregate passed against final source
- Independent reviewer regressions cover optional voice annotations, bounded composite meters, XML stylesheet processing instructions and diagnostic-metadata amplification
- Resource caps were tightened after adversarial review; oversized replacement now cancels the prior import generation before rejecting

The oracle fixture includes full explicit arithmetic expectations independent of the production parser. Metamorphic tests cover positive scaling, whitespace/visual notation changes and equivalent voice-block ordering. Adversarial tests cover XML entity/DTD/namespace restrictions, malformed structure, byte/depth/event caps, safe archive paths, duplicate entries, wrong rootfiles, ZIP integrity, streaming descriptors and inflation limits. Report tests cover text escaping, provenance and bilingual descriptions.

## Authored but not run

- 12 Chromium browser scenarios, sandbox enabled
- Japanese/English layout, keyboard focus, repeated labels and event evidence
- Reset cancellation, malformed replacement preservation, repeat import
- Stored/deflated MXL interface behavior
- Interrupted worker, newer import wins, no reset resurrection
- Offline import, actual JSON and bilingual HTML downloads
- Printable whole-score report and selected-measure screen print
- Hostile imported text / external DTD or image references with request recording
- Long Japanese labels and widths 1440, 768, 390, 320
- Reload clears state, unique IDs and no uncaught page errors
- Screenshot inspection, PDF visual QA, formal accessibility audit
- GitHub Actions on Node 22/24, UTC/Asia/Tokyo and ubuntu-22.04 browser job

Local browser launch is known restricted by the environment's socket/ptrace policy; cloud-browser localhost access is blocked. Neither path was retried or bypassed. The approved future route is standard hosted GitHub Actions with `chromiumSandbox: true`, following independent review and authorized publication. No browser, CI or visual pass is implied by the Node results.

## Remaining validation

1. Independent code/security review of the frozen source and manifest
2. Authorized repository publication, exact-commit CI checks, then review of screenshots and PDFs
3. Permission-cleared real exports from multiple notation programs; measure unsupported-context frequency and false positives
4. User usefulness interviews if separately authorized

This prototype does not perform full MusicXML/XSD validation. Scope warnings and unsupported states are part of the result, not test failures being hidden. No customer, usage, accuracy-rate or market evidence is claimed.
