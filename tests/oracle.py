#!/usr/bin/env python3
"""Independent, deterministic Fraction fixture generator for BarProof.

This is a hand-authored timeline oracle, not another MusicXML timing parser.
It neither reads nor invokes production JavaScript. XML input and mathematical
expectations are declared separately. ElementTree checks XML well-formedness
only; all timing answers come from Python fractions over explicit timelines.
"""
from __future__ import annotations

import argparse
import difflib
import json
from fractions import Fraction
from pathlib import Path
from xml.etree import ElementTree
from xml.sax.saxutils import escape, quoteattr

OUTPUT = Path(__file__).resolve().parent / "fixtures" / "oracle.json"


def fraction(value: str | int | Fraction) -> Fraction:
    if isinstance(value, float):
        raise TypeError("Oracle values must never pass through binary floats")
    return Fraction(value)


def q(value: str | int | Fraction) -> str:
    return str(fraction(value))


def event(kind: str, start: str | int | Fraction,
          duration: str | int | Fraction, *, voice: str | None = "1",
          staff: str | None = "1") -> dict:
    """Explicit start, independent exact duration; no running parser cursor."""
    start, duration = fraction(start), fraction(duration)
    assert duration >= 0
    end = start - duration if kind == "backup" else start + duration
    result = {"kind": kind, "start": q(start), "end": q(end),
              "duration": q(duration)}
    if voice is not None:
        result["voice"] = voice
    if staff is not None:
        result["staff"] = staff
    return result


def expected_measure(events: list[dict] | None, *, label: str = "1",
                     expected: str | int | Fraction | None = 4,
                     cursor: str | int | Fraction | None = 4,
                     extent: str | int | Fraction | None = 4,
                     status: str = "clear", required: tuple[str, ...] = (),
                     forbidden: tuple[str, ...] = ()) -> dict:
    result = {"label": label, "expected": None if expected is None else q(expected),
              "cursor": None if cursor is None else q(cursor),
              "extent": None if extent is None else q(extent), "status": status,
              "requiredCodes": list(required), "forbiddenCodes": list(forbidden)}
    if events is not None:
        result["events"] = [dict(ordinal=i, **item) for i, item in enumerate(events, 1)]
        # This check is a consistency constraint on our hand-authored answer,
        # never an interpretation of XML. A negative backup is not clamped.
        if extent is not None:
            mathematical_extent = max([Fraction(0)] + [fraction(e["end"]) for e in events])
            assert fraction(extent) == mathematical_extent, (label, extent, mathematical_extent)
    return result


# These helpers only wrap literal MusicXML. They do not calculate timing.
def attributes(divisions: str | None = "4", times: tuple[tuple[str, str], ...] | None = (("4", "4"),)) -> str:
    division_xml = "" if divisions is None else f"<divisions>{escape(divisions)}</divisions>"
    time_xml = "" if times is None else "<time>" + "".join(
        f"<beats>{escape(beats)}</beats><beat-type>{escape(beat_type)}</beat-type>"
        for beats, beat_type in times) + "</time>"
    return f"<attributes>{division_xml}{time_xml}</attributes>"


def note(duration: str | None, *, chord: bool = False, grace: bool = False,
         rest: bool = False, measure_rest: bool = False, cue: bool = False,
         voice: str = "1", staff: str = "1", type_: str | None = None,
         extra: str = "") -> str:
    prefix = ("<grace/>" if grace else "<cue/>" if cue else "") + ("<chord/>" if chord else "")
    pitch = '<rest measure="yes"/>' if measure_rest else "<rest/>" if rest else "<pitch><step>C</step><octave>4</octave></pitch>"
    duration_xml = "" if duration is None else f"<duration>{escape(duration)}</duration>"
    type_xml = "" if type_ is None else f"<type>{escape(type_)}</type>"
    return f"<note>{prefix}{pitch}{duration_xml}<voice>{escape(voice)}</voice>{type_xml}{extra}<staff>{escape(staff)}</staff></note>"


def backup(duration: str) -> str:
    return f"<backup><duration>{escape(duration)}</duration></backup>"


def forward(duration: str, *, voice: str = "1", staff: str = "1") -> str:
    return f"<forward><duration>{escape(duration)}</duration><voice>{escape(voice)}</voice><staff>{escape(staff)}</staff></forward>"


