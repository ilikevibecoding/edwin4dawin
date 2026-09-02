# Fail-closed checklist: rank-eight mixed-corner cross support

This checklist covers only the cross-support sector of the two rank-eight
low/low mixed corners.  It does not claim the all-order Erdős #993 conjecture.

## Coordinate convention and required rows

The bridge corner `(0,2)` is the normalized endpoint face `(z,w)=(0,1)`, stored
in artifact names as `face_01`.  The bridge corner `(2,0)` is normalized
`(z,w)=(1,0)`, stored as `face_10`.

For both faces the four rows are

```
CM = curvature_middle_times_4
CF = curvature_far
SM = strong_middle_times_4
SF = strong_far
```

Cross support meets both

```
A={a0,b4,b5,b6,b7},  B={a4,a5,a6,a7,b0},
```

so grades zero and one are structurally empty.  Curvature grades are exactly
`2..16`; strong grades are exactly `2..17`.  Every required row also has the
proved outer support `0<=exponent(b0)<=2`.

For an unsealed cell `(face,label,d)`, the intended durable manifest name is

```
rank8_low_low_a23_mixed_cross_face_{face}_{label}_grade_{d}_outer_stream_agent_20260822_manifest.json
```

An `S` below means a producer artifact is sealed.  `U` means no durable
producer artifact currently closes that exact cell.  `N/A` is outside the
proved degree support.  A producer `S` is not independently audited unless the
audit is separately listed below.

## Corner `(0,2)` / `face_01`

| grade | CM | CF | SM | SF |
|---:|:---:|:---:|:---:|:---:|
| 2  | S | S | S | S |
| 3  | U | U | U | U |
| 4  | U | U | U | U |
| 5  | U | U | U | U |
| 6  | U | U | U | U |
| 7  | S | S | S | S |
| 8  | U | U | U | U |
| 9  | U | U | U | U |
| 10 | U | U | U | U |
| 11 | U | U | U | U |
| 12 | U | U | U | U |
| 13 | U | U | U | U |
| 14 | U | U | U | U |
| 15 | U | U | U | U |
| 16 | U | U | U | U |
| 17 | N/A | N/A | U | U |

Exact missing count on this corner: `26` curvature row-grades plus `28` strong
row-grades, hence `54` producer cells.

### Sealed grade-2 producer artifacts

All four were produced by
`probe_rank8_low_low_a23_mixed_cross_row_grade_agent.py`, SHA-256
`8DADDC63FA1735F380A1C53979111E68C6254E694778E996848B4A453DB873CA`.

- `rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_2_row_agent_20260822.json`
  — `A70112A00253D60E44B8F3981B026C703B2808313784ADFE4F1761D8BD029BB5`.
- `rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_2_row_agent_20260822.json`
  — `72D1E9E7288A3678CA5D9218AA001808768379505EDDD66C666E90F3BD10A100`.
- `rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_2_row_agent_20260822.json`
  — `E082E14C4B91BFAA9407C4003262FDEC41CC73F3CFA21C0C122A00DA18516429`.
- `rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_2_row_agent_20260822.json`
  — `389417883B57EA08EABB16C79E6A22430E261CBB7DDD83A4CF0E7BEF1D26BA6F`.

The separately generated all-four-row grade-2 reference is
`rank8_low_low_a23_mixed_cross_face_01_grade_2_reference_agent_20260822.json`,
SHA-256
`FB97257ADB7DC0B314493EFC6857459885FB0C2CD307458DA6D081ED1C0E86BB`;
its source SHA-256 is
`E9B505482EB538FFDE4FCC8597637E1B12D6581AC13DCCB334CFB0961D9E8742`.
The term counts, minima, and ordered coefficient digests matched all four row
artifacts exactly, but that comparison still needs one durable hash-pinned
equivalence-audit report before the four grade-2 cells are audit-sealed.

The strong outer-stream algorithm also has exact grade-2 validation:

- middle manifest
  `rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_2_outer_stream_test_agent_20260822_manifest.json`
  — `FF0478F606E6690AE194BE3CFA92F5AD341A60BECF2D5DE13E41D53B49C90CF4`;
  independent replay
  `rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_2_outer_independent_audit_test_agent_20260822.json`
  — `218DED0577859A4E782791191FE808BE260FE6F683E3A9922EE33305F7B9E20A`.
- far manifest
  `rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_2_outer_stream_test_agent_20260822_manifest.json`
  — `3894C8F447CFE8CE0753E7558D89C0290385E84784ACCD18AB6B874C47643F67`;
  independent replay
  `rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_2_outer_independent_audit_test_agent_20260822.json`
  — `DF46BD04D90F30336F6538F5E87BB879F6A5DF03887F90A28A04060604D2B25A`.

### Sealed grade-7 producer artifacts

- `rank8_low_low_a23_mixed_cross_face_01_curvature_middle_times_4_grade_7_row_agent_20260822.json`
  — `F3DD6CA15DCB14E5872A8E0B3DCC1A16CD2A7928C5849FB28BBDFA34AC9E0065`.
