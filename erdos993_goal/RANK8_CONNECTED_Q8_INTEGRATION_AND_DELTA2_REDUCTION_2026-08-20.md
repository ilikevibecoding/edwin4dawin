# Rank-eight connected-`Q8` integration guard and `Delta^2` reduction

Date: 2026-08-20

Status: **the connected-`Q8` integration is deliberately fail-closed.  All
rank-seven inputs, the all-order rank-eight residual coefficients
`Delta^4` through `Delta^15`, and both literal exceptional-family splices
pass exact hash and scope guards.  The exact all-root WROM census now closes
`Delta^0` through `Delta^3` at core orders 23 through 26, so the remaining
connected-tree gap starts at core order 27.  Separately, the analytic
`Delta^0`, `Delta^1`, and `Delta^2` gaps are each reduced exactly to four
live tensors or paths, with `Delta^0` and `Delta^1` independently audited.
For all four pending ranks, the complete degree-surplus-zero path face and
the complete degree-surplus-one subdivided-claw face are now closed for every
order at least 23 and independently audited; only degree surplus at least two
remains in the structural lane.  The complete
`e=2` double-claw layer extends by exact finite induction through order 30
and is independently audited.
None of these results is a complete connected-`Q8` theorem.**

## 1. Read-only integration result

The assembler pins 89 immutable inputs.  It checks the final rank-seven
terminal/connected/forest chain, the unconditional rank-eight `Delta^4`
package, the discharged `Delta^5` dependency, and the all-order packages for
`Delta^6` through `Delta^15`.

It also checks the two no-gap literal-family splices:

1. Every rooted core of order at most 20 has all sixteen shifted literal
   `Q8` Newton coefficients strictly positive from
   `t0=max(1,14-alpha(A))`.
2. The exceptional matching-quotient theorem checks ten cells exactly, and
   the final rank-seven forest theorem discharges its two omitted cells
   `(21,13)` and `(22,13)`.  Tree bipartiteness shows that these twelve cells
   are exactly all pairs with `21<=|A|<=26` and `alpha(A)<=13`.

The residual census through order 22 proves `Delta^1` through `Delta^4`
everywhere and `Delta^0` from order 15 onward.  Its 950 negative `Delta^0`
rows at orders 11--14 are retained as exact controls and are paid only by the
literal shifted-family theorem.

The separate order-23 WROM census then checks every one of 14,828,074 free
trees and all 341,045,702 root placements.  Every placement is active and the
negative counts for `Delta^0` through `Delta^3` are `[0,0,0,0]`.  An
independent generic tree DP reconstructs all four global minima at an
endpoint root of `P_23`.

The order-24 successor census checks another 39,299,897 free trees and all
943,197,528 root placements.  Again every placement is active, all four
negative counts are zero, and an independent generic DP reconstructs every
global minimum at an endpoint root of `P_24`.

The order-25 successor census checks 104,636,890 free trees and all
2,615,922,250 root placements.  Every placement is active, all four negative
counts are zero, and the independently predicted `P_25` endpoint minima
match the exact global minima.

The order-26 successor census checks 279,793,450 free trees and all
7,274,629,700 root placements.  Every placement is active, all four negative
counts are zero, and the independently predicted `P_26` endpoint minima
again match the exact global minima.

Consequently the precise remaining terminal-induction cells are

```text
Delta^j R_1 >= 0,  j=0,1,2,3,

|A|>=27 (where alpha(A)>=ceil(|A|/2)>=14 automatically).
```

The convenient stronger target is the same four inequalities for every
rooted tree core of order at least 27.  Until they are proved, the assembler
returns

```text
PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS.
```

## 2. Exact `Delta^2` structural reduction

After `c0=1`, `c1=n`, and `c2=binom(n-1,2)`, direct differentiation gives

```text
d^2 Delta2/dh7^2 = -252 c7(c4+c5) <= 0,
```

and

