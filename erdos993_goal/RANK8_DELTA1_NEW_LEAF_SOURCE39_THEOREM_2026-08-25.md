# Rank-eight Delta1 inserted-leaf theorem for source order at least 39

Date: 2026-08-25

Status: **proved with independent exact reconstruction**. This is one
rank-eight leaf-gate theorem, not a proof of Erdős Problem 993.

## Theorem

Let `A` be a tree of order at least 39, let `v` be any vertex, and attach a
new leaf `w` at `v`. At the new root `w`, the Newton `Delta1` coefficient
of the rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,                 F=A-N_A[v].
```

The sealed source-order-40 theorem handles `|D|>=39`. Thus only `|D|=38`
is new here.

## Endpoint reduction and analytic bounds

The raw `Delta1` gate is separately concave in the two top coefficients
`c8` and `d7`. The `Q7(C)` and `Q6(D)` bounds reduce its minimum to four
endpoint masks. The independently audited containment certificate proves
masks 0, 1, and 2 for every `|D|>=26`. It remains to prove mask 3 at
`|D|=38`.

Normalize

```text
d6=1,       x=d5/d6,       y=d4/d5,       u5=f5/d5.
```

The sharp forest rank-(4,5) ratio, the discrete two-extension lemma, and
extension counting give

```text
2/11 <= x <= 279/1100,
5/34 <= y <= 35/186.
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

The pinned forest ratio theorem gives `mu4>=186/7`. The smooth right side
of (0) is increasing there and equals `15394/651`. More sharply, on each
support interval `[q,q+1]`, the exact transfer `g(t)=2 Phi(t)/t` satisfies
`t^2 g'(t)=(q-1)(q+2)>0`. Since `Phi(186/7)=2200/7`, this gives
`mu5>=2200/93`, hence `x<=279/1100`; the reserve over the smooth bound is
`2/217`. The bound-chain auditor reconstructs `h` on `0<=q<=34`, checks
convexity, exact-transfer monotonicity, both double-counting multipliers,
and every rational constant.

The proved forest `Q5(D)>=0` inequality is

```text
y <= 10x/(x+12).                                      (1)
```

With `M=|F|`, the compatible shadow bounds are

```text
6 f6 <= (M-5) f5,                                     (2)
4(d5-f5) <= 34(d4-f4).                                (3)
```

The tree/vertex decomposition has `M=|F|=|E(D)|=38-deg_A(v)`.

## The branch `M<=22`

The edge-union bound

```text
i_k(D) >= C(38,k)-22 C(36,k-2)
```

gives the rank-4, rank-5, and rank-6 floors

```text
59955, 344862, 1464771.
```

Together with `f_k<=C(22,k)`, the normalized absolute caps are

```text
f4/d4 <= 209/1713,
f5/d5 <= 209/2737,
f6/d6 <= 19/373.
```

Split normalized `x` at `0,1/2,1`; on each slab use (1) at its right
endpoint. Split `u5` at

```text
0, 41800/589713, 209/2737,
```

using (2) below the interior switch and the absolute rank-6 cap above it.
The absolute rank-4 cap is sharper throughout. These four rational boxes
have 4,200 tensor Bernstein coefficients, all strictly positive.

The same coarse independent-cap relaxation first fails at cutoff 23 with
eleven negative coefficients and two negative vertices. Its minimum tensor
vertex has `u5=f5=0` but `f4>0`, violating the exact `M=23` forest ratio
`f4<=(5/12)f5`. The split audit checks this exact incompatibility and
the independently replayed exact `M=23` certificate.