- `rank8_low_low_a23_mixed_cross_face_01_curvature_far_grade_7_row_agent_20260822.json`
  — `ACC39E9FCE63113FAD5B583130E501779F995A1CCAC61BFE46042D5F7E4326F8`.
- middle strong manifest
  `rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_7_outer_stream_agent_20260822_manifest.json`
  — `EB4EAE82BA7B16EA19CCDD9FE69C38217D2ED79EC5EE84239B04D7B7F628B719`.
- far strong manifest
  `rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_7_outer_stream_agent_20260822_manifest.json`
  — `7DFF9A561385038300C797F5CB3732771E7B9D3FA58CF48BA804E07FCCE45923`.

The strong producer source is
`probe_rank8_low_low_a23_mixed_cross_strong_outer_stream_agent.py`, SHA-256
`BBE1C759D274B41AC9569463CB30015E053D797E23B463A8209706DAF4D6F575`.
The middle/far full ordered coefficient digests are respectively
`836A7397F01DBEC507C4683626DC7B215C33B4D80DEB8FF9AF874F7D529620C4`
and
`D1AA20829BD536A7FFC6F260D256F1E9AD6633EAEA0443E2A5F7AB247D1A2F8D`.

The grade-7 curvature rows still need independent exact replay.  The grade-7
strong independent replay was stopped before it emitted a report, so both
strong grade-7 audits are also `U` even though their producer manifests are
sealed.

### Grade-7 strong chunk hashes

Middle prefix
`rank8_low_low_a23_mixed_cross_face_01_strong_middle_times_4_grade_7_outer_stream_agent_20260822`:

| b0 exponent | chunk SHA-256 |
|---:|---|
| 0 | `2BA80EAA2D5770B296DB8DF7E4304847F882C8FB2A163437C183CA5E626A467B` |
| 1 | `39021442DAD522D8D619AE46FF1C3BF7EE64398B2B4F2E2080BD28CEEAB0C3E6` |
| 2 | `8DF254CB552B332920A712BAD480BBCF9C98B42C00FF5EAF3A2DB55545F17B75` |
| 3 | `406DFEDA901BC20A1694BF4CCF7A1B01DD2CAC343665FF815BCC04AE955BA7AE` |
| 4 | `8FE6E4649F3AAF87A1156163B72ECD4B61F917B5E2356545DE3D2201F4CFB485` |
| 5 | `BF0378662CF8C0931EB5123DFF497343B3ED74FEE6012D37AA4F421B05B66EF0` |
| 6 | `381E5CEAC2DFA76DBE7B99283CE8259E72CCF877C37E7B9208CDB66DB3E03814` |
| 7 | `E6334FCEEAC1A880F42B73197D7F8CD1BEB2B3AFB0AEFACEEC9874CA7C30444E` |

Far prefix
`rank8_low_low_a23_mixed_cross_face_01_strong_far_grade_7_outer_stream_agent_20260822`:

| b0 exponent | chunk SHA-256 |
|---:|---|
| 0 | `4BF990D8237C7155B08FCAD8ECEC015D1BF54D2873FEE70A5CC3666ABDA0FEDC` |
| 1 | `FF6C8DDA248B15F737DA14199DEB23617CAB4A504AF3B1A9F2F431ED6636FC87` |
| 2 | `D5DF9849EF0100FD0C8793B71EA5C3FE6BBBFBEDD8DB975EA323D6B9FE33E92E` |
| 3 | `40BE5377B3ECCE4F48CFE8D19D78A34CDE1D0EC91CBF61C5695E05B576788914` |
| 4 | `885A96922199B2F4E6EE4ABC894672CBE74C68BC44968A08D23313F193EAAA21` |
| 5 | `CCD89C317416089F0B3D0CD15D00028CCDD14C08D219B7A976A14C839D49C4A6` |
| 6 | `0B3DCF47E02A721B134B318BA431F141B75C5B6258AF9BFA6B286360E6155922` |
| 7 | `5A3AE15AB4F3B109BDBD46EE817998ECA5F1FF2A28F05F255D8537039DE4C375` |

Exponents `3..7` are empty in these legacy grade-7 reports; future producers
may emit only the proved exhaustive range `0..2`.

## Corner `(2,0)` / `face_10`

No cross-support row-grade producer artifact is currently sealed on this
corner.

| grade | CM | CF | SM | SF |
|---:|:---:|:---:|:---:|:---:|
| 2  | U | U | U | U |
| 3  | U | U | U | U |
| 4  | U | U | U | U |
| 5  | U | U | U | U |
| 6  | U | U | U | U |
| 7  | U | U | U | U |
| 8  | U | U | U | U |
| 9  | U | U | U | U |
| 10 | U | U | U | U |
| 11 | U | U | U | U |
| 12 | U | U | U | U |
| 13 | U | U | U | U |
| 14 | U | U | U | U |
| 15 | U | U | U | U |
| 16 | U | U | U | U |
| 17 | N/A | N/A | U | U |

