# Rank-eight Delta1 inserted-leaf theorem for source order at least 41

Date: 2026-08-25

Status: **proved with independent exact reconstruction**. This is one
rank-eight leaf-gate theorem, not a proof of Erdős Problem 993.

## Theorem

Let `A` be a tree of order at least 41, let `v` be any vertex, and attach a
new leaf `w` at `v`. At the new root `w`, the Newton `Delta1` coefficient
of the rank-eight terminal residual is nonnegative.

Put

```text
D=A-v,                 F=A-N_A[v].
```

The sealed source-order-42 theorem handles `|D|>=41`. Thus only `|D|=40`
is new here.

## Endpoint reduction and analytic bounds

The raw `Delta1` gate is separately concave in the two top coefficients
`c8` and `d7`. The `Q7(C)` and `Q6(D)` bounds reduce its minimum to four
endpoint masks. The independently audited containment certificate proves
masks 0, 1, and 2 for every `|D|>=26`. It remains to prove mask 3 at
`|D|=40`.

Normalize

```text
d6=1,       x=d5/d6,       y=d4/d5,       u5=f5/d5.
```

The sharp forest rank-(4,5) ratio, the discrete two-extension lemma, and
extension counting give

```text
6/35 <= x <= 117216/500329,
5/36 <= y <= 185/1056.
```

For completeness, choose an independent four-set `S` of `D` uniformly and
put `q=|D-N[S]|`. Then

```text
E q = mu4 := 5d5/d4,
E i2(D-N[S]) = 15d6/d4.
```

The residual `D-N[S]` is a forest on `q` vertices, so it has at most
`q-1` edges.  Hence its number of independent pairs is at least `h(q)`,
where

```text
h(0)=h(1)=h(2)=0,       h(q)=C(q-1,2) for q>=3.
```

The integer first differences of `h` are nondecreasing.  Let `Phi` be its
convex piecewise-linear interpolation.  On every interval `[q,q+1]` with
`q>=2`, `Phi` exceeds the quadratic continuation at `q+r` by exactly
`r(1-r)/2`.  Double counting the four-to-five and four-to-six extensions,
followed by Jensen's inequality, therefore gives

```text
mu5 := 6d6/d5 >= 2 Phi(mu4)/mu4
                     >= mu4-3+2/mu4.                 (0)
```

At `|D|=40`, the pinned forest theorem gives `mu4>=1056/37`. The right
side of (0) is increasing there and equals `500329/19536`, proving the
stated upper bound on `x`.  At the endpoint the exact discrete transfer is
the slightly stronger `4509/176`; its reserve over the displayed smooth
bound is `85/9768`.  The bound-chain auditor reconstructs `h` on the full
support `0<=q<=36`, verifies convexity, both double-counting multipliers,
the interpolation reserve, the derivative, and all rational constants.

The proved forest `Q5(D)>=0` inequality is

```text
y <= 10x/(x+12).                                      (1)
```

With `M=|F|`, the compatible shadow bounds are

```text
6 f6 <= (M-5) f5,                                     (2)
4(d5-f5) <= 36(d4-f4).                                (3)
```

The tree/vertex decomposition has
`M=|F|=|E(D)|=40-deg_A(v)`.

## The branch `M<=24`

The edge-union bound

```text
i_k(D) >= C(40,k)-24 C(38,k-2)
```

gives the rank-4, rank-5, and rank-6 floors

```text
74518, 455544, 2066820.
```

Together with `f_k<=C(24,k)`, the normalized absolute caps are

```text
f4/d4 <= 5313/37259,
f5/d5 <= 1771/18981,
f6/d6 <= 253/3885.
```

Split normalized `x` at `0,1/2,1`; on each slab use (1) at its right
endpoint. Split `u5` at

```text
0, 11507567/131095440, 1771/18981,
```

using (2) below the interior switch and the absolute rank-6 cap above it.
The absolute rank-4 cap is sharper throughout. These four rational boxes
have 4,200 tensor Bernstein coefficients, all strictly positive.

The same coarse independent-cap relaxation first fails at cutoff 25 with
ten negative coefficients and two negative vertices. This is not a
compatible counterexample: its minimum tensor vertex has `u5=f5=0` but
`f4>0`, violating the exact `M=25` forest ratio
`f4<=(55/153)f5`. The split-diagnostic audit checks this rational
incompatibility and the independently replayed exact `M=25` certificate.