```text
d Delta2/dc8
=-16 h6(27c4c7+16c4c8+29c5c7+16c5c8+2c6c7) <= 0.
```

Thus the two-sided root polygon may be sent to its boundary, and the final
rank-seven `Q7` theorem supplies the safe endpoint

```text
c8=c7(14c7-c6)/(16c6).
```

In capacity coordinates `h6=S c6` and
`h7=E(n-7)S c6/7`, the remaining `c7` curvature is

```text
d^2 Delta2/dc7^2 = -S B/c6.
```

Writing `z=c7/c6`, extension counting and the selected-degree bound give

```text
c5/c6 >= 6/(n-5),
c4/c6 >= 30/((n-4)(n-5)),
z >= (2n-37+20/n)/14.
```

The resulting normalized lower function is increasing from this last
endpoint.  Its endpoint derivative and value are

```text
504(3n^3-33n^2-36n+40)/(n(n-5)(n-4)),

2(36n^5-988n^4+3447n^3+12871n^2-20160n+7200)
 /(n^2(n-5)(n-4)).
```

After `n=m+23`, both numerators have strictly positive coefficient vectors:

```text
[1512, 87696, 1616328, 9201024],
[72, 6304, 205982, 2989844, 16659382, 7034736].
```

Hence `B>=0` and `Delta^2` is concave across the complete rank-six defect
interval.  Only its two exact endpoints `k=1,7` remain.

At either endpoint, the lower-zero and full-root paths are also exactly
concave.  Their endpoints already lie on the lower-cross and upper-capacity
paths.  The complete analytic remainder is therefore only

```text
k in {1,7} crossed with
  lower-cross with live Z,
  upper-capacity with live Z.
```

This is four live tensors, not eight.  Both live paths must genuinely be
retained: on the exact `P23` coefficient jet their normalized curvature
brackets are respectively `-1079568` and `-8015568`, making their actual
path curvatures positive.  This is an endpoint-collapse obstruction, not a
negative `Delta^2` value or a tree counterexample.

## 3. Exact path and first-nonpath closures for all four pending ranks

The degree surplus

```text
e(A)=sum_v binom(deg_A(v)-1,2)
```

is zero exactly for paths.  Exact path coefficient formulas close
`Delta^j R_1>0`, `j=0,1,2,3`, for every root of every `P_n`, `n>=23`.
Independent replays verify the boundary and interior cells, their motif
formulas, and the relaxed-point exclusions.

The next layer `e=1` is exactly the family of subdivided claws.  Writing its
three positive arm lengths as `(a,b,c)`, the exact independence polynomial is

```text
I(C(a,b,c))
=I(P_a)I(P_b)I(P_c)
 + x I(P_(a-1))I(P_(b-1))I(P_(c-1)).
```

For an arm root at center-distance `d`, with `near=d-1` and `tail=a-d`,

```text
I(C-q)=I(P_tail) I(C(near,b,c)).
```

Splitting every relevant path segment into a fixed short order through six
or a symbolic long order `X+7` gives a no-gap all-order certificate.  The
center-rooted family has 28 strictly positive symbolic cells.  The arm-rooted
family has 787 relevant short/long patterns and 838 strictly positive
symbolic order-cover cells.  The independent `Delta0/1/3` audit reconstructs
all 2,514 arm-cell rank constants from explicit formulas and checks all 920
root placements at `n=23`.  The independently audited `Delta2` certificate
checks the same 40 arm triples through 865 distinct rooted orbits.  The exact
order-23 minima are

```text
Delta0  5923170966582245376
Delta1  19969651851918297984
Delta2  38230158759117788736
Delta3  58724193884454990528.
```

Thus `Delta^j R_1>0`, `j=0,1,2,3`, for every rooted core of order at least
23 with `e=0` or `e=1`.