Exact missing count on this corner: `30` curvature row-grades plus `32` strong
row-grades, hence `62` producer cells.

## Totals and fail-closed rule

The complete cross matrix has `124` required producer cells.  Eight are sealed
on `face_01` (all four rows at grades 2 and 7), leaving exactly `116` unsealed:
`54` on corner `(0,2)` and `62` on corner `(2,0)`.

The final cross assembler must fail unless, for every required cell:

1. a durable producer report/manifest exists; stdout-only counts do not count;
2. the file SHA-256, source SHA-256, dependency hashes, face, label, and grade
   equal the pinned registry values;
3. status is the exact expected PASS status and `negative_terms=0`;
4. outer chunks have exponents exactly `0,1,2`, their file hashes match, their
   counts sum to the row count, and their ordered coefficient digests bind to
   the row digest;
5. a separately written independent replay exactly matches every chunk count,
   minimum, ordered chunk digest, full ordered row digest, and piece length;
6. no grade is inferred from a neighboring grade, the opposite face, numerical
   sampling, or an unpersisted terminal printout.

Only after all `124` producer cells and audits pass may the support assembler
combine this cross sector with the disjoint `Z`, `EA`, and `EB` certificates.

## Minimal sequential order after explicit clearance

Use one heavyweight process at a time and never build a cutoff-17 all-grade
cache.

1. Seal a lightweight hash-pinned equivalence audit for the four existing
   `face_01`, grade-2 row reports against the sealed all-row reference.
2. Independently replay/audit `face_01`, grade 7 in this order: CM, CF, SM, SF.
   The stopped SM audit is restarted from zero; no partial result is imported.
3. Fill the missing `face_01` grades in ascending order
   `3,4,5,6,8,9,10,11,12,13,14,15,16,17`.
4. Fill `face_10` in ascending order `2,3,...,17`.
5. Within one face/grade, build immutable pieces once, stream CM then CF
   sequentially when curvature exists, discard curvature output pieces, then
   stream SM then SF sequentially.  No two assembled rows coexist.  At grade
   17 only SM/SF exist.
6. Immediately after each face/grade producer checkpoint, run the separate
   exact replay for the rows just emitted and pin producer, chunk, manifest,
   audit, source, and dependency hashes before advancing.
7. Abort before `3 GB` private memory; preserve all completed chunk files and
   manifests, emit no PASS for an incomplete row, and resume only at the first
   missing cell.
8. When the matrix has no `U`, run the cross-only fail-closed assembler, then
   the `Z/EA/EB/X` support-coverage assembler.

This ordering minimizes rebuilds while retaining the required isolation: reuse
is limited to middle/far rows within one face and one grade.

## Left-right involution audit: no cross-row hash reuse

The only candidate left-right involution is

```
sigma(h)=h,
sigma(ta)=tb,  sigma(tb)=ta,
sigma(P)=Q,    sigma(Q)=P,
sigma(a_i)=b_i, sigma(b_i)=a_i  for i=0,...,7.
```

It sends normalized face `(0,1)` to `(1,0)` and swaps the abstract slack groups
`A` and `B`.  It also swaps the ordinary left and right factor rows.  However,
source inspection shows that the auxiliary construction is oriented and is not
invariant under this swap:

1. `tail=[0,0,0]+left[3:]` always truncates the **left** row.  Under `sigma`,
   the old left tail becomes a right tail, whereas the face-`(1,0)` verifier
   again truncates its left row.  Already at rank three, the swapped old tail
   begins with the right polynomial `R_3`, while the newly constructed tail
   begins with the independent left polynomial `L_3`.
2. `right_direction[3]=h*right_base[2]` and its recurrence always perturb the
   **right** row.  Under `sigma` this becomes a left-direction row, but the
   face-`(1,0)` verifier again builds a right-direction row.
3. The strong capacity is `left_ratios[2]`.  Under `sigma` it becomes the old
   right ratio, while the face-`(1,0)` construction again uses its new left
   ratio.

Writing `T_L,T_R` for the two tails, `D_L,D_R` for the two direction rows, and
`*` for binomial convolution makes the mismatch explicit.  Face `(0,1)` uses

```
V = T_L * R,   E = L * D_R,   W = T_L * D_R.
```

After `sigma` these become

```
T_R * L,       R * D_L,       T_R * D_L,
```

whereas the independently constructed face `(1,0)` again has the oriented
form `T_L*R, L*D_R, T_L*D_R` in its own variables.  Middle versus far changes
only the scalar combination of the oriented base/linear/direction pieces; it
does not exchange left tail with right tail or right direction with left
direction.  Therefore swapping middle/far cannot repair the mismatch.

Conclusion: no producer report, chunk digest, ordered row digest, or audit hash
from `face_01` can be reused for `face_10`.  The verifier **source** and the
abstract degree/support lemmas may be reused, and the involution explains the
set-level swap `A<->B`, but all 62 face-`10` row-grade outputs require separate
construction and audit.