## The exact branches `25<=M<=39`

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
y <= min(185/1056, 10 x_b/(x_b+12)).
```

Partition the resulting `y` interval at normalized positions

```text
0, 1/4, 1/2, 3/4, 7/8, 15/16, 31/32, 63/64, 1.
```

For lower endpoint `y_0`, split `u5` at

```text
s(M,y_0)=(y_0-4/36)/(5/t_M-4/36).
```

Use (4) on `[0,s]`, (3) on `[s,1]`, and (2) for `f6` throughout.
The independent bound audit checks all 480 switches and finds
`17/152<=s<=399187/442112`.

There are 15 exact integer orders, four `x` slabs, eight `y` slabs, and
two `u5` regions: 960 rational boxes. Their 1,152,000 tensor Bernstein
coefficients are all strictly positive. Together with the small branch,
the `|D|=40` mask-3 certificate has 964 boxes and 1,156,200 strictly
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

Thus mask 3 is positive at `|D|=40`. Masks 0--2 and separate concavity
complete the `|D|=40` gate. Combining it with the sealed `|D|>=41` gate
and using `|D|=|A|-1` proves the theorem.

## Order-band diagnostic

An exact structural enumeration over every integer `27<=|D|<=42` and every
compatible integer `9<=M<=|D|-1` checked 13,056 ratio/missing-shadow
switches. All lie in `(0,1)`, and the same four `x`-slab cap pattern
`Q5,Q5,Q5,path-ratio` persists throughout. This is useful evidence for
reusing the partition, but it is deliberately **not** promoted to a
continuous order-band theorem: such a theorem still needs an additional
order variable in the rational Bernstein certificate and must preserve the
triangular coupling `M<=|D|-1` and the changing small-`F` cutoff.

## Boundary

This theorem closes only the `Delta1` gate when the inserted leaf is the
root and `|A|>=41`. Source orders 27--40, the remaining `Delta2/3` work,
old-root increment gates, connected `Q8`, forest `Q8`, rank-eight PGC,
and Erdős Problem 993 remain outside this certificate.

## Exact evidence

```text
prove_rank8_delta1_new_leaf_mask3_order40_small_F24_delta1d40.py
  AE50B058D008E49C2E32B4431F46FAA6DFCCD965C1988928362AEC9E2F0501C7
rank8_delta1_new_leaf_mask3_order40_small_F24_delta1d40_20260825.json
  A3C854C9A6DB7E6415D1744EA150D1A116FE077847734037D2E80B99DE835B3D
audit_rank8_delta1_new_leaf_mask3_order40_small_F24_delta1d40.py
  3E68D1EAB4522B63E82C7ED7E382E97857920F39D89906A2D724690FA06AC458
rank8_delta1_new_leaf_mask3_order40_small_F24_independent_audit_delta1d40_20260825.json
  302F7B53E68FE7B10CF7F92BAD3AE743F3E6E2E7B3C2BA94B96EF138AFF4BE7C

prove_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py
  3F8EBBD9EB30FF97D87A0D5F187BD2EFD4C516FCDA0A7A2DB63D85ED855F3BB6
audit_rank8_delta1_new_leaf_mask3_order40_exact_F_shard_delta1d40.py
  9AB1AA6631B6C006D60985D9AD4AB590604077468A661084A4729219D18E4043

primary exact-F reports 25-26 / 27-28 / 29-30 / 31-32 / 33-34 / 35-36 / 37-38 / 39
  F4A004DD97DC83BC290D311BAD23C7B57416B2E0C24BFDAAC263182E7489E731
  84E85F534396E28DF1BC2FAB2F9893F348E5E8ADCEC76CC4F6AE491E263D740E
  0E9CD50167C16EE96CCE3716A7778AE107138DF4DA67FB8808F06A2A876804C9
  8EF214A1877624ACF8A4BAD8F6E9CCCBFD62E009E9D657A7D80FFB86E5FDD5CE
  1FAF62D510CCB148C10817EDD356A6A9E9624BC7199BC6E0725AD050A95C357F
  E32060DA21EE2B7F71901916FC260026E416FC44611D9A4B56229AE3CD885349
  A458215ACAD62F0182EE7CF55E8CB8F9CADCC693A97E49E8F85DF47D287113EE
  37D44C05A5979FDAB36626B3D7633DEE2687B723488E50BA92DF30137FC96704
