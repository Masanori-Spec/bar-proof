# Research and scope

Research checked 2026-10-04. No customer contact, university-site access, paid service, or patent-candidate publication was involved.

## Existing workflows

- [MuseScore Studio: MusicXML import and export](https://musescore.org/en/print/book/export/html/329676): notation editing and interchange, including compressed MusicXML and post-import cleanup. BarProof should complement export cleanup rather than reproduce an editor
- [musicdiff](https://github.com/gregchapman-dev/musicdiff): detailed notation comparison and textual/marked-up differences, with Python and rendering dependencies. Broad score comparison is deliberately excluded
- [MusicOCR](https://github.com/phkoonce/MusicOCR): part-and-measure validation in a larger local OCR workflow. Rhythm-checking itself is not a novelty claim

The proposed distinction is workflow packaging: no-install local encoded-time inspection, exact human-readable witnesses, bilingual review, and SHA-256 provenance. This has not been established as an unmet market need, and no demand or revenue is claimed.

## Primary semantic sources

- [W3C duration](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/duration/): intended duration is positive and uses divisions; note/backup/forward move the cursor under their defined rules
- [W3C chord](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/): chord members do not move the cursor and cannot exceed the preceding anchor's duration
- [W3C divisions type](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/divisions/): decimal base type, although integers are preferred
- [W3C time](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/): additive beats, composite pairs and staff-specific `number`
- [W3C attributes](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/): mid-measure changes affect score order rather than merely document order; v1 marks them unsupported
- [W3C measure](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/): labels need not be numeric; implicit and non-controlling flags carry important context
- [W3C time-modification](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time-modification/): notation and sounding relations; encoded duration is not re-scaled by this inspector
- [W3C MXL format](https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/): first rootfile named by `META-INF/container.xml`, UTF-8 names, ZIP storage/DEFLATE; older MXL can lack `mimetype`
- [MusicXML XSD](https://www.musicxml.com/for-developers/musicxml-xsd/): use the official schema workflow for broader structural validation

## Next validation work

After independent code review and browser CI, test a permission-cleared corpus of exports from multiple notation programs. Track false positives, unsupported-context frequency and whether a human can resolve a handoff faster using the report. User interviews and external contact need separate authorization; none have occurred.
