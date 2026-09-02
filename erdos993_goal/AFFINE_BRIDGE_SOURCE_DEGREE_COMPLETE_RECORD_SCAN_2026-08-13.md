# Affine bridge: complete-record matched source-degree scan

This note extends the one-window coefficient certificate in
`AFFINE_BRIDGE_SOURCE_DEGREE_COUPLED_TIGHT_WINDOW_CERTIFICATE_2026-08-13.md`
to every required window in one complete hard record.  It also isolates an
exact obstruction to replacing the literal coupled sources by the smaller
reserve-only degree core.

## 1. Bounded exact coefficient theorem

For the group/even path record

\[
 (\epsilon,c,m,x)=(0,1,12,24),
\]

retain the literal matched polarization

\[
 Q(\lambda)=\sum_d\lambda_dQ_d,
 \qquad R(\lambda)=\sum_d\lambda_dR_d,
\]

and the cleared degree-five polynomial

\[
 \Gamma_h=hn\,a_h^3a_{h+2}^2+
 (\bar e_{h+2}-hn\,a_{h+2})a_{h-1}a_{h+1}^3. \tag{1}
\]

The required Euler-negative windows in this record are exactly the 27 pairs

```text
(17,1), (18,1), (19,1),
(20,1), (20,2), ... , (30,1), (30,2), (31,1), (32,1),
```

where each pair is `(n,h)`.  The exact expansion of (1), using the literal
source-degree support `12,...,31`, gives in every window

```text
nonzero coefficients:       38,304
negative coefficients:           0
zeros after cancellation:         0
```

Thus the bounded exact theorem is

\[
 \boxed{\Gamma_h(\lambda)>0}
\]

for every nonzero `lambda_d>=0` and all 27 required windows of this complete
record.  Across the record the replay checks `1,034,208` strictly positive
integer coefficients.  The SHA-256 of the canonical full coefficient stream
is

```text
9630C4BD76325FEFB8A0204ED975697828FB54907E0301DD1CE56D258C091E3A
```

For every window, the specialization `lambda_d=1` is independently checked
against the stored literal `q_j`, `rho_j`, and `e_j` values and gives the same
positive cleared target.

## 2. Exact nine-class common-factor no-go

The positive group reserve really has the smaller nine-class factorization

\[
 R=A^2T^5R_{\rm core},
 \qquad \deg_{z,w}R_{\rm core}\in\{8,\ldots,16\}.
\]

However, this is not a common factorization of the matched pair `(Q,R)`.
Indeed, the replay substitutes `z=-1` in the literal group/even `Q` source
and finds

\[
 [w^9c^0m^0x^0]Q(-1,w,c,m,x)=-10. \tag{2}
\]

So `Q` is not divisible even by `1+z`, and hence is not divisible by
`A^2T^5`.  Consequently the 9 group (and analogously 12 bottom) classes of
the normalized **reserve** core cannot simply be used as common matched
`Q,R` variables in (1).  Any reduction to those smaller supports needs a new
identity that also transforms the signed `Q` contribution; common-factor
cancellation is exactly unavailable.

## 3. Retained factorwise no-go

The natural independent minimum-ratio injection fails at all 27 windows,
despite full joint coefficient positivity in every case.  Its least value is

\[
 {47381048811530763414364951871791125156949008502509757680712004333978571703293539755454534061415876795908292964614104745657344849585
  \over
  317601926804121139414528747664337122783280078525430026773481604901758090645405853097955758817898942183669288804131206325233690339328}
 \approx0.1491837574
\]

at `(n,h)=(17,1)`.  Therefore the successful certificate uses joint
cross-degree cancellation and cannot be replaced by this factorwise bound.

## 4. Exact status

* **Proved exactly:** coefficientwise strict positivity of `Gamma_h(lambda)`
  for all 27 required windows in the specified complete group/even record.
* **Proved exactly:** the reserve-only nine-class common-factor route does not
  apply to the literal matched pair, by (2).
* **No counterexample found:** none of the `1,034,208` scanned coefficients is
  negative or zero.
* **Still open:** uniform coefficientwise positivity, a SONC/PSD certificate,
  or another proof over all path parameters and all required windows.
* **Finite scope:** this exact complete-record scan is not an all-order theorem
  and is not the full 953-window coefficient scan.

Run:

```text
python verify_affine_bridge_source_degree_record_scan.py
```

Expected status:

```text
PASS_EXACT_COMPLETE_RECORD_COEFFICIENT_SCAN
```

Exact artifact hashes:

```text
affine_bridge_euler_transfer_blocks_probe_20260812.json
67BBB0B8E7474327438DA5EDB76B8720948160DDE20E2CDEDDD559A1F714FB17

verify_affine_bridge_source_degree_record_scan.py
B7A7A158B9F39961E4C5CA653E0EDEEBF4E1E25DBB2C4EC4D6EA569C9752F752

affine_bridge_source_degree_record_scan_exact_20260813.json
12FBA3E639D0597C3BA15C370174E8DCEA69BB507663D7FF0EC57DBDB613B558
```
