# Double-broom gap: uniform Newton-index generating operators

Date: 2026-08-29

Status: **exact all-index algebraic reduction, not yet an all-index sign
theorem.**  The fixed-total positivity theorems through `i+j=10` are
independent exact results.

Let

\[
\mathscr G(u,v)=\sum_{i,j\ge0}G_{i,j}u^iv^j,
\]

where `G_(i,j)` is the corrected double-broom path-Pascal gap.  The leaf
Newton factors sum geometrically:

\[
\sum_{i,j\ge0}\phi^iz^ju^iv^j
=\frac1{(1-u\phi)(1-vz)},
\]

with analogous formulas for the swapped `BX/BY`, `XY`, `BZ`, and `BB`
terms.  Differentiating the `BB` geometric series accounts exactly for the
factor `i+j` in its defect reserve.

After the consecutive-path substitution

\[
A=P_{n-6},\quad B=P_{n-5},\quad
T=B+xA,\quad S=(1+x)B+xA,\quad R=(1+x)T+xB,
\]

exact bilinear coefficient extraction gives a single uniform decomposition

\[
\mathscr G=
\mathcal O_{M_A,R_A}(H_A)+
\mathcal O_{M_B,R_B}(H_B)+
\mathcal O_{M_C,R_C}(H_C)+
\mathcal O^{CD}_{F,Q}(D),
\]

where all eight operator coefficients are rational functions of
`u,v,z,w`, and

\[
\mathcal O_{M,R}(H)=M[pH-\delta\partial_pH]-\delta RH,
\qquad
\mathcal O^{CD}_{F,Q}(H)=\delta FH+2\delta^2Q\partial_pH.
\]

Every source denominator divides

\[
(1-u\phi)^2(1-v\phi)^2\,
(1-uz)^2(1-uw)^2(1-vz)^2(1-vw)^2.
\]

Explicitly, the replay records the product

```text
(1-u*phi)^2 (1-v*phi)^2
(1-u*z)^2(1-u*w)^2(1-v*z)^2(1-v*w)^2
```

as one product.  The six primitive geometric factors are

```text
1-u*z, 1-u*w, 1-v*z, 1-v*w, 1-u*phi, 1-v*phi.
```

The source constructs the rational functions without numerical fitting and
hashes their exact SymPy expression trees.  It also re-extracts the literal
coefficients `(i,j)=(0,0),(0,1),(1,0),(1,1)` and proves equality with the
independently derived fixed-index gaps.

Run

```powershell
python .\derive_iso_double_broom_diagonal_gap_newton_generating_agent.py
```

It ends with

```text
DERIVED_EXACT_UNIFORM_DOUBLE_BROOM_NEWTON_INDEX_GENERATING_OPERATORS
```

Hashes:

```text
source SHA256:
777ED85A8321A40312F15A1D5D5918C1AEAC2402D658AE6CB3940E04A43F05DB

report SHA256:
FE2B6BD87188339B65AFAD4BBEFC520AFEB9F2220887978660DB34EA1611DF7E
```

Exact operator expression-tree hashes and operation counts are recorded in
`iso_double_broom_diagonal_gap_newton_generating_exact_agent_20260829.json`.

The remaining obligation is precise: apply the universal diagonal functional
to these rational operators and prove coefficientwise nonnegativity in
`u,v`.  The rational identity alone does not justify promoting the
fixed-total certificates to all Newton indices.
