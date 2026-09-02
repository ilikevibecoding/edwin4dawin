# Exact `i4` identity for pure-cubic `B2=5` subdivisions

Date: 2026-08-17

Status: **PROVED EXACT ALL-LENGTH STRUCTURAL IDENTITY.** This is an input to
the remaining terminal-broom endpoint proof, not by itself a proof of that
endpoint.

## Theorem

Let `T` be a subdivision of either suppressed pure-cubic `B2=5` skeleton.
The skeleton has five degree-three branch vertices, seven leaves, four
branch--branch edges, and seven branch--leaf edges. Write every skeleton-edge
length as `L_e>=1`, and put

```text
p = number of branch--branch edges with L_e>=2,
q = number of branch--leaf edges with L_e>=2.
```

Then, for `n=|T|`,

```text
E=sum_(uv in E(T))(deg(u)-1)(deg(v)-1)=n+4-p+q
```

and

```text
i4(T)=C(n-3,4)+5n-32+p-q.
```

## Proof

On a branch--branch skeleton edge of length `L`, the contribution to `E` is
`L+2`, plus one more when `L=1`. On a branch--leaf edge it is `L`, minus one
when `L=1`. Since the eleven lengths sum to `n-1`, summing the four and seven
edge channels gives

```text
E=(n-1)+8+(4-p)-(7-q)=n+4-p+q.
```

For every tree, with `x_v=deg(v)-1`,

```text
i4(T)=i4(P_n)+(n-5)B2-B3-(E-(n-3)).
```

Here `B2=5`, `B3=sum_v C(x_v,3)=0`, and `i4(P_n)=C(n-3,4)`.
Substitution yields the stated formula.

The symbolic replay is:

```powershell
python .\verify_rank7_b2_5_cubic_c4_identity.py
```

Expected marker:

```text
PASS_EXACT_RANK7_B2_5_CUBIC_C4_IDENTITY
```

Artifacts and SHA-256:

```text
verify_rank7_b2_5_cubic_c4_identity.py
F94982BA8E6FCFF8FACDF4F9F7CD804EA25A64DBF27B1FD43DC6C42F09731320

rank7_b2_5_cubic_c4_identity_exact_20260817.json
19A800231D8962E2CB0E1628BC19670EE12CE3B46D397649528B557F2D805BB7
```

An independent direct independence-polynomial audit also verified the
formula on all 124,746 nonisomorphic pure-cubic subdivisions at order 23;
that audit is supporting evidence and is not needed for the all-length proof.