At `e=2`, the suppressed skeleton is the unique double claw.  An independent
normalization of all positive five-part compositions of 22 gives exactly 920
canonical order-23 cores.  A separately numbered graph construction and
generic tree DP checks all 21,160 roots and 11,395 coefficient profiles; all
four ranks are strictly positive.  The exact length-extension scout then
checks every source core at orders 23 through 29, all five one-step length
extensions, every old root, and every inserted root.  Independent identity,
minimum-witness, and inserted-root checks promote this to a finite induction
theorem through target order 30.

The thin family `(1,1,g,1,1)`, `g>=18`, additionally has an all-order bridge
extension certificate on all root orbits.  The all-tree censuses remove
orders 23 through 26 entirely.  Consequently the general structural remainder is
`e>=3` at orders 27 through 30 and `e>=2` from order 31.  This narrows but does not
close the global connected-`Q8` gap.

For `Delta2` specifically, a complete pendant-root theorem now closes every
positive arm-length choice whenever the central bridge has length at least 8.
The exact short/long partitions cover arbitrary selected root/arm, paired arm,
and both far arms without gaps.  Central bridges of length at most 7 remain
outside this theorem, as do the other root types not already covered by their
own exact cells.

## 4. Independent `Delta^0` and `Delta^1` audit

The independently rebuilt reductions verify, for both coefficients, exact
concavity in `h7` and `c8`, the endpoint identity

```text
c8_Q7-c8 = Q7/(16c6),
```

all four root-polygon junction identities, and concavity of the lower-zero
and full-root paths at both `c8=0` and `c8=c8_Q7`.  For `Delta^0`, the audit
also checks the selected-degree payment `c7/c6>=227/322` used at the `Q7`
endpoint.

Both reductions must retain the continuous rank-six defect parameter.  The
linked `P23` coordinates are

```text
K=256/57, V=22/95, q=11/28, E=0, S=1/2<1-q=17/28.
```

They are strictly interior in `K,V` and have strict lower-root slack `3/28`.
The exact fixed-capacity `c7` curvatures are positive:

```text
Delta0: 125836296768,
Delta1: 256716952128.
```

Thus each reduction leaves four tensors

```text
c8 endpoint {0,Q7} crossed with
  lower-cross with live K,V,Z,
  upper-capacity with live K,V,Z.
```

The curvature witnesses are method obstructions only, not negative
coefficients or tree counterexamples.

## 5. Representative tight-box test for `Delta^2`

Only the representative `k=1/lower-cross` tensor was run.  On the same tight
coupled `t,y,r` box that closed `Delta^4`, the direct-value tensor has degrees

```text
(36,12,12,12,8,2)
```

and 2,194,803 exact Bernstein coefficients.  Its sign counts are

```text
negative 1,110,011; zero 1,521; positive 1,083,271.
```

The exact minimum is negative at index `(35,12,12,0,8,0)`, so the result is
`COUPLED_VALUE_UNRESOLVED`.  Runtime was 274.18 seconds.  Windows reported a
peak working-set high-water value of at least 688.3 MiB during the run; the
original in-process final-peak query failed, so 688.3 MiB is retained only as
an observed lower bound on the final peak.  The other three tensors were not
launched.

This is a tight-box Bernstein enclosure obstruction, not a negative
`Delta^2` value or a tree counterexample.

## 6. Replay and hashes

Run

```powershell
python .\assemble_rank8_connected_q8_integration_readonly.py
python .\audit_rank8_terminal_delta03_finite_n23.py
python .\audit_rank8_terminal_delta03_finite_n24.py
python .\audit_rank8_terminal_delta03_finite_n25.py
python .\audit_rank8_terminal_delta03_finite_n26.py
python .\verify_rank8_q8_terminal_delta2_reduction.py
python .\assemble_rank8_delta013_e1_all_order.py
python .\audit_rank8_delta013_e1_all_order_independent.py
python .\audit_rank8_delta013_e2_double_claws_n23_independent.py
python .\audit_rank8_delta013_e2_length_extension.py
python .\assemble_rank8_delta2_e1_all_order.py
python .\audit_rank8_delta2_e1_all_order.py
python .\audit_rank8_delta0_delta1_structural_reductions.py
```

