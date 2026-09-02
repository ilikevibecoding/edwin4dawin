# Rank-eight Delta1 inserted-leaf theorem for source order at least 43

Date: 2026-08-25

Status: **proved with independent exact reconstruction**. This is one
rank-eight leaf-gate theorem, not a proof of Erdős Problem 993.

## Theorem

Let `A` be a tree of order at least 43, let `v` be any vertex, and attach a
new leaf `w` at `v`. At the new root `w`, the Newton `Delta1` coefficient
of the rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,                 F=A-N_A[v].
```

The sealed source-order-44 theorem handles `|D|>=43`. Thus only `|D|=42`
is new here.

## Endpoint reduction and analytic bounds

The raw `Delta1` gate is separately concave in the two top coefficients
`c8` and `d7`. The `Q7(C)` and `Q6(D)` bounds reduce its minimum to four
endpoint masks. The independently audited containment certificate proves
masks 0, 1, and 2 for every `|D|>=26`. It remains to prove mask 3 at
`|D|=42`.

Normalize

```text
d6=1,       x=d5/d6,       y=d4/d5,       u5=f5/d5.
```

The sharp forest rank-(4,5) ratio, the discrete two-extension lemma, and
extension counting give

```text
6/37 <= x <= 69615/319978,
5/38 <= y <= 39/238.
```

For completeness, choose an independent four-set `S` of `D` uniformly and
put `q=|D-N[S]|`. Then

```text
E q = mu4 := 5d5/d4,
E i2(D-N[S]) = 15d6/d4.
```

For integer `q>=2`, the linear interpolation of
`h(q)=C(q-1,2)` exceeds its quadratic continuation at `q+r` by exactly
`r(1-r)/2`. Jensen's inequality therefore gives

```text
mu5 := 6d6/d5 >= 2 Phi(mu4)/mu4
                     >= mu4-3+2/mu4.                 (0)