def measure(body: str, *, label: str = "1", extra: str = "") -> str:
    return f"<measure number={quoteattr(label)}{extra}>{body}</measure>"


def score(measures: list[str], *, part_id: str = "P1", part_name: str = "Oracle") -> str:
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="4.0">'
            f'<part-list><score-part id={quoteattr(part_id)}><part-name>{escape(part_name)}</part-name>'
            f'</score-part></part-list><part id={quoteattr(part_id)}>' + "".join(measures)
            + "</part></score-partwise>\n")


def case(id_: str, description: str, xml_measures: list[str], expected: list[dict],
         *, rationale: str) -> dict:
    assert len(xml_measures) == len(expected)
    xml = score(xml_measures)
    ElementTree.fromstring(xml)  # Well-formedness only. No timing extraction.
    return {"id": id_, "description": description, "rationale": rationale,
            "xml": xml, "expected": {"parts": [{"id": "P1", "ordinal": 1,
            "measures": [dict(ordinal=i, **m) for i, m in enumerate(expected, 1)]}]}}


def fixtures() -> list[dict]:
    result = []
    # Written independently: four unit intervals [0,1], [1,2], [2,3], [3,4].
    result.append(case("quarter-4-4", "Four quarter notes in 4/4",
        [measure(attributes() + note("4") * 4)],
        [expected_measure([event("note", i, 1) for i in range(4)])],
        rationale="Four durations of 4 divisions / 4 divisions per quarter = 4 quarters."))

    third = Fraction(1, 3)
    result.append(case("triplet-eighths", "Twelve triplet eighths, duration 4 / divisions 12",
        [measure(attributes("12") + note("4", type_="eighth", extra="<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>") * 12)],
        [expected_measure([event("note", i * third, third) for i in range(12)])],
        rationale="Twelve exact thirds total four; time-modification must not scale encoded duration a second time."))

    result.append(case("shorter-chord", "A shorter chord tone is allowed and does not move the cursor",
        [measure(attributes() + note("8") + note("4", chord=True) + note("8"))],
        [expected_measure([event("note", 0, 2), event("chord", 0, 1), event("note", 2, 2)],
                          forbidden=("chord-too-long", "underfull", "overfull"))],
        rationale="The chord member shares onset zero, ends at one, and the next non-chord note starts at two."))

    result.append(case("longer-chord", "A chord tone longer than its anchor is reported",
        [measure(attributes() + note("4") + note("8", chord=True) + note("12"))],
        [expected_measure([event("note", 0, 1), event("chord", 0, 2), event("note", 1, 3)],
                          status="review", required=("chord-too-long",))],
        rationale="The chord violates MusicXML's anchor-duration restriction but cannot move the cursor to two."))

    result.append(case("multivoice-backup", "Two voices occupy the same four-quarter measure",
        [measure(attributes() + note("16") + backup("16") + note("8", voice="2", staff="2") * 2)],
        [expected_measure([event("note", 0, 4), event("backup", 4, 4, voice=None, staff=None),
                           event("note", 0, 2, voice="2", staff="2"), event("note", 2, 2, voice="2", staff="2")])],
        rationale="Parallel voices have eight quarters of summed note durations but only four quarters of measure extent."))

    result.append(case("partial-voice-forward", "A partial second voice can finish before the measure extent",
        [measure(attributes() + note("16") + backup("16") + forward("8", voice="2") + note("4", voice="2"))],
        [expected_measure([event("note", 0, 4), event("backup", 4, 4, voice=None, staff=None),
                           event("forward", 0, 2, voice="2"), event("note", 2, 1, voice="2")],
                          cursor=3, extent=4, forbidden=("underfull", "overfull"))],
        rationale="The first voice reaches four. A final cursor of three is not evidence of an underfilled measure."))

    result.append(case("backup-before-zero-twelfth", "Backup crosses measure start by exactly 1/12 quarter",
        [measure(attributes("12", (("1", "4"),)) + note("12") + backup("13"))],
        [expected_measure([event("note", 0, 1), event("backup", 1, Fraction(13, 12), voice=None, staff=None)],
                          expected=1, cursor=-Fraction(1, 12), extent=1,
                          status="review", required=("before-zero",))],
        rationale="One minus thirteen twelfths is negative one twelfth. No float tolerance or clamp may erase it."))

    result.append(case("whole-measure-rest-3-4", "A whole-measure rest occupies three quarters in 3/4",
        [measure(attributes("24", (("3", "4"),)) + note("72", measure_rest=True, type_="whole"))],
        [expected_measure([event("rest", 0, 3)], expected=3, cursor=3, extent=3)],
        rationale="The encoded duration 72 / 24 wins over the whole-rest glyph; a 3/4 whole-measure rest lasts three quarters."))

    result.append(case("additive-3-plus-2-over-8", "Additive numerator 3+2/8",
        [measure(attributes("4", (("3+2", "8"),)) + note("10", rest=True))],
        [expected_measure([event("rest", 0, Fraction(5, 2))], expected=Fraction(5, 2), cursor=Fraction(5, 2), extent=Fraction(5, 2))],
        rationale="(3+2) times 4/8 quarters per eighth note = 5/2 quarters."))

    result.append(case("composite-2-4-plus-3-8", "Composite meter 2/4 + 3/8",
        [measure(attributes("4", (("2", "4"), ("3", "8"))) + note("14", rest=True))],
        [expected_measure([event("rest", 0, 2 + Fraction(3, 2))], expected=2 + Fraction(3, 2), cursor=2 + Fraction(3, 2), extent=2 + Fraction(3, 2))],
        rationale="Independent beat-type pairs sum to 2 + 3/2 = 7/2 quarters."))

    # Decimal strings enter Fraction directly; no binary decimal round trip.
    decimal_third = Fraction(".1") / Fraction(".3")
    assert decimal_third == third
    result.append(case("decimal-divisions", "Decimal duration .1 and divisions .3 preserve exact thirds",
        [measure(attributes(".3", (("1", "4"),)) + note(".1") * 3)],
        [expected_measure([event("note", i * decimal_third, decimal_third) for i in range(3)],
                          expected=1, cursor=1, extent=1)],
        rationale="(.1/.3) + (.1/.3) + (.1/.3) is exactly one, not an approximate decimal."))

    result.append(case("grace-chord", "A grace-note chord has zero encoded duration",
        [measure(attributes() + note(None, grace=True) + note(None, grace=True, chord=True) + note("16"))],
        [expected_measure([event("grace", 0, 0), event("grace-chord", 0, 0), event("note", 0, 4)])],
        rationale="Grace and grace-chord events do not advance the encoded musical position."))

    result.append(case("implicit-pickup", "An implicit pickup is surfaced without a false underfull finding",
        [measure(attributes() + note("4"), label="0", extra=' implicit="yes"')],
        [expected_measure([event("note", 0, 1)], label="0", cursor=1, extent=1,
                          status="review", required=("implicit-pickup",), forbidden=("underfull",))],
        rationale="Implicit can mark a pickup or split repeat. Its short duration is review context, not automatically an error."))

    result.append(case("midmeasure-divisions-untrusted", "Mid-measure divisions invalidate timing until restored at a boundary",
        [measure(attributes("4") + note("4") + attributes("8", None) + note("24")),
         measure(note("32"), label="2"),
         measure(attributes("8", None) + note("32"), label="3")],
        [expected_measure(None, cursor=None, extent=None, status="unsupported", required=("unsupported-midmeasure-divisions",)),
         expected_measure(None, label="2", cursor=None, extent=None, status="unsupported"),
         expected_measure([event("note", 0, 4)], label="3")],
        rationale="The tool deliberately does not interpret mid-measure divisions. That uncertainty must survive inheritance and end only at an explicit supported boundary."))

    result.append(case("midmeasure-meter-untrusted", "Mid-measure time invalidates expected length while exact duration remains available",
        [measure(attributes() + note("4") + attributes(None, (("3", "4"),)) + note("8")),
         measure(note("12"), label="2"),
         measure(attributes(None, (("3", "4"),)) + note("12"), label="3")],
        [expected_measure([event("note", 0, 1), event("note", 1, 2)], expected=None, cursor=3, extent=3,
                          status="unsupported", required=("unsupported-midmeasure-time",)),
         expected_measure([event("note", 0, 3)], label="2", expected=None, cursor=3, extent=3, status="unsupported"),
         expected_measure([event("note", 0, 3)], label="3", expected=3, cursor=3, extent=3)],
        rationale="Known divisions still support exact event positions; no trusted target meter exists until a supported boundary time signature restores it."))

    result.append(case("repeated-measure-labels", "Repeated and nonnumeric measure labels preserve ordinal identity",
        [measure(attributes() + note("16"), label="7"),
         measure(note("16"), label="7"), measure(note("16"), label="X")],
        [expected_measure([event("note", 0, 4)], label=label) for label in ("7", "7", "X")],
        rationale="Three source measures remain three rows. A label is not a unique key; attributes also inherit across boundaries."))

    result.append(case("underfull-exact-twelfth", "A measure ends exactly 1/12 quarter short",
        [measure(attributes("12", (("1", "4"),)) + note("11"))],
        [expected_measure([event("note", 0, Fraction(11, 12))], expected=1, cursor=Fraction(11, 12), extent=Fraction(11, 12),
                          status="review", required=("underfull",))],
        rationale="The deficit is 1 - 11/12 = 1/12, exactly."))

    result.append(case("overfull-exact-twelfth", "A measure ends exactly 1/12 quarter long",
        [measure(attributes("12", (("1", "4"),)) + note("13"))],
        [expected_measure([event("note", 0, Fraction(13, 12))], expected=1, cursor=Fraction(13, 12), extent=Fraction(13, 12),
                          status="review", required=("overfull",))],
        rationale="The excess is 13/12 - 1 = 1/12, exactly."))

    result.append(case("cue-duration", "Cue notes carry encoded duration",
        [measure(attributes() + note("8", cue=True) + note("8", rest=True))],
        [expected_measure([event("cue", 0, 2), event("rest", 2, 2)])],
        rationale="Cue appearance is not grace timing: an ordinary cue note advances the position by its duration."))

    result.append(case("chord-anchor-chain", "A shorter intermediate chord tone does not change the original anchor",
        [measure(attributes() + note("8") + note("4", chord=True) + note("8", chord=True) + note("8"))],
        [expected_measure([event("note", 0, 2), event("chord", 0, 1), event("chord", 0, 2), event("note", 2, 2)],
                          forbidden=("chord-too-long",))],
        rationale="Both chord tones use the first preceding non-chord note's two-quarter duration and onset."))

    result.append(case("forward-only-extent", "Forward contributes to the occupied encoded timeline",
        [measure(attributes() + forward("16"))],
        [expected_measure([event("forward", 0, 4)])],
        rationale="A silent forward of sixteen divisions advances the four-quarter timeline without requiring a note."))

    result.append(case("exact-large-integers", "Division integers above IEEE-754 safe integer stay exact",
        [measure(attributes("9007199254740993", (("1", "4"),)) + note("9007199254740992"))],
        [expected_measure([event("note", 0, Fraction(9007199254740992, 9007199254740993))],
                          expected=1, cursor=Fraction(9007199254740992, 9007199254740993),
                          extent=Fraction(9007199254740992, 9007199254740993), status="review", required=("underfull",))],
        rationale="A one-division deficit remains visible even when both lexical integers exceed Number's exactness boundary."))
    return result


