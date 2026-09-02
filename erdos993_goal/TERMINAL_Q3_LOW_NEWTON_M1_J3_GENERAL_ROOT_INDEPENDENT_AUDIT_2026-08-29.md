# Independent audit: terminal-q3 Newton m=1 at target j=3

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3_AUDIT`

## Audited claim and strict scope

For every tree base `G` of order `n>=15` and every marked vertex, the
coefficient of `binom(s,1)` in the normalized, untruncated terminal-q3
included-payment margin at target `j=3` is nonnegative.

This audit is restricted to tree bases, target `j=3`, and Newton degree
`m=1`.  It does not prove `m=0`, the corresponding general-forest sector,
the full terminal payment, unimodality, or Erdos Problem 993.

## Independence of the reconstruction

The auditor imports no helper, expression, Bernstein coefficient, or literal
value stream from the producer.  It independently rebuilds:

1. the Newton degree-one product row from `P,R,U,c,e,A,Q`;
2. the `q3(F)<=q2(F)` envelope and its adverse derivative;
3. the coupled and rank-four extension floors and their fixed convex blend;
4. the correlated four-set-surplus cap;
5. the four endpoint polynomials;
6. a sequential tensor power-to-Bernstein transform; and
7. literal terminal rows by direct subset enumeration rather than the
   producer's tree-message value stream.

The producer is read only after these formulas have been rebuilt, solely to
pin its frozen status and compare the expected total coefficient count.

## Structural checks

With `N=n-1`, marked degree `d`, `S=N-d`,

```
R=sum_(u adjacent w)(deg_G(u)-1),
B2=sum_v C(deg_G(v)-1,2),
L=B2-C(d-1,2),
y=i3(H)/i3(F),
```

the independent auditor verifies the exact root split and the two identities

```
C(x,2)+C(z,2)-(x-1)z=C(x-z,2),
x C(x,2)=3C(x,3)+2C(x,2).
```

They give

```
0<=tau<=C(d-1,3)+(d-2)(R-1)+3L+4(S-2)L/3.
```

The rank-four forest inclusion-exclusion identity is reconstructed with an
independent symbol for the number of connected three-edge subtrees, then
bounded only by `C(S,3)`.

The upper `y` face is independently justified.  If `P` is the nonnegative
wedge count of `F`, then

```
i3(F)-C(S,3)-P
 =(d-2)[d^2+3dS-d+3S^2-6S]/6,
```

and the bracket has the positive decomposition

```
3S^2+2+(d-2)(d+3S+1).
```

Thus `0<=y<=C(S,3)/i3(F)` on the operative integer domain.

The retained lower is verified to be bilinear in `(y,tau)`.  Therefore its
minimum on the realizable rectangle is one of the four independently rebuilt
corners.

## Independent exact cone

The continuous root box is

```
N=15+q,
d=2+(N-3)u,
R=1+(N-d-1)v,
B2=C(d-1,2)+w[C(R,2)+C(N-d-R,2)],
q>=0, 0<=u,v,w<=1.
```

The auditor uses a sequential one-axis-at-a-time Bernstein transform and
encodes each coefficient by its exact `q`-power dictionary, not by the
producer's SymPy expression stream.  The results are:

| Face | Degrees `(u,v,w)` | Coefficients | Independent stream SHA-256 |
|---|---:|---:|---|
| `y=0, tau=0` | `(7,6,3)` | 224 | `D759869EDB180CC7A702801478A45875CDEB4AD20E474B77EC4A62C71160D083` |
| `y=0, tau=tau_cap` | `(7,6,3)` | 224 | `9B740F18D1626557FD0234213AC0138C2A86E8A0E7415225E269B158847AFEFC` |
| `y=y_cap, tau=0` | `(8,6,3)` | 252 | `8FB44BBF02BD226A8DCE3B54382098E1FB2F31A02A3621B2B1B8817EA3F622D5` |
| `y=y_cap, tau=tau_cap` | `(8,6,3)` | 252 | `DF017920675D29FC5EFDC9B8D51BB0B9186E355B272230E95944E3F3D56708D3` |

All 952 Bernstein coefficients are nonzero polynomials in `q` with
nonnegative exact rational power coefficients.  The minimum positive power
coefficient is `2/3`; there are zero zero-valued power coefficients.  The
combined independent stream hash is

`17094B9E69E0A006B8C9AC388CC3E7581FA5BED5CAAF683B055271D52AF1DB7D`.

No numerical root approximation or finite tail patch is used.

## Literal and boundary replay

The auditor enumerates subsets directly.  For every selected rooted cell it
reconstructs the zero-edge and exactly-one-edge rows, the raw terminal
Newton identity, the q-envelope inequality, both extension floors, the
surplus interval, and the final lower comparison.  Its literal sample and
ordered-value hash are recorded in the audit JSON.

The marked-leaf boundary is pinned to its separate exact theorem.  The marked
star-center polynomial is independently recovered as

```
(4N^5+25N^4-37N^3+104N^2-72N+72)/[6(N-2)],
```

whose numerator after `N=15+q` has positive coefficients.  The complete
order-15 boundary is pinned to the exact all-unlabeled-tree audit.

## Frozen replay

- Audited producer: `prove_terminal_q3_low_newton_m1_j3_general_root.py`
- Producer SHA-256: `5C73254AB22746911187FFCF38E79560D9C250173969D92700AB1B752AD70E61`
- Producer report: `terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json`
- Producer report SHA-256: `012F97B1DD1E7DC42C4733DB67F7C7D77B8F10D89E4198190B1EE08F0CA01385`
- Independent auditor: `audit_terminal_q3_low_newton_m1_j3_general_root_independent_agent.py`
- Auditor SHA-256: `B4B3379EBE1598A2B86DF191B6044D734FB19D30D8D48AF82D91FF5119E58AB8`
- Audit report: `terminal_q3_low_newton_m1_j3_general_root_independent_audit_20260829.json`
- Audit report SHA-256: `B51B14875ED88988C00BC306275CE06C63B26ACEC5A32148F938BE55C20F762B`
- This note SHA-256 is recorded externally after the pending hash is replaced.

The independent auditor fails closed on every pin, algebraic identity,
endpoint domain, denominator sign, exact coefficient, literal row, floor,
boundary status, or scope mismatch.  Its JSON report is written atomically
only after every check passes.
