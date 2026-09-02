# Global proof-chain wave-3 clean-room audit

Date: 2026-08-13

Status: rigorous dependency audit and exact obstruction, not a proof of
Erdos Problem 993.

## 1. Verdict

The 2026-08-13 artifacts prove several genuine all-parameter theorems at
fixed layer and several useful all-order algebraic reductions.  They do not
close an all-order route from the master selector/window work to forest
unimodality.

There is an important distinction between two meanings of "smallest
remaining lemma".

* Absolutely, the shortest sufficient statement is the pendant cascade

  ```text
  H_k(I(G)) >= H_(k-1)(I(F)),
  2 <= k < floor((2 alpha(G)+1)/3),
  F=G-{leaf,its neighbour}.                         (PGC)
  ```

  for every forest and every pendant edge.  The proof already written in
  `PENDANT_GSB_CASCADE_REDUCTION_2026-07-26.md` then iterates to rank one or
  an edgeless forest, gives prefix GSB, and meets the known bipartite
  decreasing tail.  No selector, endpoint, or affine lemma is logically
  required once PGC itself is proved.

* Inside the present master architecture, the honest remaining cut set has
  three packages, not one nearly-complete analytic lemma:

  1. a uniform lower/group-reserve theorem (including every shifted lower
     row and common-homogenizer compatibility);
  2. the two original all-parameter affine coefficient families, group and
     bottom, in both parities;
  3. a proved bridge from those analytic statements through all protected
     recurrences, collision/rank-four variants, the Lambda deletion-fibre
     and mixed brackets, to PGC.

  Package 3 is not presently a clerical assembly.  The surviving notes still
  list P1--P3, the uniform `q>=4` recurrences, and the Lambda/nested/mixed
  payments as hypotheses.  Consequently proving packages 1 and 2 would not,
  on the written record, finish the forest theorem.

The shortest proved dependency spine remains

```text
PGC in its prefix range
   -> prefix GSB
   -> first descent propagates to the bipartite decreasing tail
   -> every forest independence sequence is unimodal.
```

## 2. Exact status of the newest artifacts

The following classifications use "all-order" only when the quantified
layer/degree is unbounded.

1. `ENDPOINT_RAYS_FOREST_LAYERS12_15_TRIDIAGONAL_SONC_THEOREM_2026-08-13.md`
   is an exact all-parameter theorem for the four fixed layers `12<=s<=15`.
   Together with the earlier fixed layers it closes `2<=s<=15`, but leaves
   every `s>=16`.  The continuant recurrence is all-order algebra; positivity
   of all its continuants is not proved in arbitrary layer.

2. `SPECTRAL_DIRECTIONAL_DERIVATIVE_STABILITY_THEOREM_2026-08-13.md`
   is a genuine all-order theorem for each individual diagonal block and for
   positive directions within one block.  It does not prove compatibility
   after the full and principal-minor derivatives are added with weight `u`.

3. The near-sector notes reduce the selector ceiling to

   ```text
   G_(N-1,s)(K) < K G_(N-2,s)(K)
   ```

   and then to a positive binomial coefficient-response problem.  Strict
   ratio decrease and tail payment were checked in 3,131 cells, but remain
   unproved on the two unbounded charts.  Rotating-sector continuation also
   remains separate.

4. The post-sector block-energy inequalities were checked through `d<=50`.
   Their large margins do not prove them for unbounded `m,d`.

5. `AFFINE_BRIDGE_EULER_COUPLED_JOINT_CURVATURE_2026-08-13.md` correctly
   compresses the split/covariance devices to one direct source-coupled
   curvature inequality.  Its 953 required-window checks are finite.  Its
   exact PF-infinity counterexample proves that Euler sign, endpoint slack,
   PF-infinity, orientation, and negative-side convexity do not imply the
   target without the literal path-source coupling.

6. The mixed-forest beam search is discovery evidence only.