def payload() -> dict:
    cases = fixtures()
    ids = [item["id"] for item in cases]
    assert len(ids) == len(set(ids)), "Duplicate case IDs"
    return {"schemaVersion": 1, "unit": "quarter-note", "generator": "Python standard-library fractions.Fraction",
            "independence": "Hand-authored XML plus separately authored explicit timeline equations; no production imports or parser reuse.",
            "assertionPolicy": "Expected objects are recursive projections. Compare provided scalar fields and complete provided event arrays; requiredCodes must be present and forbiddenCodes absent in measure findings. Unspecified fields are unconstrained.",
            "cases": cases}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Compare regenerated bytes with committed fixture; never write")
    parser.add_argument("--output", type=Path, default=OUTPUT, help="Fixture path (defaults to tests/fixtures/oracle.json)")
    args = parser.parse_args()
    data = payload()
    rendered = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output.is_file():
            parser.error(f"Fixture missing: {args.output}")
        current = args.output.read_text(encoding="utf-8")
        if current != rendered:
            print("".join(difflib.unified_diff(current.splitlines(True), rendered.splitlines(True),
                                               fromfile=str(args.output), tofile="regenerated oracle")), end="")
            return 1
        print(f"Oracle verified: {len(data['cases'])} cases, "
              f"{sum(len(p['measures']) for c in data['cases'] for p in c['expected']['parts'])} measures; exact deterministic fixture matches.")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
        print(f"Wrote {len(data['cases'])} independent Fraction cases to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
