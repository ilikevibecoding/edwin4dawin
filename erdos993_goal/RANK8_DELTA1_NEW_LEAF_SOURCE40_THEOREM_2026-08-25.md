# Rank-eight Delta1 inserted-leaf theorem for source order at least 40

Date: 2026-08-25

Status: **proved with independent exact reconstruction**. This is one
rank-eight leaf-gate theorem, not a proof of Erdős Problem 993.

## Theorem

Let `A` be a tree of order at least 40, let `v` be any vertex, and attach a
new leaf `w` at `v`. At the new root `w`, the Newton `Delta1` coefficient
of the rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,                 F=A-N_A[v].
```

The sealed source-order-41 theorem handles `|D|>=40`. Thus only `|D|=39`
is new here.

## Endpoint reduction and analytic bounds

The raw `Delta1` gate is separately concave in the two top coefficients
`c8` and `d7`. The `Q7(C)` and `Q6(D)` bounds reduce its minimum to four
endpoint masks. The independently audited containment certificate proves
masks 0, 1, and 2 for every `|D|>=26`. It remains to prove mask 3 at
`|D|=39`.

Normalize

```text
d6=1,       x=d5/d6,       y=d4/d5,       u5=f5/d5.
```

The sharp forest rank-(4,5) ratio, the discrete two-extension lemma, and
extension counting give

```text
3/17 <= x <= 6696/27485,
1/7 <= y <= 45/248.
```

For completeness, choose an independent four-set `S` of `D` uniformly and
put `q=|D-N[S]|`. Double counting gives

```text
E q = mu4 := 5d5/d4,
E i2(D-N[S]) = 15d6/d4.
```

The residual forest has at most `q-1` edges, so its number of independent
pairs is at least `h(q)`, where

```text
h(0)=h(1)=h(2)=0,       h(q)=C(q-1,2) for q>=3.
```

The integer first differences of `h` are nondecreasing. Let `Phi` be its
convex piecewise-linear interpolation. On `[q,q+1]`, `q>=2`, it exceeds
the quadratic continuation at `q+r` by `r(1-r)/2`. Jensen therefore gives

```text
mu5 := 6d6/d5 >= 2 Phi(mu4)/mu4
                     >= mu4-3+2/mu4.                 (0)