## The exact branches `23<=M<=37`

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
y <= min(35/186, 10 x_b/(x_b+12)).
```

Partition the resulting `y` interval at normalized positions

```text
0, 1/4, 1/2, 3/4, 7/8, 15/16, 31/32, 63/64, 1.
```

For lower endpoint `y_0`, split `u5` at

```text
s(M,y_0)=(y_0-2/17)/(5/t_M-2/17).
```

Use (4) on `[0,s]`, (3) on `[s,1]`, and (2) for `f6` throughout.
The independent bound audit checks all 480 switches and finds
`6/61<=s<=205059/228160`.

There are 15 exact integer orders, four `x` slabs, eight `y` slabs, and
two `u5` regions: 960 rational boxes. Their 1,152,000 tensor Bernstein
coefficients are all strictly positive. Together with the small branch,
the `|D|=38` mask-3 certificate has 964 boxes and 1,156,200 strictly
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

Thus mask 3 is positive at `|D|=38`. Masks 0--2 and separate concavity
complete the `|D|=38` gate. Combining it with the sealed `|D|>=39` gate
and using `|D|=|A|-1` proves the theorem.

## Boundary

This theorem closes only the `Delta1` gate when the inserted leaf is the
root and `|A|>=39`. Source orders 27--38, the remaining `Delta2/3` work,
old-root increment gates, connected `Q8`, forest `Q8`, rank-eight PGC,
and Erdős Problem 993 remain outside this certificate.

## Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_order38_small_F22_delta1d38.py
  1B49DA1A17E50F1C1A530E0C540063F8C10A91FD4D9301D6A6F3AFAF83B43F65
rank8_delta1_new_leaf_mask3_order38_small_F22_delta1d38_20260825.json
  4A595B5805125ED0906B8EE9CE37DA7D95B780EFB14B73474BF7E2F90457E65D
audit_rank8_delta1_new_leaf_mask3_order38_small_F22_delta1d38.py
  AB7FAA43B05EE2307C0A01A88935C17050C7599BC1CE8264F1A1A68EEAECDF0B
rank8_delta1_new_leaf_mask3_order38_small_F22_independent_audit_delta1d38_20260825.json
  3D1D8A1650C73BAF44C46A18535040AC3DE3E5231A7DFED6B4D10457F3D94FA7

prove_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py
  18FB3906349B3F51BAAF2D276C98A4D4C2C2E54630F3FA3F76CD4768165ECB9D
audit_rank8_delta1_new_leaf_mask3_order38_exact_F_shard_delta1d38.py
  2C7AA808CB7D0DFFCB2F3C87A08FED23D195C613DDB7427ABD4A340BC209B49E

primary exact-F reports 23-24 / 25-26 / 27-28 / 29-30 / 31-32 / 33-34 / 35-36 / 37
  974941C8B7384478DB18486EEE9D4DA282C9269C646DEA345ED38AADC6D15DB0
  BA46665E5FBEAA2DDA450B93B5DD61FA69D9A3EF255495173280860629E60021
  9316A5FC677F922C3280FE9B9976013CDEB198F68A17A165EEFA8E84B99B98B7
  6EDA65FED05393AE4BA3C402671341A9B0E868B4E332D59BC8DBCB06BEB284A2
  C274BC1847EFE1B9D2D892F516ACE37B1E45672C6F30935A7D65B209383A27C7
  649A4FD3F72C5F7108E469D14B2FDC5F83511C118CADECAE54CBD25BECEFA67E
  6890346FFA68D518A8952E2EF8AE91101B0927BDF193A1DD95F9EA178850710B
  DA0E3C337A395B7399F3D9C7FD45EE25F7F74FB8134A3D5894C64D9FF6AE2C77
independent exact-F reports 23-24 / 25-26 / 27-28 / 29-30 / 31-32 / 33-34 / 35-36 / 37
  8738F56ABA5C4AA7E0B672AF9CA4A43E0EB7E611CFB2B0DAEA4CADF7C24E8AE5
  92C0BEC46E61D25F79A0423A67341B61D467A654063CFC513A76DE9744F7D54D
  0E5E94FCC24F733AB9C3169CA59ECA02DC57D3B371D8207BD519F9D28E115DB9
  E9556B8486E6D5EA06C30A07D34A20066AB28B17BECD6E1F137ED3AC949BCA73
  739B766C8F61FF7FED9457FFFF3DCD70B1C4D2B296D08A288B3E4A5D56CEC80F
  DA45A27A5A0630EB70A8341F896FDF370C83187AFE0C5F023A17A8036C3F39C2
  F7FCB422B5CC7A7D256B90B7262D28D5386322116ABDDD11526C2592E3929427
  0CED42C9761F44D1135B81233C20A5C50686436FFDBE4057F14523413A6D00C5

audit_rank8_delta1_order38_bound_chain_delta1d38.py
  15BA4F219AC6F8836BFB795AFA5B2ED26015E7111F9EB12A16CA7CA3AA103CFC
rank8_delta1_order38_bound_chain_independent_audit_delta1d38_20260825.json
  6E1D011E11116E2D7ED0DA23D57843FD30151BF63C1874268820FC6E4D116F19

audit_rank8_delta1_order38_split_diagnostic_delta1d38.py
  1A9C0ECA2354FA3073ABC903121A74AABF76D434733CF4ED90F74F6B0B59E36D
rank8_delta1_order38_split_diagnostic_audit_delta1d38_20260825.json
  EBC1C28AAD3A9CF3F9272714AA5E3A21D9BF3E6FFD0D51EA03A043E3A1B9F214

assemble_rank8_delta1_new_leaf_mask3_order38_delta1d38.py
  03B307F1526A90DDB6B3D8DEC774851799A62A1CA8F7A9F5AF6E6D89B4966A9D
rank8_delta1_new_leaf_mask3_order38_delta1d38_20260825.json
  9FBA55E56968D39575E03B04558335505773842046C7EA9FA3F3E5B2EA30E32D
audit_rank8_delta1_new_leaf_mask3_order38_assembly_delta1d38.py
  B0B905950A343EC0D73A4026788689AD3A2E260C9AC04C409DB7BD89F232AC97
rank8_delta1_new_leaf_mask3_order38_assembly_independent_audit_delta1d38_20260825.json
  011551E69B4B873423025B2166F03161572331BDFD22EE78BCB5479648E3B00F

assemble_rank8_delta1_new_leaf_gate_source39_delta1d38.py
  763326798816E6C205611F8E1A4A967E833C7B5C83B72C3C11A0A343AC387B82
rank8_delta1_new_leaf_gate_source39_delta1d38_20260825.json
  6F1E7A0359C84430958F749B38508840083AFD24F73E46281653A6D0E7B631B6
audit_rank8_delta1_new_leaf_gate_source39_delta1d38.py
  F7A217D5B376DA71F04FAF2837269F008CFC4E10F5E1240AEB3C74445D2BE4E2
rank8_delta1_new_leaf_gate_source39_independent_audit_delta1d38_20260825.json
  410B95401F54C89C48A4F92745615045341ED139BB70354FD60F24A2F0CC33EE
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

assemble_rank8_delta1_new_leaf_gate_source40_delta1d39.py
  CD022A88F87298C41938D77B06D59DB1D0F1FDA0C75810717CBCA6163EE003AC
rank8_delta1_new_leaf_gate_source40_delta1d39_20260825.json
  ED00F446FA3F7A4719BB683DC7634BEC79591EF28F5C0264F4867396C89579B8
audit_rank8_delta1_new_leaf_gate_source40_delta1d39.py
  476F05B4A0315E178B0ADF0FA2111AB5AB2F456DE8DEFFB0680A5D0F58B7D0DD
rank8_delta1_new_leaf_gate_source40_independent_audit_delta1d39_20260825.json
  223E8BC7206F2B8C87A72CCD45F61E07551BA4E97ACDAC682F17D5D74F4AA160
```