```

At `|D|=42`, the pinned forest theorem gives `mu4>=1190/39`. The right
side of (0) is increasing there and equals `639956/23205`, proving the
stated upper bound on `x`. The bound-chain auditor recomputes the
interpolation reserve, derivative, and all rational constants exactly.

The proved forest `Q5(D)>=0` inequality is

```text
y <= 10x/(x+12).                                      (1)
```

With `M=|F|`, the compatible shadow bounds are

```text
6 f6 <= (M-5) f5,                                     (2)
4(d5-f5) <= 38(d4-f4).                                (3)
```

The tree/vertex decomposition has
`M=|F|=|E(D)|=42-deg_A(v)`.

## The branch `M<=26`

The edge-union bound

```text
i_k(D) >= C(42,k)-26 C(40,k-2)
```

gives the rank-4, rank-5, and rank-6 floors

```text
91650, 593788, 2869646.
```

Together with `f_k<=C(26,k)`, the normalized absolute caps are

```text
f4/d4 <= 23/141,
f5/d5 <= 1265/11419,
f6/d6 <= 8855/110371.
```

Split normalized `x` at `0,1/2,1`; on each slab use (1) at its right
endpoint. Split `u5` at

```text
0, 161908868/1536695433, 1265/11419,
```

using (2) below the interior switch and the absolute rank-6 cap above it.
The absolute rank-4 cap is sharper throughout. These four rational boxes
have 4,200 tensor Bernstein coefficients, all strictly positive.

The same coarse independent-cap relaxation first fails at cutoff 27 with
five negative coefficients and two negative vertices. This is not a
compatible counterexample: its minimum tensor vertex has `u5=f5=0` but
`f4>0`, violating the exact `M=27` forest ratio
`f4<=(6/19)f5`. The split-diagnostic audit checks this rational
incompatibility and the independently replayed exact `M=27` certificate.

## The exact branches `27<=M<=41`

For exact order `M`, the sharp forest ratio gives

```text
t_M=(M-7)(M-8)/(M-3),             f4 <= (5/t_M) f5.   (4)
```

Partition normalized `x` at

```text
0, 1/8, 1/4, 1/2, 1.
```

At the right endpoint `x_b` of an `x` slab use the outer cap

```text
y <= min(39/238, 10 x_b/(x_b+12)).
```

Partition the resulting `y` interval at normalized positions

```text
0, 1/4, 1/2, 3/4, 7/8, 15/16, 31/32, 63/64, 1.
```

For lower endpoint `y_0`, split `u5` at

```text
s(M,y_0)=(y_0-4/38)/(5/t_M-4/38).
```

Use (4) on `[0,s]`, (3) on `[s,1]`, and (2) for `f6` throughout.
The independent bound audit checks all 480 switches and finds
`1/8<=s<=39633/43712`.

There are 15 exact integer orders, four `x` slabs, eight `y` slabs, and
two `u5` regions: 960 rational boxes. Their 1,152,000 tensor Bernstein
coefficients are all strictly positive. Together with the small branch,
the `|D|=42` mask-3 certificate has 964 boxes and 1,156,200 strictly
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

Thus mask 3 is positive at `|D|=42`. Masks 0--2 and separate concavity
complete the `|D|=42` gate. Combining it with the sealed `|D|>=43` gate
and using `|D|=|A|-1` proves the theorem.

## Boundary

This theorem closes only the `Delta1` gate when the inserted leaf is the
root and `|A|>=43`. Source orders 27--42, the remaining `Delta2/3` work,
old-root increment gates, connected `Q8`, forest `Q8`, rank-eight PGC,
and Erdős Problem 993 remain outside this certificate.

## Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_order42_small_F26_delta1d42.py
  588F917516A9C06706ADA9B3F1C1EEF78D34E45B7BA6C111D85126CA49078296
rank8_delta1_new_leaf_mask3_order42_small_F26_delta1d42_20260825.json
  DBA04CCDB0D793D7AB8B8665FF1CD4A4C9C80837B5E5EF2A701404330A4AE39F
audit_rank8_delta1_new_leaf_mask3_order42_small_F26_delta1d42.py
  634CA74EA55ADE00C28815502F25AB532DB19BC5194DE2697E38BB7DB145DBA5
rank8_delta1_new_leaf_mask3_order42_small_F26_independent_audit_delta1d42_20260825.json
  C6BA56CEFD2466F1EC2146420EF4C28ED74F88D0C7640890C78F3BCF24E493E7

prove_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py
  72532F39C0A55ECD40D22BFF4A577DBEC36F9C4B9EDBA8F0D716FB60BE33F459
audit_rank8_delta1_new_leaf_mask3_order42_exact_F_shard_delta1d42.py
  A3492F30806A5DFF496ADE7A003516D4374E0ACDA4D9EBAF818BB27B86183051

primary exact-F reports 27-28 / 29-30 / 31-32 / 33-34 / 35-36 / 37-38 / 39-40 / 41
  851A4BB7DB8341FF388659C621C3F937EFEA09FA6DF79C4537612C1D234AB207
  B8A0F411A39576360D859018DF72F2FF651A25E6AAA34D4ED45437BA99F5B538
  C8177BC97452BCC8CFB7CC9DFF68AFC2E0CABF552E549762C8419EF7C9B4633B
  335CB62B9D3E0811B9C3270366237B68B41E3DDEFFF7501048BF6FBEC0C50B49
  BAF7A425730434741DBD3057E11E403A481AA289270D618152AD79A8CCD97CB0
  9E35276AAECD71D6DF44067496D9FAAFD9A4395C87ED8BC781EB9D6EB50B8B4C
  69428E62E8864B78905E357949C76B42733BBA36FC3C7B7CC3DBE991EE717598
  96B3E31B2379C1AA68A84934073A3D2D6A74E090E902991A1301C842566F0BF1
independent exact-F reports 27-28 / 29-30 / 31-32 / 33-34 / 35-36 / 37-38 / 39-40 / 41
  85B27E9374BB094D6A38A11267BA5E539FDEA147415BE23DCBD44F927FA0CB7E
  69488ABE8BCC493D8ACD98EA295A54B7842DD7D648BB5E25E778D5B9E38AB543
  6E566AEBDA02D7D7813766E61D3795BE3DDB3D6BF38621133CC6B5F43890CD92
  A5016D2625B15B681B2829107DF00E6E7C4E9526B5E6BD0EA277DD52BDE1F544
  5021FF2903C0E07467429282119F49EED57F0A4F7C4180FFF1703012644B7F36
  2A2342332D1EDA9DDBA30F7AC2DBAD51EAAABA47C270FC68092FCCC900225946
  BD93851B0918AC810620E9661A000B2ADCDE36656A1879A237D1F7EA4455B736
  313B6BC9C0141BBACE4A61B45EE4D70C5930653F8246877BB034808CF9DF9E30

audit_rank8_delta1_order42_bound_chain_delta1d42.py
  9B2CFE146A767C377D941224E82913CF9C7392829E69EAF2D88F2959E05BD9DE
rank8_delta1_order42_bound_chain_independent_audit_delta1d42_20260825.json
  9F3E5C38C5399E584CCD8D306EAC391DDE654D0E1B0B271A7BC69EEDC855907A

audit_rank8_delta1_order42_split_diagnostic_delta1d42.py
  F1BF350E9392A0ED2AAB266457256C553008A209905E0F7B6D422220FCD907D2
rank8_delta1_order42_split_diagnostic_audit_delta1d42_20260825.json
  A9D8BB82879E79B63FF3DD51F8064FE82AFD9A3238D275D28E1F14659ABC81F7

assemble_rank8_delta1_new_leaf_mask3_order42_delta1d42.py
  53BBCD3AB0013BC27604F96736294561A732A62F147E638B3A3C67917DC5EE9A
rank8_delta1_new_leaf_mask3_order42_delta1d42_20260825.json
  8D429EC79FC4759455A762DA1A13E0C19B9D18A4235BEA5ACC34DCAAFA98DCF7
audit_rank8_delta1_new_leaf_mask3_order42_assembly_delta1d42.py
  BEC7251AC321CCE92C571712B9E1FED2EECBBCD451D5CE217DF6AAD80D10CCDC
rank8_delta1_new_leaf_mask3_order42_assembly_independent_audit_delta1d42_20260825.json
  F46B92A6B30A8C4846CE8FC4425C0A7DAEC5EED23CE0896893A4DDDC2521A2D5

assemble_rank8_delta1_new_leaf_gate_source43_delta1d42.py
  AC599E484CB115B51411EF18FB0CDABE009D37B815708F369D7B0FB29F4BA078
rank8_delta1_new_leaf_gate_source43_delta1d42_20260825.json
  C47388E65A7F05F92658507330AA8D584E4D31E54589B7C92BDA26DFC82533EA
audit_rank8_delta1_new_leaf_gate_source43_delta1d42.py
  CFF9DE8B5B9D16EEBC5EA10281DC6452A96FD7B382BE8B3531EA4FE640FF977B
rank8_delta1_new_leaf_gate_source43_independent_audit_delta1d42_20260825.json
  A0C2F4BEAE9F4A511E7FF1227E71A34B8AFC74A5867D9493BDC5517058EBF586
```

Pinned analytic dependencies:

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
verify_rank5_three_halves_convolution_cones.py
  06BD1AA9355B1C07DE5B9087AFEE0477D9C583E0ED943EA86FC332FB692A8194

assemble_rank8_delta1_new_leaf_gate_source44_delta1d43.py
  F501B4B649F87C796E9A7DC17081F6395F576D1BEC8E83BB44821062EC59B877
rank8_delta1_new_leaf_gate_source44_delta1d43_20260825.json
  C47198613AB94C0FC8C91DDC68884D406B02C2D2FD6E937BB85986587D4ECCB8
audit_rank8_delta1_new_leaf_gate_source44_delta1d43.py
  395604004AF2D26580EA044FE6EF0FD2BCF084E85DD972940FDFEBB70C9DFC62
rank8_delta1_new_leaf_gate_source44_independent_audit_delta1d43_20260825.json
  F3347EB183C7F23AD37CCD403A6A44DAF596581DA261A25411897FE15F8C3AB0
```