```

The pinned forest ratio theorem gives `mu4>=248/9`. The right side of (0)
is increasing there and equals `27485/1116`, proving the stated upper
bound on `x`. The exact discrete transfer at the endpoint is the stronger
`3055/124`; its reserve over the smooth bound is `5/558`. The bound-chain
auditor reconstructs `h` on `0<=q<=35`, checks convexity and both
double-counting multipliers, and recomputes every rational constant.

The proved forest `Q5(D)>=0` inequality is

```text
y <= 10x/(x+12).                                      (1)
```

With `M=|F|`, the compatible shadow bounds are

```text
6 f6 <= (M-5) f5,                                     (2)
4(d5-f5) <= 35(d4-f4).                                (3)
```

The tree/vertex decomposition has `M=|F|=|E(D)|=39-deg_A(v)`.

## The branch `M<=23`

The edge-union bound

```text
i_k(D) >= C(39,k)-23 C(37,k-2)
```

gives the rank-4, rank-5, and rank-6 floors

```text
66933, 397047, 1743588.
```

Together with `f_k<=C(23,k)`, the normalized absolute caps are

```text
f4/d4 <= 8855/66933,
f5/d5 <= 4807/56721,
f6/d6 <= 437/7548.
```

Split normalized `x` at `0,1/2,1`; on each slab use (1) at its right
endpoint. Split `u5` at

```text
0, 12010945/151624224, 4807/56721,
```

using (2) below the interior switch and the absolute rank-6 cap above it.
The absolute rank-4 cap is sharper throughout. These four rational boxes
have 4,200 tensor Bernstein coefficients, all strictly positive.

The same coarse independent-cap relaxation first fails at cutoff 24 with
ten negative coefficients and two negative vertices. Its minimum tensor
vertex has `u5=f5=0` but `f4>0`, violating the exact `M=24` forest ratio
`f4<=(105/272)f5`. The split audit checks this exact incompatibility and
the independently replayed exact `M=24` certificate.

## The exact branches `24<=M<=38`

For exact order `M`, the sharp forest ratio gives

```text
t_M=(M-7)(M-8)/(M-3),             f4 <= (5/t_M) f5.   (4)
```

Partition normalized `x` at

```text
0, 1/8, 1/4, 1/2, 1.
```

At the right endpoint `x_b` of an `x` slab use

```text
y <= min(45/248, 10 x_b/(x_b+12)).
```

Partition the resulting `y` interval at normalized positions

```text
0, 1/4, 1/2, 3/4, 7/8, 15/16, 31/32, 63/64, 1.
```

For lower endpoint `y_0`, split `u5` at

```text
s(M,y_0)=(y_0-4/35)/(5/t_M-4/35).
```

Use (4) on `[0,s]`, (3) on `[s,1]`, and (2) for `f6` throughout.
The independent bound audit checks all 480 switches and finds
`272/2587<=s<=110931/123136`.

There are 15 exact integer orders, four `x` slabs, eight `y` slabs, and
two `u5` regions: 960 rational boxes. Their 1,152,000 tensor Bernstein
coefficients are all strictly positive. Together with the small branch,
the `|D|=39` mask-3 certificate has 964 boxes and 1,156,200 strictly
positive coefficients.

Every shard auditor imports neither producer nor probe. It reconstructs the
endpoint numerator from the canonical symbolic transcript and recomputes
every rational Bernstein coefficient. The canonical numerator hash is

```text
5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E
```

and the cleared endpoint denominator is

```text
2744 d5^4(d6+f5)>0.
```

Thus mask 3 is positive at `|D|=39`. Masks 0--2 and separate concavity
complete the `|D|=39` gate. Combining it with the sealed `|D|>=40` gate
and using `|D|=|A|-1` proves the theorem.

## Boundary

This theorem closes only the `Delta1` gate when the inserted leaf is the
root and `|A|>=40`. Source orders 27--39, the remaining `Delta2/3` work,
old-root increment gates, connected `Q8`, forest `Q8`, rank-eight PGC,
and Erdős Problem 993 remain outside this certificate.

## Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_order39_small_F23_delta1d39.py
  D1ED421A6CCCD0D1B243F4C54DC0F4CCAEB8844F021780249CB627EF1E1CF684
rank8_delta1_new_leaf_mask3_order39_small_F23_delta1d39_20260825.json
  686090115CD0643715B74A279B9871D8869C2013BF33FC0D61DA31813B52B8BD
audit_rank8_delta1_new_leaf_mask3_order39_small_F23_delta1d39.py
  C1A5932094DC19E3CB0095F0268E22945E7FD625845224C5F94F6E7D11013803
rank8_delta1_new_leaf_mask3_order39_small_F23_independent_audit_delta1d39_20260825.json
  EDBFC216F4C99E79B5999904CBCD3DCDE303D9A0B14B0A31678CFF6F07BB4923

prove_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py
  A8F48C5A51F319209944550B2B9F55D3FF75FC08FC9A907AA2DB7ED116F94C69
audit_rank8_delta1_new_leaf_mask3_order39_exact_F_shard_delta1d39.py
  76C6938C734DBA7E1A1E2842CD21064B2F483AEA7ABED42A4EFB568E42A58DA6

primary exact-F reports 24-25 / 26-27 / 28-29 / 30-31 / 32-33 / 34-35 / 36-37 / 38
  F68A22FEC919DBF82468F908341A3200339B38DA53F47F17E948B66E4D919B80
  E3D44243C9D3949ECE9AC0998CB6DF279E50B2C278E057DBB2A54A6277737F32
  C0CBB35C358E8A900CCE22029AA71FDB912398078EBCBC0F7BF038461A20E277
  944332E61766343B4BA34C5EA9A1BD43E213A2FC821ACF5BBE1EC8CEE8D989A9
  641B4E663EB47445FEA800A585B8348B6E9ABED074945731FA4363D8E11AA2AE
  9EC7B4511E9A1CADFD86EFD9A8B1EC868925A268B19A38FAD0E9F5FBD7FE4455
  F7064642B22F58EB5D4E2A5BA8A7CCB4F83A575ED2633AFCB2D492A570A52EC8
  7A9A5C2C310DF5271D6BDF4A478648076D92DC62A4F15DAEE8F5DC6DE739EE9E
independent exact-F reports 24-25 / 26-27 / 28-29 / 30-31 / 32-33 / 34-35 / 36-37 / 38
  910E64C6545049A78F73128EE6FC06FF85FA95ED908FF833AFF5BA3E59E09E6D
  C42C645A48552A614F87A2A5D0C9A8EED695A691F801134731B8F94401BAFD0B
  A1AA761D7CDB7D57D9115239D062B186BFF77F83DFE1ACC61B090817C0C68AD9
  11A1877F41DA722B43488B67E3E8EE4DB02DF06DF18C58BE543CB3C14BFAFF8A
  F8C35237050D2C870E1C478176B9ECB44EBE55E3CB06E7735D315FEB16BEB828
  DC56FCB9FAEC130C00C158B35E86693F6336AC644ABE5CBFE26E636BFE5CFF8E
  9152F3A525682591134BC64B91F8EA0A63C7EFD2FE1EA44058BE3DC08C3145B4
  BD26F72A53531C4B7ECFC2B725C30E9A57CCA94B0CE524EE7A2F71532423265D

audit_rank8_delta1_order39_bound_chain_delta1d39.py
  8A4B27B61DA6F71A65D93358C00A18A0C26C0010631595BAF3CDF5459B695F6B
rank8_delta1_order39_bound_chain_independent_audit_delta1d39_20260825.json
  77B90700811F3882C1EDFEDFA74124D86CCF875539B66E4595DA5A5D8D8D6C62

audit_rank8_delta1_order39_split_diagnostic_delta1d39.py
  23B113BC85F82E210BEEEF75D12D6638CE71D61A8BC9F90806C31BA43980A11C
rank8_delta1_order39_split_diagnostic_audit_delta1d39_20260825.json
  3FE05CD39769FD1E1E597670F291814576468FCD5542B118E3DA55D4B17ED074

assemble_rank8_delta1_new_leaf_mask3_order39_delta1d39.py
  4AAFBF0921EE7269AAD75E4956FFE0091A693D6E00011DCBBFCDDDD44D3D7B4F
rank8_delta1_new_leaf_mask3_order39_delta1d39_20260825.json
  43BA2B9BEA6D09B3C8ACD59D84E9FC4449C32C8C0E4534542DF938E0362574FC
audit_rank8_delta1_new_leaf_mask3_order39_assembly_delta1d39.py
  80F70CA3FFB6D60F8486A3F5E9EEEA6612D7C58946A3E8228CBC0343FC166E73
rank8_delta1_new_leaf_mask3_order39_assembly_independent_audit_delta1d39_20260825.json
  6B3B0734335B9866138B111135C36EFEB75542D9D33F20A23452FFD8D01048E8

assemble_rank8_delta1_new_leaf_gate_source40_delta1d39.py
  CD022A88F87298C41938D77B06D59DB1D0F1FDA0C75810717CBCA6163EE003AC
rank8_delta1_new_leaf_gate_source40_delta1d39_20260825.json
  ED00F446FA3F7A4719BB683DC7634BEC79591EF28F5C0264F4867396C89579B8
audit_rank8_delta1_new_leaf_gate_source40_delta1d39.py
  476F05B4A0315E178B0ADF0FA2111AB5AB2F456DE8DEFFB0680A5D0F58B7D0DD
rank8_delta1_new_leaf_gate_source40_independent_audit_delta1d39_20260825.json
  223E8BC7206F2B8C87A72CCD45F61E07551BA4E97ACDAC682F17D5D74F4AA160
```

