# BarProof

MusicXML の「なぜこの小節？」を、渡せる証拠に。  
A local-first rhythm handoff inspector for MusicXML.

BarProof reads the encoded duration timeline behind an exported score. It provides exact-fraction calculations, source witnesses, and a bilingual review packet for arrangers, engravers, and notation-workflow developers. It is a bounded inspection tool, not a score editor or a musical-correctness validator.

## 検証状況 / Verification status

[Published source](https://github.com/Masanori-Spec/bar-proof) · [Verified CI run](https://github.com/Masanori-Spec/bar-proof/actions/runs/37172746598) · [Evidence manifest](docs/browser-evidence/evidence.json)

- At tested commit `3d93da05e35a5f42b7c3be336ca1c2f1b1dc2389`, all five hosted CI jobs passed
- Each Node 22/24 × UTC/Asia-Tokyo job passed 75 tests and the independent Python Fraction oracle: 22 cases / 28 measures
- All 12 Chromium browser scenarios passed with the sandbox enabled and no uncaught page errors
- Actual desktop/mobile screenshots and all six full-report PDF pages plus the one-page selected-measure PDF were visually inspected
- Actual downloaded JSON matches the source model; downloaded HTML matches the report generator byte-for-byte; the input SHA-256 was independently checked
- [Independent technical review](docs/INDEPENDENT_REVIEW.md) is complete

This evidence is pinned to the tested commit above. Later documentation/evidence commits must be checked against their own exact-head CI; this record does not automatically certify them. Other browser engines, physical mobile devices, real printers, formal accessibility/screen-reader audits and a real-world multi-editor export corpus remain unverified.

[Desktop evidence](docs/browser-evidence/desktop-en-evidence.png) · [Japanese mobile evidence](docs/browser-evidence/mobile-ja.png) · [Bilingual report PDF](docs/browser-evidence/review.pdf) · [Selected-measure PDF](docs/browser-evidence/selected-measure.pdf)

Exact scope and limitations are in [docs/VERIFICATION.md](docs/VERIFICATION.md). No musical-correctness or full XSD-validation claim is made.

## 使い方 / Workflow

1. Open `.musicxml`, `.xml`, or `.mxl`, or try either original synthetic demo
2. Choose a part and measure. Labels can repeat; ordinals always identify the location
3. Compare meter length, maximum extent, and final cursor, in quarter-note units
4. Select timeline bars or expand the event ledger to inspect encoded duration, divisions, source child, and XML fragment
5. Save JSON or the self-contained JA/EN HTML report. The report includes every measure; direct screen printing includes only the selected measure

ファイルはブラウザ内の Worker で解析します。スコア、画像、DTD を外部に送信しません。自動保存もありません。ページを読み込んだ後は、通信を切った状態でもファイル読み込み・検査・エクスポートができる構成です。オフラインでのページ再読み込みは対応外です。上記の固定コミットでは、Linux 上の Chromium でオフライン読み込み・保存を確認しています。実機や他ブラウザでの検証は未実施です。

The app processes files in a bounded worker. A bundled, static worker is constructed from application code already loaded into the page, so later file imports do not require further module requests. Score text never becomes code. Once the app is loaded, offline import and export are designed to work; offline page reload is not supported. Offline-after-load import and export passed the pinned Linux Chromium browser run; other engines and real devices remain unverified.

## Run

Requires Node 22+ and Python 3.12+ for verification. No runtime packages, third-party assets, web fonts, analytics, account, API key, or backend.

```sh
npm run check
npm run serve
# http://127.0.0.1:4175
```

The source ZIP includes the generated worker bundle. `npm run build` rebuilds it deterministically from the reviewed modules and copies the static application into `dist/`. A worker consistency test detects stale bundles. To refresh after editing core source, run `npm run build` before `npm run check`.

Browser tests require the sole development dependency:

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm run build
npm run serve
# in another terminal, where browser execution is permitted
npm run test:browser
```

Chromium is launched with `chromiumSandbox: true`. The workflow uses `ubuntu-22.04` for browser compatibility, read-only repository permissions, and no stored checkout credentials. It does not modify billing, plans, repository settings, or access grants. Review runner availability before its retirement. Do not disable sandboxing to work around a restricted environment.

## Supported inspection

- `score-partwise` XML, UTF-8, plain or ZIP-based MXL
- Encoded positive decimal duration / divisions, reduced with BigInt rational arithmetic
- Notes, rests, cue notes, grace notes, chords, voices/staves, backup and forward
- Inherited boundary divisions and meter
- Simple, additive and composite meters
- Event positions and maximum extent independently of the final cursor
- Source fragments with part, measure, event and XML-child ordinals
- Raw-input SHA-256 plus extracted-score SHA-256 for MXL provenance
- JA/EN interface, bilingual HTML report, versioned JSON and explicit limits

## Conservative decisions

`duration / divisions` is authoritative for this inspection. Notated type, dots, and time-modification are not used to recalculate it. A tuplet ratio must not be applied again. Voice durations must not be summed into a measure length.

Voice annotations are kept separately from onset calculation. Unspecified voice displays as `?`; an omitted chord voice can borrow an explicit anchor for display, with `encodedVoice: null` and `voiceSource: anchor` preserved in JSON.

A chord tone shares the leading non-chord note's start, does not advance the cursor, and is reviewed if longer than its anchor. Grace contributes zero to the ordinary duration cursor. A backup can move that cursor while the previously reached maximum extent stays unchanged. Forward contributes to the encoded extent.

`underfull` and `overfull` are review warnings, never definite musical-error verdicts. Implicit and non-controlling measures skip the ordinary meter comparison. Empty measures remain reviewable. “No scoped difference” means only that the supported calculations found no difference.

Mid-measure divisions changes make the entire affected measure's timing unavailable. Mid-measure meter changes withhold the meter comparison. Untrusted state remains untrusted in subsequent measures until an explicit supported boundary setting restores that dimension. Staff-specific, unmeasured, interchangeable, and malformed meter forms are not silently guessed. Unknown measure-level music-data elements or ambiguous timing children prevent a complete timeline claim.

## Deliberate boundaries

No engraving, playback, OCR, automatic repair, two-score comparison, pitch/tie correctness, repeat expansion, performance timing, full XSD validation, or musical-correctness claim. A successful import does not establish that the input is valid MusicXML. The XML reader accepts a restricted, bounded subset suitable for this inspector; it is not a general-purpose XML implementation. It accepts inert external-only DOCTYPE declarations without resolving them, ignores non-declaration processing instructions (including xml-stylesheet) without fetching anything, rejects internal DTD subsets / custom entities, rejects namespace-qualified elements and non-empty score namespaces, and supports UTF-8 only.

## Security limits

- Input: 8 MiB; extracted root/container XML: 8 MiB per entry
- ZIP: 128 entries, 24 MiB total declared uncompressed size, ratio cap 200 (minimum 1 KiB allowance)
- Stored and DEFLATE methods; no encryption, ZIP64, multi-disk archives, symlinks, duplicate/unsafe/non-NFC paths or overlapping local entries
- Container must name the first rootfile; no filename guessing or extraction onto the filesystem
- Selected entries are decompressed in bounded chunks and verified against sizes and CRC-32
- Unused assets are not inflated, interpreted, rendered, or fetched
- XML: 180,000 nodes, depth 64; 64 parts, 4,000 measures, 20,000 events total, 1,000 events per measure
- Numeric input: 24 decimal digits; derived rationals: 256 digits; meter fractions: 128 digits
- Meter: 32 composite pairs, 64 additive terms, 4,096 text characters per pair; over-limit meters stay unsupported
- Measure children: 2,000; findings: 256 per measure and 12,000 total
- Identity caps: part ID 128, part name 256, measure label 128, voice/staff 64, XML names 128 characters; oversize identities are rejected, never silently truncated
- Source fragments: 1,200 characters with truncation disclosure
- Imported strings are text-escaped; report includes a restrictive CSP
- Cancellation terminates the worker; generation IDs prevent old reads/results from replacing newer work

## Why build this?

This is a usefulness hypothesis, not evidence of market demand or novelty. Existing notation editors and MusicXML tools already perform related checks. BarProof focuses on a small gap in the handoff experience: explaining encoded rhythm in a no-install, local-first, bilingual witness with provenance. See [competitive context](docs/RESEARCH.md) and [interview narrative](docs/INTERVIEW.md).

## Project map

- `src/rational.mjs`: exact decimal rational arithmetic
- `src/xml.mjs`: bounded, non-resolving XML reader
- `src/import.mjs`: MXL directory, bounded decompression and fingerprints
- `src/core.mjs`: cursor / extent state machine and findings
- `src/report.mjs`: escaped bilingual HTML and machine-readable review data
- `src/app.mjs`: keyboard-first responsive UI and cancellable worker lifecycle
- `tests/oracle.py`: independent Fraction oracle; no production imports
- `tests/browser/browser-test.mjs`: authored end-to-end, offline, print, hostile-content and interruption tests

No project license has been selected or added. This is a portfolio prototype; real-world corpus validation and user interviews remain open work.