independent exact-F reports 25-26 / 27-28 / 29-30 / 31-32 / 33-34 / 35-36 / 37-38 / 39
  85194D8F2895810492871296CCC24A0F529B080610516D6E2DD1007E576CB3F6
  34722F3901BC266308EC158A523B36A521916C3E104682D6D3D526FD5655E47F
  AE84D5ADE4FBE60AA43AA6F561129AD0A2B0C50EAE3628613C2CFECED727167A
  CB20FD1DD2A13E56130BCEF31EB68553EBA180B7E2DAA648ABD374E64A8057DA
  049BB68B09ADCB1DDB5CE7DBA7D73FC8E945D4D00A4AE8A36B8659D278D7A682
  A34459507F99DA79AFD4DD7552306A2CDDA3328960407CF21D8E3FE9C75DB141
  D461FD977053F27136E693F095DF6A083C5DF7F3B26FB066D02A1D94A9E3A24B
  432B0481D08CF658795AADB4C496E10109B8FD65CEF37EBA8C48C0DF11783CC5

audit_rank8_delta1_order40_bound_chain_delta1d40.py
  D1FBE4FE53C7F254FBC4BDBEBC55C84E1734584D7368C2D6FCDB7740D32BA447
rank8_delta1_order40_bound_chain_independent_audit_delta1d40_20260825.json
  B0286456A0707F1059268E8CC50941025F9B6D8D21E0F79A91F8FF87323EBC9C

audit_rank8_delta1_order40_split_diagnostic_delta1d40.py
  806838C1E7DF944C4DAA9FB5C1EDA39F84E53FA6A1EFE19196F72375A3A5EBBE
rank8_delta1_order40_split_diagnostic_audit_delta1d40_20260825.json
  241D432C1E395808CC99ECF9013B614E767D43AD07FB1C75302E8E1221C9CB50

assemble_rank8_delta1_new_leaf_mask3_order40_delta1d40.py
  DE2EFD4AAEB6B6CEA3A5986121B09D89151CA674BD75DDCCA79AD8F3F99D3577
rank8_delta1_new_leaf_mask3_order40_delta1d40_20260825.json
  787F91A54C710E024AE8944DBF6C98686E5FD99B48E271BA50767A4C9DB96B46
audit_rank8_delta1_new_leaf_mask3_order40_assembly_delta1d40.py
  058101ACC5AC5D061DB050AF6D2CE0BEEE3C5420A65D3D6B2AEC006EC1BCC617
rank8_delta1_new_leaf_mask3_order40_assembly_independent_audit_delta1d40_20260825.json
  EBB3489B2A1BB3B9B6E2B00ADEFD0B6B4656E96825045AA8EA1520ABAE43DB84

assemble_rank8_delta1_new_leaf_gate_source41_delta1d40.py
  3D18C80B0E29D691B8E7ED2EACBFBCEDC13355831DD1C3575B7E063D9665158E
rank8_delta1_new_leaf_gate_source41_delta1d40_20260825.json
  EF2A31B3FAC3D02FB390FE92A7334D81B2B8B1844EF0B67AE5219E6F9E1AE146
audit_rank8_delta1_new_leaf_gate_source41_delta1d40.py
  33C05A9ED97C23C02BE17AD8AD1E0EDC21C188E9CCEE0C7A3E0FB8E889B6F4BB
rank8_delta1_new_leaf_gate_source41_independent_audit_delta1d40_20260825.json
  7A775C87EB6B3AD2767D5C8D235759FE4642B1B8B107872AD6BF171D46B0C9F9

analyze_rank8_delta1_Nband_structure_delta1d41.py
  3195798D7DA76F55E6E34A03D84CA91E6E69A8FC5DA27C0BEF5C4186E086FCA3
rank8_delta1_Nband_structure_diagnostic_delta1d41_20260825.json
  77EE8B3FA96F029F6F0306B464B1E5D6B34563F69CC009B90E09FC13129D8B1B
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

assemble_rank8_delta1_new_leaf_gate_source42_delta1d41.py
  F84132D6FD090CECC917D447320CDDC89640DB0C1AC3DAADE4ED071359C78E29
rank8_delta1_new_leaf_gate_source42_delta1d41_20260825.json
  044DFC4B935AB4961CCD5B846079F4C783A1E08704138349E1D3D78A76E59676
audit_rank8_delta1_new_leaf_gate_source42_delta1d41.py
  23F81A27613EFF509A2E4D001905DA846A4BBDC2EE75EE91EF66096397633FD4
rank8_delta1_new_leaf_gate_source42_independent_audit_delta1d41_20260825.json
  3F1459BDE8E33BB6824E651A2964F87876D5E8FEE8EA06AC67AE904A68AF37A4
```