Pinned analytic dependencies and upper gate:

```text
FOREST_V6_ALPHA10_THEOREM_2026-08-13.md
  D6F2B1017B3C222167209AC00158423C98607CAE1804415C24ED82F2DC8F91FF
prove_forest_v6_alpha10.py
  2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947
forest_v6_alpha10_exact_20260813.json
  5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4
TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md
  7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528
verify_tree_rank45_path_ratio.py
  AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C
RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md
  CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D
verify_rank5_three_halves_forest_certificate.py
  56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE

rank8_delta1_new_leaf_masks012_containment_certificate_root_20260825.json
  D6ED1CE4BF50AA86CD58309BA1D18C31127AAD1A391DA9E5A1C63E4E0693EE47
rank8_delta1_new_leaf_masks012_normalized_containment_box_independent_audit_root_20260825.json
  549141288E11B8BA0902E1A30E1211258A590180FD8AB9E6ED6398828AEE076A

assemble_rank8_delta1_new_leaf_gate_source41_delta1d40.py
  3D18C80B0E29D691B8E7ED2EACBFBCEDC13355831DD1C3575B7E063D9665158E
rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json
  EF2A31B3FAC3D02FB390FE92A7334D81B2B8B1844EF0B67AE5219E6F9E1AE146
audit_rank8_delta1_new_leaf_gate_source41_delta1d40.py
  33C05A9ED97C23C02BE17AD8AD1E0EDC21C188E9CCEE0C7A3E0FB8E889B6F4BB
rank8_delta1_new_leaf_gate_source41_independent_audit_delta1d40_20260825.json
  7A775C87EB6B3AD2767D5C8D235759FE4642B1B8B107872AD6BF171D46B0C9F9
```
