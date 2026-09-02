# Rank-eight mixed-face cross-support checkpoint

This checkpoint is finite rank-eight evidence/certification only.  It does not
claim the complete Erdős #993 conjecture.

## Sealed face `(0,1)`, grade 7

Curvature reports, produced one row at a time by source SHA-256
`8DADDC63FA1735F380A1C53979111E68C6254E694778E996848B4A453DB873CA`:

- `rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_7_row_agent_20260822.json`
  SHA-256 `F3DD6CA15DCB14E5872A8E0B3DCC1A16CD2A7928C5849FB28BBDFA34AC9E0065`;
  5,744,506 mixed terms, zero negative.
- `rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_7_row_agent_20260822.json`
  SHA-256 `ACC39E9FCE63113FAD5B583130E501779F995A1CCAC61BFE46042D5F7E4326F8`;
  5,744,506 mixed terms, zero negative.

Strong rows were never assembled as global polynomials.  Source SHA-256
`BBE1C759D274B41AC9569463CB30015E053D797E23B463A8209706DAF4D6F575`
merged their separate FLINT term streams and committed disjoint `b0` exponent
chunks atomically:

- middle manifest
  `rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_7_outer_stream_agent_20260822_manifest.json`,
  SHA-256 `EB4EAE82BA7B16EA19CCDD9FE69C38217D2ED79EC5EE84239B04D7B7F628B719`;
  9,106,336 terms, zero negative, ordered coefficient digest
  `836A7397F01DBEC507C4683626DC7B215C33B4D80DEB8FF9AF874F7D529620C4`.
- far manifest
  `rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_7_outer_stream_agent_20260822_manifest.json`,
  SHA-256 `7DFF9A561385038300C797F5CB3732771E7B9D3FA58CF48BA804E07FCCE45923`;
  9,106,336 terms, zero negative, ordered coefficient digest
  `D1AA20829BD536A7FFC6F260D256F1E9AD6633EAEA0443E2A5F7AB247D1A2F8D`.

For each strong row, the nonempty chunks have counts

```
b0^0: 5,367,178
b0^1: 2,629,691
b0^2: 1,109,467
```

and all higher reported chunks are empty.  The exact support lemma in
`RANK8_LOW_LOW_A23_MIXED_CROSS_HIGH_GRADE_BOUNDS_AGENT_20260822.md`
proves a priori that `exponent(b0)<=2`.

## Exact validation already completed

At face `(0,1)`, grade 2, both streamed strong rows exactly matched the earlier
global reference on term count, sign count, minimum coefficient, and the full
ordered coefficient SHA-256.  A separately written independent replay source,
`audit_rank8_low_low_a23_mixed_cross_strong_outer_agent.py`, also passed both
grade-2 rows.  Its source SHA-256 is
`61DC52455236DF90A415C061705C0E6766FA2DE5B33247F2E50F2C73D3195933`.

The independent grade-7 replay was intentionally stopped before completion to
protect system virtual-memory headroom while another proof process was active.
It emitted no report, so no incomplete audit is being used as evidence.

## Remaining cross-support work

- Independently replay/audit the two face `(0,1)`, grade-7 strong manifests.
- Scan and audit grades 8 through the exact maxima 16 (curvature) and 17
  (strong), one row at a time, on both mixed faces.
- Scan/audit the other mixed face `(1,0)` in all grades.
- Assemble the disjoint support partition: zero support, nonempty A-only,
  nonempty B-only, and support meeting both A and B.

The high-grade compression bounds are exact: curvature base/linear/direction
have maximum slack grades 16/15/14; strong base/linear/direction have maxima
17/16/15.  Thus curvature grade 16 and strong grade 17 each require only one
base piece, with middle exactly four times far.
