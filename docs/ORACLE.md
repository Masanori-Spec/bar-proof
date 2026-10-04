# Independent exact-rhythm oracle

`tests/oracle.py` produces `tests/fixtures/oracle.json` with the Python standard library's `fractions.Fraction`. The fixture contains **22 cases and 28 source measures**. All input snippets are original, hand-authored test material.

## What is independent

The oracle does **not** import, execute, inspect, or reproduce the production JavaScript parser. It is deliberately not a second MusicXML parser.

Each case pairs two separately declared things:

1. MusicXML with literal division, duration, meter, voice, and staff values
2. A mathematical timeline with explicit onsets and exact fractional durations, plus independently stated final cursor, extent, and expected meter length

Python calculates event ends and reduces each rational. For example, twelve triplet eighths have the manually declared onsets `i × 1/3`, for `i = 0…11`, and duration `1/3` each. The XML separately encodes each note as duration `4`, divisions `12`. Decimal strings such as `.1` and `.3` enter `Fraction` directly, never a binary float. The large-integer fixture makes a one-division deficit beyond JavaScript `Number`'s safe integer range observable.

XML helpers only wrap literal input. `ElementTree` is used to confirm well-formedness; it does not extract a timing answer. The oracle also checks that each supplied extent agrees with the maximum explicit event endpoint, bounded below by zero. A backward event's endpoint is its start minus its positive duration, so the negative `-1/12` endpoint remains intact.

The oracle shares the documented output contract and diagnostic vocabulary with the application. It is independent arithmetic evidence, not proof of complete MusicXML conformance, and it cannot establish correctness outside these cases.

## Run it

From the repository root:

```sh
python3 tests/oracle.py --check
```

`--check` regenerates the payload in memory and requires a byte-for-byte match with the committed fixture. It exits nonzero and prints a unified diff if the fixture is stale or altered. It never overwrites the fixture. To intentionally regenerate it after reviewing a changed case:

```sh
python3 tests/oracle.py
```

An alternative path can be used with `--output PATH`, including with `--check`.

A successful `--check` establishes deterministic, self-consistent fixtures. The application's Node tests must additionally call `inspectScore(case.xml)` and compare the result with `case.expected`. Regenerating fixtures does not run the production engine or establish that it passed them.

## Fixture contract

All numeric timing fields use reduced rational strings in **quarter-note units**, for example `0`, `4`, `1/3`, and `-1/12`. Unknown values are JSON `null`.

The root has `schemaVersion`, `unit`, `generator`, `independence`, `assertionPolicy`, and `cases`. Each case has an ID, description, rationale, XML, and expected output projection.

The expected projection has this structure:

```text
parts[]
  id, ordinal
  measures[]
    ordinal, label, expected, cursor, extent, status
    events[] (when their timing is constrained)
      ordinal, kind, start, end, duration, voice?, staff?
    requiredCodes[]
    forbiddenCodes[]
```

Integration tests should:

- Compare the number and source order of parts and measures
- Compare every provided scalar field exactly, including `null`
- When `events` is supplied, compare the full event count, source order, and every provided event field
- Require `requiredCodes` to be present in the measure's findings
- Require `forbiddenCodes` to be absent from the measure's findings
- Treat unspecified fields as unconstrained, rather than requiring them to be absent

Backup has no voice or staff in these expectations because the MusicXML element carries neither. Notes and forwards explicitly provide these XML fields; the fixtures do not impose a default representation for absent values. Rhythm event ordinals are one-based and exclude attributes. Measure ordinals are one-based source positions, independent of repeated labels.

`clear`, `review`, and `unsupported` are application review states, not validity certifications. The implicit pickup has review context and an `implicit-pickup` finding, but must not be called underfull merely because its extent is short. Unknown mid-measure divisions make the whole measure's cursor and extent unavailable. Unknown mid-measure time makes the target length unavailable while known divisions can still support exact event positions. Each untrusted attribute remains untrusted in the next measure until an explicit, supported boundary restoration.

## Cases and failure modes

| Case | Arithmetic or semantic check |
| --- | --- |
| `quarter-4-4` | Four ordinary quarter durations total four |
| `triplet-eighths` | Twelve exact thirds; no extra tuplet scaling |
| `shorter-chord` | Shorter chord member accepted; cursor follows the anchor |
| `longer-chord` | Longer chord member reported; no accidental cursor advance |
| `multivoice-backup` | Parallel voices do not double the measure length |
| `partial-voice-forward` | Extent four with final cursor three is not underfull |
| `backup-before-zero-twelfth` | Exact `-1/12` survives without clamping or tolerance |
| `whole-measure-rest-3-4` | Encoded three-quarter rest wins over a whole-rest glyph |
| `additive-3-plus-2-over-8` | `(3+2) × 4/8 = 5/2` |
| `composite-2-4-plus-3-8` | `2 × 4/4 + 3 × 4/8 = 7/2` |
| `decimal-divisions` | Three `.1/.3` durations total exactly one |
| `grace-chord` | Grace and grace-chord events consume zero encoded time |
| `implicit-pickup` | Pickup context is distinct from an underfull finding |
| `midmeasure-divisions-untrusted` | Null timing, inherited uncertainty, boundary restoration |
| `midmeasure-meter-untrusted` | Null expected length with exact ledger, inheritance, restoration |
| `repeated-measure-labels` | Three rows remain separate despite repeated labels; attributes inherit |
| `underfull-exact-twelfth` | An exact `1/12` deficit is observable |
| `overfull-exact-twelfth` | An exact `1/12` excess is observable |
| `cue-duration` | Cue duration advances encoded time |
| `chord-anchor-chain` | An intermediate short chord tone does not replace the original anchor |
| `forward-only-extent` | Forward alone advances the encoded timeline |
| `exact-large-integers` | Exact fraction and deficit beyond `2^53` |

The supported-scope policy for mid-measure attribute changes is conservative application behavior, not a statement that such MusicXML is invalid. The fixture purposely declines to invent numeric answers when the application does not support the required interpretation.

## Primary references

These MusicXML 4.0 references were checked on 2026-10-04:

- [Duration](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/duration/): encoded movement in notes, backup, and forward
- [Chord](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/): anchor onset, non-advancing chord members, and shorter/longer restrictions
- [Note](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/): grace and cue duration distinctions
- [Time](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/): additive and composite meters
- [Measure](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/): labels and the broader meaning of implicit measures
- [MusicXML schema](https://www.w3.org/2021/06/musicxml40/listings/musicxml.xsd/): divisions units and backup/forward constraints
