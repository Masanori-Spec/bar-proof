# Independent technical review

Date: 2026-10-04 UTC. Version: 0.1.0.

Historical technical review followed by a verified release-evidence addendum at the end of this document.

## Recommendation

Proceed to separately authorized source publication and sandbox-enabled hosted CI after the final source/archive hash check. The scoped numerical and import/export review has no remaining blocking finding in the tested cases. **Do not describe browser behavior, visual layout, accessibility, offline operation, or printable output as verified until the real-browser checks and artifact inspection pass.** This review is not MusicXML schema validation, musical-correctness certification, or evidence of customer demand.

## Evidence

Independent review reran `npm run build && npm run check` after the fixes: syntax/security-primitive checks, the deterministic Python oracle (22 cases / 28 measures), all 75 Node tests, worker-bundle consistency/execution, and the static build passed. Sixteen tests in `tests/reviewer.test.mjs` were independently added.

An additional Node smoke input contained 20,000 events across 20 measures, at the per-measure event limit. Its 2,280,769-byte XML produced all expected 1,000-quarter extents/cursors, no findings, and completed in approximately 266 ms in this environment. This synthetic timing is not a browser benchmark or a general performance guarantee.

The reviewer timing witnesses are literal expected event positions, independently calculated rather than copied from the production state machine. They cover:

- Omitted, explicit, and differing voice annotations on chord members
- Shorter chord chains anchored to the original non-chord note and cross-staff chords
- Grace-note/chord groups without ordinary-cursor advance
- Exact decimal divisions and tuplet notation without double scaling
- Maximum extent versus a shorter final cursor; forward overrun followed by backup
- Unsupported meter/divisions inheritance and explicit boundary recovery
- Ordinary versus implicit/non-controlling comparison policy
- Unknown measure-level timing elements withholding complete totals
- Adversarial composite-meter growth and diagnostic-identity amplification
- MXL first-root selection, unused inert assets, and raw/extracted provenance
- Escaped report identifiers, filenames, source witnesses, and inert XML processing instructions

## Findings corrected during review

1. **Chord anchor falsely rejected because of voice annotations.** A chord with no `<voice>` following an anchor in voice 2 was assigned an invented voice 1, producing `orphan-chord` and null totals. The W3C chord cursor rule does not impose voice equality. Voice matching no longer controls anchor eligibility; encoded voice provenance is retained separately, and an omitted display voice is explicitly unspecified or inherited from the anchor. The regression also covers two explicitly different voice annotations.
2. **Small composite meters could cause large rational-growth work.** Five hundred pairs with `beats=1` and successive large odd beat types produced a 7,259-character fraction from about 24.7 KB of XML and took about 1.7 seconds. A 1,500-pair input exceeded an isolated three-second check. Meter pairs, additive terms/text, meter fraction size, and derived rational size now have explicit limits. Unsupported meter state remains untrusted until a supported boundary reset. The adversarial regression now terminates promptly with an unsupported result.
3. **Finding/ordinal work could grow excessively.** Every unknown measure child used a repeated `indexOf` lookup and produced another finding. Source ordinals now use a precomputed map, and explicit measure-child, per-measure finding, and total finding limits bound the diagnostic result.
4. **Unbounded diagnostic identities amplified JSON output.** Long part IDs and measure labels were repeated in findings. The input byte cap alone did not bound that repetition tightly. Part IDs/names, measure labels, voice/staff values, and XML names now have explicit caps. Oversized identity fields are rejected; they are not silently truncated.
5. **Oversized replacement could leave an old worker generation active.** The UI formerly checked file size before cancelling/incrementing the generation. An earlier slow import could overwrite the newer size error. Generation invalidation now occurs before size rejection. A delayed-worker/oversized-replacement browser scenario was added. The code path was reviewed; real-browser execution remains pending.
6. **A valid `xml-stylesheet` processing instruction was misclassified.** The declaration detector matched `xml` followed by a word boundary, incorrectly rejecting an inert stylesheet PI. It now distinguishes the exact reserved XML declaration target from other processing instructions. The regression passes without fetching or interpreting the stylesheet.

The 12 authored browser scenarios and verification/package counts were reconciled with these additions. No browser scenario was executed by this reviewer.

## Primary semantic basis

- [W3C MusicXML duration](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/duration/): encoded divisions determine intended duration and cursor movement
- [W3C MusicXML chord](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/): chord members share the preceding non-chord anchor and do not advance the cursor; shorter members are possible
- [W3C MusicXML note](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/): voice is optional; grace and cue notes have different duration structures
- [W3C divisions data type](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/divisions/): the numeric base type is decimal
- [W3C backup](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/backup/): positive backward movement coordinates voices and staves; it must not cross measure/division-change boundaries
- [W3C measure](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/): implicit and non-controlling flags carry contextual meaning; repeated/non-numeric labels are not chronological identities
- [W3C XML processing instructions](https://www.w3.org/TR/xml/#sec-pi): the exact case-insensitive target `xml` is reserved; `xml-stylesheet` is a different target

These sources support encoded-time interpretation. They do not establish that an underfull/overfull measure is a musical error. The app appropriately presents those differences for human review and does not sum simultaneous voices or reapply tuplet ratios.

## Remaining release gates

1. Run the exact published commit through the authored Node/Python matrix and sandbox-enabled browser CI
2. Inspect the actual desktop/mobile screenshots and both all-measure and selected-measure print/PDF evidence
3. Confirm actual JSON/HTML downloads, local MXL inflation, offline-after-load import, interrupted/repeated imports, oversized replacement, reset, and keyboard focus
4. Reconcile final source ZIP, generated worker, manifest, remote commit, and CI artifact hashes
5. Before broader reliability or market claims, test permission-cleared exports from multiple notation programs and measure unsupported-context frequency and false positives

No shared browser, hosted CI, publication, external customer contact, or university-site access was used during this review. The model tests do not substitute for the unrun browser, corpus, accessibility, and visual checks.

## Verified release-evidence addendum — 2026-10-04

The review sections above preserve the pre-publication assessment. The subsequent corrected implementation was published at `3d93da05e35a5f42b7c3be336ca1c2f1b1dc2389` and passed [run 37172746598](https://github.com/Masanori-Spec/bar-proof/actions/runs/37172746598): all four Node 22/24 × UTC/Asia/Tokyo model jobs and all 12 sandbox-enabled Chromium browser scenarios. The downloaded artifact archive SHA-256 was verified as `c3b8d96e077168c1de8ffba8f6c0650c0a5292f4e63ad29c7f8371d41565bb4e`.

The publisher inspected all six full-report PDF pages, the single-page selected-measure PDF, and actual desktop/mobile captures. Print margins and scope layout are corrected, and the unfocused skip-link overlay is absent. Actual downloaded JSON deep-equals the expected model and independently computed fingerprint; actual HTML is byte-identical to the report generator. Selected immutable artifacts and per-file hashes are preserved in [browser-evidence/evidence.json](browser-evidence/evidence.json).

These results close the browser and visual gates for that tested commit and those fixtures. They do not establish other-browser behavior, physical-device or printer behavior, formal accessibility/WCAG or screen-reader conformance, or real-world corpus accuracy. A subsequent documentation/evidence head has a separate external exact-head audit; the embedded evidence remains pinned to the tested implementation commit.