Current SHA-256 values:

```text
assemble_rank8_connected_q8_integration_readonly.py
96280B7E9AAD8B58E74A26834AEF0B64D67477F7894C638803C75572BFBE2399

rank8_connected_q8_integration_readonly_20260820.json
440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6

RANK8_TERMINAL_DELTA03_ALL_ROOT_N26_FINITE_THEOREM_2026-08-20.md
1ED3E2206E8CC6F541437BC477CF5EE9C863DD535003EF8D4F9ACF0E2123A794

verify_rank8_terminal_delta03_finite_n26.rs
B9BA86D5FCA5A36438116670D0D937D076008F37B3FC7101D7653287F4B1B9FC

rank8_terminal_delta03_finite_n26_primary_20260820.log
0A4E319110FB2937DE97595B24E4E4DFA5DBA7B2F2A6C0FAD3C46E523044DA61

audit_rank8_terminal_delta03_finite_n26.py
99593A501A92CDB692285E4D528B5C37CC302AFCAA05BE297DCD15C2460C016B

rank8_terminal_delta03_finite_n26_independent_audit_exact_20260820.json
8B167C350391FCE93887BE47E4327DD608E272553879669A0DCD3E32D66A1101

RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR_THEOREM_2026-08-20.md
896EAA205EC8C8898E268C77EFB584A8809FB43ABA38022151C9B154EE763572

rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json
383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266

RANK8_DELTA2_E2_PENDANT_PAIRED1_BRIDGE_LONG_ALL_FAR_THEOREM_2026-08-20.md
BF7264D958EFBB2D269C0C84B064D710B9A6881CDBD51FD93A17EA64752F5E97

rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json
4AA5057A376568698835A5D7008BD0113BC1DD04E8029A1ACCC40913DA42C157

assemble_rank8_delta2_e2_pendant_bridge_long_all_arm_lengths.py
3192F9F2EACC52AFCD861759F0BC105B6C5C9B82B2BB85B4EE80469F057A42B2

rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json
FFD224DEDDA5E15EE586B598F065F522F793464DBA8EC2E6209931BED6EA36A9

RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS_THEOREM_2026-08-20.md
F26DA88F3A4CB0B0E7E7EC4CE86991298533BC21846F5CEE4553965E88E6E3DE

RANK8_TERMINAL_DELTA03_ALL_ROOT_N25_FINITE_THEOREM_2026-08-20.md
EA3EA96E5626A354885382B936EC40075A2996938CA6AF2CE72170E092F0B7B1

verify_rank8_terminal_delta03_finite_n25.rs
431A54BC6C37EF884074D4ADBD805AE8614A78BB773F37AE4BC84EB0DF7E0E8A

rank8_terminal_delta03_finite_n25_primary_20260820.log
030E2A06BCEF8A4FFA09B366BA699245C244F94298156993A0BC6411BFAE206F

audit_rank8_terminal_delta03_finite_n25.py
285A7623620B7697FDAF302C33EDD1D2AE4C3AAF5A56B240B020DBC643160F3B

rank8_terminal_delta03_finite_n25_independent_audit_exact_20260820.json
EDC9574415B23BB596074536734F33123D909258E9BC2D1C713036E426687F72

RANK8_TERMINAL_DELTA03_ALL_ROOT_N24_FINITE_THEOREM_2026-08-20.md
C362E3B89998E6AFB00D3A8575F8FCA88398C3EFE6D017DEEA0A08BFEBF5F725

verify_rank8_terminal_delta03_finite_n24.rs
02B51B72B4E75B332E3B4DFBC1497AD2C84E307B082EE49152D42D1B18E09468

rank8_terminal_delta03_finite_n24_primary_20260820.log
8FF4CE82AD545051D1259149CE4875D2CA5E6E3EDFF3314720FF00530CB9BFC4

audit_rank8_terminal_delta03_finite_n24.py
2BE60B8C9814F5F64E61B1FD68A4FE521CF2FC877D94E333BDC061811E9B8097

rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json
60F0DA73B3B6A749EE48E6D54DA2B044A97054235E5A0D04E12B4CD03B616428

RANK8_TERMINAL_DELTA03_ALL_ROOT_N23_FINITE_THEOREM_2026-08-20.md
E2055AB72D621CB0D78264002B5E93ED9E33F6811B6B5CE6F6DC7FC7BDA4F217

verify_rank8_terminal_delta03_finite_n23.rs
04637D9DAC26F23C0A7839C57D6BC3D7243D2A3D06240D17A5A18B84AE09788E

rank8_terminal_delta03_finite_n23_primary_20260820.log
E092FBD72CE51C4AB55DE6C2A0BBFF69DEFC368D659A66CF9E013E6F176067D6

audit_rank8_terminal_delta03_finite_n23.py
F026F75B38DF3647ECF6DE04F479DE9CB006552925E2772AD7CB32135B4CEFA3

rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json
6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4

RANK8_E1_ALL_FOUR_RESIDUAL_RANKS_THEOREM_2026-08-20.md
F0292C09EC8CCF420425FBBB4770324B0E52DCC55BBA49E6AC010B31F6A841FE

assemble_rank8_delta013_e1_all_order.py
F0F6FCCE979A2E65FBEE83B9728B58FF402FA274D70AB9AD9B561029BFAED6FE

rank8_delta013_e1_all_order_exact_20260820.json
B0996169B0A122F8A5D01B0573293604768BFF6A48A5CF2B1B06B7805323D14D

audit_rank8_delta013_e1_all_order_independent.py
DFA9A031D54CBB686FEA80AA170522219A0CF544E53FDA6A0842DDCB44AAD3EC

rank8_delta013_e1_all_order_independent_audit_exact_20260820.json
6A43F883A9FB3D46D64A42403FD53CA80B0CEE6204A06C69766263C0A2E05E5F

RANK8_E2_DOUBLE_CLAW_N23_BOUNDARY_THEOREM_2026-08-20.md
A17EF7533E72E91147FE0681A2B4D79E2B4124D5EF7AB34DE5D40D65CEB2DAB6

scan_rank8_delta013_e2_double_claws_n23.py
3FD0FCB77E1A3B09E30AA3E00DBA904D446B83E6502944EB4DA5B0404FCFEF5C

rank8_delta013_e2_double_claws_n23_exact_20260820.json
A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9

audit_rank8_delta013_e2_double_claws_n23_independent.py
B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8

rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json
BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027

RANK8_E2_LENGTH_EXTENSION_FINITE_AND_THIN_THEOREMS_2026-08-20.md
B82FF80537AAEBF59548C871641AA6931AB99C34FCBBC8AF3E4DE6CC1E2CE9A4

probe_rank8_delta013_e2_length_extension.py
C8BA8039C99D8273194DF3672E3E23EE4DB592F19AC57D3571EC47075D0DC38C

rank8_delta013_e2_length_extension_scout_exact_20260820.json
49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4

certify_rank8_delta013_e2_thin_bridge_extension_all_order.py
F31EFBF365D25BF85713D0C9D5CBA37F44385CA463B24BE00245BDE039E69C9B

rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json
4308C23DC1EC19647B1B22F2D0FA21D1B3C243A72B0CF52F563F3550340DC4F5

audit_rank8_delta013_e2_length_extension.py
4E654621FC3AE9A8989764D8F284B49F87CF17038C7C0CE6B26B724977188E52

rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json
FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2

verify_rank8_delta2_path_forcing_and_face.py
1B80D8D0B3A36A4289039A602349330C72519116B024026246E41D9D7CCA6299

rank8_delta2_path_forcing_and_face_exact_20260820.json
CDAC219760F73C37C7897B8564A28F0D5C473F294127B1E0ADDF742F5C340865

audit_rank8_delta2_path_forcing_and_face.py
607E477B4E641A8FEC486334F4C0804B25B4088B0C589260B16F808BB0F391FA

rank8_delta2_path_forcing_and_face_independent_audit_exact_20260820.json
5AC6C802B94D02B9EC69F7318804CDA2953E3CD4CB09B197C5EAF1B78AFFAD55

RANK8_DELTA2_E1_SUBDIVIDED_CLAW_ALL_ORDER_THEOREM_2026-08-20.md
D374C2FCD30AA4D6D7C1E2CF5A400843CDE5F362C60AB239FF28EB022BC01489

assemble_rank8_delta2_e1_all_order.py
1A85FB61A066676D78ACF2594DFFAB7B9FFB90EC7457D456C6C5D376783F9EE1

rank8_delta2_e1_all_order_exact_20260820.json
755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E

audit_rank8_delta2_e1_all_order.py
7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C

rank8_delta2_e1_all_order_independent_audit_exact_20260820.json
6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3

verify_rank8_q8_terminal_delta2_reduction.py
040A8556DA93BAD448802B9086DA2BE507C10A8836F4AE1ECC15DFFA24765C34

rank8_q8_terminal_delta2_reduction_exact_20260820.json
3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D

probe_rank8_delta2_source_curvatures.py
85E45BA23A606EDB7526D75134F1956AE8B5C49D8B4CB404A16897B5A4CE3D0C

certify_rank8_delta2_live_path_coupled_box.py
00CFF13BB45B31B5B5D8051FBC5103D67C10EFD00FC827D9D670A9A6C826B740

rank8_delta2_lcross_coupled_k1_exact_20260820.json
F1E157CD98FCECDA4864BDA806EF266252B205D2577AC6764129909C20380CC6

audit_rank8_delta0_delta1_structural_reductions.py
4EE0E24A33A8A6CE26E52FBA807D0444E969B95E6740A9457286EE245DA8BF83

rank8_delta0_delta1_structural_reductions_independent_audit_exact_20260820.json
9AE03AA2F3AF793CD47E6B3679ACB25EBB200BDE5DEAD5692FF7C4A2097EA293

verify_rank8_q8_terminal_delta0_reduction.py
7546765F0FCA4F5955019A8170893371B95AE4B532A8036B1659D6A478B91052

rank8_q8_terminal_delta0_reduction_exact_20260820.json
B3D1373A0DF158E55FABDD87A3C9033A745E5079D7AB813604CEBE1D5CC5B51C

verify_rank8_q8_terminal_delta1_reduction.py
9AFCB8440917BFE4B01D28987DE9055B09CA6B7A67E3D2DB3A2186BAB5AAEA70

rank8_q8_terminal_delta1_reduction_exact_20260820.json
8E7F4EB6AEA056B42A3570996287C8B5BD453C5F9E604368FB09E0F78D9530FF

RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT_THEOREM_2026-08-20.md
897E3D7C26362111DD82BBC4BAECD31DF0AECB40472468870B7238CF4F959F44

rank8_exceptional_shifted_matching_quotient_exact_20260820.json
275FC6496850418042244524987238FCE05FA381440ECF40BAC90CB2EB66E724

rank8_exceptional_shifted_matching_quotient_independent_audit_exact_20260820.json
DE7D906401C3547C42900899CBB52B4E85A345340278BE72F226D7760F4C2DAC

rank8_delta5_delta4_full_branch_independent_audit_20260820.json
55B91CF39CE16808C04BA64C6093CEEFEBF6DD244B9842ADE189D53EDE50D32D

rank7_final_integration_independent_audit_exact_20260820.json
3052B52A9AB79C2B961C37C0D150DC9E440BBF0D81FCA6F4A657C262554205EE
```

No master file was edited.