Thus no already-closed route was found.  The master header's statement that
the lower artificial-row theorem, affine boundary comparison, and final
protected assembly remain open is still logically correct, although the
endpoint fixed-layer frontier has advanced from eleven to fifteen.

## 3. Two hidden implication gaps that must stay visible

### 3.1 Stable rows do not give the homogenized reserve

The exact polynomial

```text
R(x,y)=1+(x+y)+2xy
```

has stable homogeneous pieces `1`, `x+y`, and `2xy`, but

```text
R(z,z)=1+2z+2z^2
```

has the upper-half-plane zero `(-1+i)/2`.  Hence any proof of every upper
and lower homogeneous row still needs common-homogenizer compatibility.

### 3.2 The direct four-layer curvature is not the whole affine theorem

The Euler-coupled quotient is exactly the reflected reserve comparison on
the 953 selected windows.  Even an all-order proof there would not by itself
establish every coefficient in the original group and bottom affine
families, and neither statement supplies P1--P3 or the mixed Lambda bridge.
This is a scope issue, not a numerical caveat.

## 4. Different-method attack: abstract PF lifting is false

A tempting way to bypass the missing protected assembly is to prove the
pendant inequality for one component and then append benign factors by
PF convolution.  The following exact counterexample rules that out even
when both deletion-side inputs are negative-rooted.

For a positive coefficient sequence `r`, put

```text
G_k(r)=k r_k^2+r_(k-1)r_k-(k+1)r_(k-1)r_(k+1),
H_k(r)=k G_k(r)/r_(k-1).
```

Take

```text
A(x)=(1+x/3)^3,
Q(x)=(1+2x)(1+3x),
P(x)=A(x)+xQ(x).
```

Both `A` and `Q` are PF-infinity.  Exact arithmetic gives

```text
P=(1,2,16/3,163/27),
Q=(1,5,6),

H_2(P)-H_1(Q)=40/3>0,
H_3(P)-H_2(Q)=83837/2160>0.
```

Now append the benign factor `1+x` to both sides:

```text
P+=(1+x)P,
Q+=(1+x)Q.
```

At the already-existing rank two,

```text
H_2(P+)-H_1(Q+)=-50/27<0.                          (1)
```

Thus neither PF factorization of the deletion rows nor validity of all base
pendant margins is enough to propagate the cascade through a benign factor.
Any successful final assembly must retain additional forest/path coupling.
This does not refute PGC for forests; it refutes only the abstract
PF-convolution shortcut.

## 5. Minimal actionable theorem ledger

For a direct solution effort, PGC is the single smallest sufficient target.
For continued use of the current analytic machinery, the sharp honest
ledger is:

1. **Uniform endpoint cross-block lemma.**  Prove the two endpoint pencils
   negative-rooted for every `s>=16`; individual spectral directions are
   already closed.
2. **Uniform lower-selector lemma.**  Prove the near-sector response/payment
   and rotating continuation, and the remaining post-sector Schur/energy
   bound, in the unbounded charts.
3. **Full group-reserve lemma.**  Pass from row theorems to the common
   homogenized group reserve; rowwise stability is insufficient.
4. **Original affine lemma.**  Prove both coefficient families in both
   parities.  The Euler-coupled curvature is a promising internal target,
   not a replacement for the statement without an exact implication.
5. **Protected-to-PGC lemma.**  Prove all P1--P4/collision/rank-four and
   Lambda/nested/mixed obligations and explicitly derive PGC.

Items 1--3 may be bundled into one lower/group-reserve theorem, and items
4--5 may be bundled into one affine/protected theorem.  They cannot be
deleted from the logical chain on the basis of the present finite replays.

## 6. Exact replay

Run

```text
python replay_global_proof_chain_wave3_audit.py
```

It verifies (1), the two positive base margins, the negative-root
factorizations of `A,Q`, the homogeneous-row counterexample, the rank-one
GSB base identity, and the prefix/tail cutoff equality.  It writes
`global_proof_chain_wave3_audit_exact_20260813.json`.
