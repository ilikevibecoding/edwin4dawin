# The F/G endpoint pencil is a Jacobi parameter derivative

Retain

```text
C=P_(N-1), D=P_(N-2), R=P_(N-3),
V=P_N-C=vS, W=C-D=vT,
A_c=C+cV, B_c=D+cW.
```

For fixed `u>=0`, define the diagonal endpoint family

```text
K_c=J_s(A_c,A_c)+uJ_s(B_c,B_c)
    =E+2cF+c^2G.                                    (1)
```

Bilinearity gives the all-order derivative identity

```text
(1/2) partial_c K_c=F+cG.                           (2)
```

The pair `(A_c,B_c)` is a nested path-Jacobi chain for `c>=0`: the
continuant form is

```text
A_c=(1+2cv)C-cv^2D,
B_c=(1+2cv)D-cv^2R.
```

Thus Section 75 already proves that every `K_c` is negative-rooted.  The
`F/G` problem is precisely the stronger assertion that the parameter
derivative in (2) is negative-rooted.  This is weaker than joint stability
of `K_c(t)` in `(t,c)`, which is false, and it should not be replaced by that
invalid shortcut.

There is a second exact decomposition using only vertical layers and one
endpoint deletion.  Write `n=s-1` and set

```text
L_j=J_j(S,S)+uJ_j(T,T),
M_j=J_j(D,S)+uJ_j(R,T).
```

The continuant identities

```text
C=(S+vD)/2, D=(T+vR)/2
```

and the gamma shifts

```text
J_s(S,vS)=J_(s-1)(S,S)/2,
J_s(vD,vS)=tJ_(s-2)(D,S)
```

give

```text
F+cG=(1/4)L_n+(t/2)M_(n-1)+ctL_(n-1).              (3)
```

The first and third pieces in (3) are consecutive vertical layers of the
same adjacent singular-Jacobi direct sum; the middle piece is its aligned
endpoint-deletion row.  Hence (3) reduces `F/G` to a three-piece
vertical/deletion compatibility theorem, rather than full reciprocal proper
position.  Exact tests through `N<=25`, every layer, and
`u in {1/1000,1,1000}` find all three pairs positively compatible.  This is
finite evidence only; the remaining all-order step is to prove those three
vertical/deletion compatibilities from the mixed-slice stability operator.

The exact replay is `verify_endpoint_fg_parameter_derivative_reduction.py`
and writes `endpoint_fg_parameter_derivative_exact_20260812.json`.
