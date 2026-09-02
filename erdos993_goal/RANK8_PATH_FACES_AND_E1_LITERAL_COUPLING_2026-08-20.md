# Rank-eight path faces and the first nonpath literal coupling

Date: 2026-08-20

Status: **exact path-core theorem for terminal `Delta^0` through `Delta^3`,
plus bounded exact `e=1` literal-tree exclusions at orders 23 and 28.  This is
not the complete nonpath rank-eight theorem.**

## 1. Complete path-core faces

For `P_n`,

```text
i_j(P_n)=C(n-j+1,j),
P_n-q=P_left disjoint union P_right.
```

Up to reflection take `left<=right`.  Roots with `left=0,...,5` are handled
individually.  Every remaining root has

```text
left=L+6,
right=left+d,
n=2L+13+d.
```

The analytic condition `n>=23` is exactly `2L+d>=10`.  The corrected no-gap
partition is

```text
L=0,...,4: d=D+10-2L and n=D+23;
L=M+5:     d=D and n=2M+23+D.
```

The earlier draft substitution `n=D+23-L` was inconsistent with its claimed
`d`; it was detected by independent audit and replaced before theorem use.

The corrected `Delta^0`, `Delta^1`, and `Delta^3` certificate has strictly
positive monomial coefficients on every boundary and interior chart.  The
separate `Delta^2` interior polynomial has degree `(26,26)`, 378 strictly
positive coefficients, and minimum coefficient `1/121927680000`.

Therefore

```text
Delta^j R_1 > 0 for j=0,1,2,3,
for every root of P_n and every n>=23.
```

This closes the entire path face only.

## 2. Exact motif coordinates

For an arbitrary tree put

```text
e = sum_v C(deg(v)-1,2),
tau = (# connected three-edge subtrees)-(n-3).
```

Edge inclusion-exclusion gives

```text
i3=C(n-2,3)+e,
i4=C(n-3,4)+(n-4)e-tau.
```

Thus `e=0` forces the path.  The first nonpath layer `e=1` has one degree-3
vertex and is exactly a subdivided claw with positive arm lengths
`L1+L2+L3=n-1`.  If `s` arms have length one, then

```text
tau=3-s.
```

The complete higher-coefficient identity is

```text
I_A(x)=prod_i I(P_Li;x)+x*prod_i I(P_(Li-1);x).
```

For a root on arm `j` at distance `d`, the deletion polynomial is

```text
H(x)=I(P_(Lj-d);x) *
 [ I(P_(d-1);x) I(P_Lk;x) I(P_Ll;x)
   + x I(P_max(d-2,0);x) I(P_(Lk-1);x) I(P_(Ll-1);x) ].
```

These identities give exact `c5,c6,c7,H6,H7`, and every value was
independently checked by a forest DP.

## 3. Complete bounded `e=1` checks

At order 28, all 61 arm partitions and all 1,708 roots were checked.  There
are 434 distinct coefficient/root profiles.  Every literal `Delta^3` value is
strictly positive; the minimum is

```text
62371264449493131977376
```

at arms `(1,1,25)` with the root on a unit arm.  Its exact data are

```text
c3,...,c8 = 2601,12673,42735,102277,175389,215118,
H6=74613,
H7=116280.
```

A joint replay also checks `Delta^2` and `Delta^3` on every `e=1` root at
orders 23 and 28:

```text
n=23: 40 arm partitions, 920 roots;
       min Delta2=38230158759117788736;
       min Delta3=58724193884454990528.

n=28: 61 arm partitions, 1708 roots;
       min Delta2=62767505024602383983040;
       min Delta3=62371264449493131977376.
```

All four sign counts are strictly positive.  Hence the negative scalar
`e=1` relaxation points at these two orders disappear once literal
`c5,c6,c7,H6,H7` coupling is restored.  This is a bounded two-order result,
not an all-order subdivided-claw theorem.

## 4. Replay and hashes

```text
verify_rank8_delta013_all_root_path_faces.py
33E1119097FA0FCFA572E600504F518E9C2003CBBBF101EFA19DD6FA0BF4E245

rank8_delta013_all_root_path_faces_exact_20260820.json
951CF842CEA1B6D6E6AED3D1EC940F582F489B53532899A1E7C3BF15A2118349

audit_rank8_delta013_all_root_path_faces.py
BF2AFE9DD2898CF4A33581148148D7B57E86F1879F0ADD17BAA51352271BE77B

rank8_delta013_all_root_path_faces_independent_audit_20260820.json
70F909F13A6E9510BC6F62860056C9C203D737F5099CDC487C9D1CF6B1F6F5FA

verify_rank8_delta2_path_forcing_and_face.py
1B80D8D0B3A36A4289039A602349330C72519116B024026246E41D9D7CCA6299

rank8_delta2_path_forcing_and_face_exact_20260820.json
CDAC219760F73C37C7897B8564A28F0D5C473F294127B1E0ADDF742F5C340865

audit_rank8_delta2_path_face.py
93476F6DB500521196555A890A710EE6EF0983D3CC9DBD780B5E3CD969D333E2

rank8_delta2_path_face_independent_audit_20260820.json
BA5DEADC342A99C87C586FAD054B03F1A7A5AD2F1702E0875CBC676FCA7F7B4D

scan_rank8_delta3_n28_e1_subdivided_claws.py
F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A

rank8_delta3_n28_e1_subdivided_claws_exact_20260820.json
1878438D24967B732EFBA4A43332DE4A5089EFA6EE25F2EBD9A879307894EA86

scan_rank8_delta23_e1_subdivided_claws_n23_n28.py
0CB38CA50A03E84E1C7CBC73A303EC2A5882689D7FF8E5440AB87A44075F4E59

rank8_delta23_e1_subdivided_claws_n23_n28_exact_20260820.json
39F6C7C7801008E0F126A44C011D7D15C46804E1F6D645E2C72230EE96EF3532
```
