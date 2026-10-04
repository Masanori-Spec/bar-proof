# Interview narrative / 面接での説明

## 30 seconds / 30 秒

MusicXML の受け渡しで小節の時間がずれたとき、「どこが、なぜずれたか」を共有しやすくするローカル検査ツールです。浮動小数点ではなく分数で duration / divisions を追跡し、声部を合算せず、和音・装飾音・backup を扱います。未対応の状態は隠さず、計算を保留した日英レポートとして残します。

BarProof explains timing differences in MusicXML handoffs. It follows encoded duration with exact fractions, keeps cursor and extent separate across voices, and attaches source evidence to each finding. Unsupported context remains visible rather than becoming a false clean result.

## Engineering decisions worth discussing

1. Correctness is scoped. “No difference in supported checks” is a narrower, defensible result than “valid score”
2. BigInt rational arithmetic avoids decimal rounding and tuplet double-scaling
3. State uncertainty propagates across measures. A mid-measure divisions change blocks inherited calculations until an explicit boundary reset
4. The timeline is a human aid; exported fractions and source ordinals are the evidence. Geometric display positions use Number only for rendering
5. A separately authored Python Fraction fixture corpus tests the production JavaScript implementation. Metamorphic tests add scaling, whitespace and voice-order invariants
6. ZIP input is adversarial: bounded inflation, CRC and metadata agreement, safe unique paths, no arbitrary extraction and no external asset requests
7. A bundled worker supports termination and repeat imports without relying on additional requests after initial page load
8. Source hashes connect findings to the exact bytes reviewed, including original MXL and extracted XML

## Product honesty

MuseScore, musicdiff and MusicOCR already solve adjacent problems. The differentiator is a focused, local, bilingual and explainable handoff workflow, not new music theory. User demand, market size, musical-correctness certification, and patent novelty are not claimed.

## Demo script

- Open “Handoff review” and inspect the implicit pickup, explaining why it is contextual rather than a definite failure
- Select measure ordinal #3, label A. The duplicated label shows why ordinal provenance matters
- Open the chord-too-long witness; compare the encoded length against its anchor
- Select #5 and show the withheld timeline after a mid-measure divisions change
- Save the bilingual report and JSON; show both hashes and declared limits
- Explain which checks ran locally and which browser / publication stages remain unrun

## Questions to be ready for

- Why not simply sum note durations? Multiple voices rewind the shared cursor; sum-of-voices is not a bar length
- Why not use note type or tuplet ratios? Encoded duration already represents the intended duration being inspected
- Why reject legitimate-but-unhandled XML? A narrow, explicit boundary is safer than silently approximating a broader claim
- What proves usefulness? Current evidence is workflow research and a working bounded prototype; real user testing is the next step
