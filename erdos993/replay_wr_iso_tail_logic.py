#!/usr/bin/env python3
"""
replay_wr_iso_tail_logic.py
===========================

Exact certification of the *logical reduction* used by the Erdős #993 project
(see WR_ISO_TAIL_LEMMA.md next to this file):

    WR_r  : p_{r-1} <= r p_r                                  (1 <= r <= L-1)
    ISO_r : Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0   (1 <= r <= L-1)
    TAIL  : p_r >= p_{r+1}                                    (L <= r <= alpha-1)
    with L = L(alpha) = ceil((2 alpha - 1)/3)
    ==>   p_0, ..., p_alpha is unimodal.

Nothing here proves ISO_r for forests (that is the project's open core); this
script certifies the reduction itself, exactly and with all edge cases:

  (1) sympy: the one-step identities behind "a descent is never followed by an
      ascent", in ratio form and in pure-integer (division-free) form;
  (3) exact integer predicates for the hypotheses and the conclusion, validated
      on (a) all forests of order <= 14, (b) 100,000 seeded random sequences
      satisfying the hypotheses, (c) seeded random sequences violating exactly
      one prefix hypothesis (showing the hypotheses do work), (d) the KLYM tree
      T1 whose sequence is not log-concave;
  (4) sharpness remarks verified with sympy (edgeless forests, stars) and the
      "where do WR/ISO first fail beyond the prefix" data on all forests n <= 12.

Exact arithmetic only (Python ints, Fraction, sympy).  Deterministic (seeded).
Single process; runs in a few seconds.

Run:     python3 replay_wr_iso_tail_logic.py
Writes:  results/replay_wr_iso_tail_logic.json
Prints:  PASS_/FAIL_ marker lines; final marker PASS_WR_ISO_TAIL_LEMMA_REPLAY.
"""

from __future__ import annotations

import json
import os
import platform
import random
import sys
import time
from fractions import Fraction
from math import comb

import sympy as sp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import forest_indep as fi  # noqa: E402

SEED = 993
OUT_JSON = os.path.join(HERE, "results", "replay_wr_iso_tail_logic.json")

FAILURES: list[str] = []


def marker(ok: bool, label: str) -> bool:
    print(("PASS_" if ok else "FAIL_") + label, flush=True)
    if not ok:
        FAILURES.append(label)
    return bool(ok)


def note(msg: str) -> None:
    print("  " + msg, flush=True)


# ---------------------------------------------------------------------------
# 0. Exact integer predicates (re-implemented here; cross-checked against the
#    core library forest_indep.py on every forest and random sequence used)
# ---------------------------------------------------------------------------


def L_of(alpha: int) -> int:
    """L(alpha) = ceil((2 alpha - 1)/3) for alpha >= 1; L(0) = 0 (both index
    ranges below are then empty, so the alpha = 0 case carries no hypotheses)."""
    return (2 * alpha + 1) // 3


def prefix_indices(alpha: int) -> range:
    """Indices r at which WR_r and ISO_r are assumed: 1 <= r <= L(alpha) - 1."""
    return range(1, L_of(alpha))


def tail_indices(alpha: int) -> range:
    """Indices r at which p_r >= p_{r+1} is assumed: L(alpha) <= r <= alpha - 1."""
    return range(L_of(alpha), alpha)


def WR(p, r: int) -> bool:
    return p[r - 1] <= r * p[r]


def Q(p, r: int) -> int:
    return r * p[r] ** 2 + p[r - 1] ** 2 - (r + 1) * p[r - 1] * p[r + 1]


def ISO(p, r: int) -> bool:
    return Q(p, r) >= 0


def POSITIVE(p) -> bool:
    return all(isinstance(v, int) and v >= 1 for v in p)


def PREFIX_WR(p) -> bool:
    return all(WR(p, r) for r in prefix_indices(len(p) - 1))


def PREFIX_ISO(p) -> bool:
    return all(ISO(p, r) for r in prefix_indices(len(p) - 1))


def TAIL(p) -> bool:
    return all(p[r] >= p[r + 1] for r in tail_indices(len(p) - 1))


def HYPOTHESES(p) -> bool:
    return POSITIVE(p) and PREFIX_WR(p) and PREFIX_ISO(p) and TAIL(p)


def UNIMODAL(p) -> bool:
    """Literal definition: some m with p_0 <= ... <= p_m >= ... >= p_alpha
    (plateaus allowed)."""
    alpha = len(p) - 1
    return any(
        all(p[i] <= p[i + 1] for i in range(m))
        and all(p[i] >= p[i + 1] for i in range(m, alpha))
        for m in range(alpha + 1)
    )


def PROPAGATION(p) -> bool:
    """The one-step consequence: a weak descent at a prefix index r
    (p_r <= p_{r-1}) is followed by p_{r+1} <= p_r."""
    alpha = len(p) - 1
    return all(p[r + 1] <= p[r] for r in prefix_indices(alpha) if p[r] <= p[r - 1])


def first_weak_descent(p):
    """Smallest prefix index r with p_r <= p_{r-1}, or None."""
    alpha = len(p) - 1
    for r in prefix_indices(alpha):
        if p[r] <= p[r - 1]:
            return r
    return None


def classify(p) -> str:
    """Which case of the Lemma's proof the sequence falls into."""
    alpha = len(p) - 1
    L = L_of(alpha)
    if alpha == 0:
        return "alpha=0"
    if L == 1:
        return "empty_prefix(alpha in {1,2})"
    r0 = first_weak_descent(p)
    if r0 is None:
        return "A_no_descent_p[L-1]<=p[L]" if p[L - 1] <= p[L] else "A_no_descent_p[L-1]>p[L]"
    return "B_plateau_descent" if p[r0] == p[r0 - 1] else "B_strict_descent"


CASES = [
    "alpha=0",
    "empty_prefix(alpha in {1,2})",
    "A_no_descent_p[L-1]<=p[L]",
    "A_no_descent_p[L-1]>p[L]",
    "B_plateau_descent",
    "B_strict_descent",
]


def mode_indices(p):
    m = max(p)
    idx = [i for i, v in enumerate(p) if v == m]
    return idx[0], idx[-1]


def crosscheck_core(p) -> bool:
    """Our predicates agree with forest_indep's on this sequence."""
    alpha = len(p) - 1
    ok = fi.L_cutoff(alpha) == L_of(alpha) if alpha >= 1 else True
    ok = ok and fi.is_unimodal(p) == UNIMODAL(p)
    ok = ok and all(fi.Q_iso(p, r) == Q(p, r) for r in range(1, alpha))
    ok = ok and all((fi.wr_slack(p, r) >= 0) == WR(p, r) for r in range(1, alpha + 1))
    return ok


# ---------------------------------------------------------------------------
# 1. sympy: the one-step identities
# ---------------------------------------------------------------------------


def section_identities() -> dict:
    out: dict = {}
    ok = True

    r, x, t = sp.symbols("r x t", positive=True)
    a, b, c = sp.symbols("p_r p_rm1 p_rp1", positive=True)  # a=p_r, b=p_{r-1}, c=p_{r+1}

    # (1a) ratio identity  r x + 1/x - (r+1) = (r x - 1)(x - 1)/x
    lhs = r * x + 1 / x - (r + 1)
    rhs = (r * x - 1) * (x - 1) / x
    d = sp.simplify(lhs - rhs)
    ok &= d == 0
    out["ratio_identity"] = {
        "statement": "r*x + 1/x - (r + 1) == (r*x - 1)*(x - 1)/x",
        "sympy_simplify(lhs - rhs)": str(d),
        "verified": d == 0,
    }

    # (1b) sign on [1/r, 1]: parametrise x = 1/r + t (1 - 1/r), t in [0, 1]
    xt = 1 / r + t * (1 - 1 / r)
    cert = sp.factor(sp.simplify((r * xt - 1) * (xt - 1)))
    target = t * (t - 1) * (r - 1) ** 2 / r
    d2 = sp.simplify(cert - target)
    ok &= d2 == 0
    out["sign_certificate"] = {
        "parametrisation": "x = 1/r + t*(1 - 1/r), t in [0, 1] covers x in [1/r, 1]",
        "(r*x - 1)*(x - 1) in terms of t": str(cert),
        "manifestly <= 0 on t in [0,1]": "t*(t - 1) <= 0, (r - 1)^2/r >= 0, and x > 0",
        "sympy_simplify(cert - t*(t-1)*(r-1)**2/r)": str(d2),
        "verified": d2 == 0,
        "conclusion": "for x in [1/r, 1]: r*x + 1/x <= r + 1",
    }

    # (1c) equality cases: r x + 1/x = r + 1  <=>  x in {1/r, 1}
    sols = sp.solve(sp.Eq(r * x + 1 / x, r + 1), x)
    sols_set = {sp.simplify(s) for s in sols}
    eq_ok = sols_set == {sp.Integer(1), 1 / r}
    ok &= eq_ok
    out["equality_cases"] = {
        "sympy_solve(r*x + 1/x = r + 1, x)": [str(s) for s in sols],
        "expected": ["1", "1/r"],
        "verified": eq_ok,
        "remark": "for r = 1 the interval [1/r, 1] is the single point x = 1 (equality)",
    }

    # exact rational spot check of the sign claim (no floats)
    spot_ok = True
    for rr in range(1, 13):
        for k in range(0, 25):
            xx = Fraction(1, rr) + Fraction(k, 24) * (1 - Fraction(1, rr))
            val = rr * xx + 1 / xx - (rr + 1)
            spot_ok &= val <= 0
            spot_ok &= (val == 0) == (xx in (Fraction(1, rr), Fraction(1)))
    ok &= spot_ok
    out["exact_rational_spot_check"] = {
        "grid": "r = 1..12, x = 1/r + (k/24)(1 - 1/r), k = 0..24",
        "r*x + 1/x <= r+1 everywhere, equality exactly at x in {1/r, 1}": spot_ok,
    }

    # (1d) integer form: (r a - b)(a - b) = r a^2 + b^2 - (r+1) a b
    d3 = sp.expand((r * a - b) * (a - b) - (r * a ** 2 + b ** 2 - (r + 1) * a * b))
    ok &= d3 == 0
    out["integer_identity_WR_times_descent"] = {
        "statement": "(r*p_r - p_{r-1})*(p_r - p_{r-1}) == r*p_r^2 + p_{r-1}^2 - (r+1)*p_{r-1}*p_r",
        "sympy_expand(lhs - rhs)": str(d3),
        "verified": d3 == 0,
        "use": "WR_r (first factor >= 0) and a weak descent p_r <= p_{r-1} (second factor <= 0) "
               "give r*p_r^2 + p_{r-1}^2 <= (r+1)*p_{r-1}*p_r",
    }

    # (1e) the division-free master identity
    Qr = r * a ** 2 + b ** 2 - (r + 1) * b * c
    d4 = sp.expand((r + 1) * b * (a - c) - (Qr + (r * a - b) * (b - a)))
    ok &= d4 == 0
    out["integer_master_identity"] = {
        "statement": "(r+1)*p_{r-1}*(p_r - p_{r+1}) == Q_r + (r*p_r - p_{r-1})*(p_{r-1} - p_r)",
        "Q_r": "r*p_r^2 + p_{r-1}^2 - (r+1)*p_{r-1}*p_{r+1}",
        "sympy_expand(lhs - rhs)": str(d4),
        "verified": d4 == 0,
        "use": "ISO_r (Q_r >= 0), WR_r (r*p_r - p_{r-1} >= 0) and a weak descent (p_{r-1} - p_r >= 0) "
               "make the right side >= 0; since (r+1)*p_{r-1} >= 1 the integer p_r - p_{r+1} is >= 0.",
    }

    # (1f) ratio form of ISO_r:  Q_r / (p_{r-1} p_r) = r x + 1/x - (r+1) y,  x = p_r/p_{r-1}, y = p_{r+1}/p_r
    d5 = sp.simplify(Qr / (a * b) - (r * (a / b) + b / a - (r + 1) * (c / a)))
    ok &= d5 == 0
    out["ratio_form_of_ISO"] = {
        "statement": "Q_r/(p_{r-1}*p_r) == r*x + 1/x - (r+1)*y with x = p_r/p_{r-1}, y = p_{r+1}/p_r",
        "sympy_simplify(lhs - rhs)": str(d5),
        "verified": d5 == 0,
        "handoff_chain": "WR_r: 1/r <= x; descent: x <= 1; ISO_r: (r+1)*y <= r*x + 1/x <= r+1; hence y <= 1",
    }

    # (1g) exhaustive integer check of the one-step implication on a small box
    box_ok = True
    box_count = 0
    for rr in range(1, 7):
        for bb in range(1, 13):        # p_{r-1}
            for aa in range(1, 13):    # p_r
                for cc in range(1, 25):  # p_{r+1}
                    p = [bb, aa, cc]
                    wr = bb <= rr * aa
                    iso = rr * aa * aa + bb * bb - (rr + 1) * bb * cc >= 0
                    if wr and iso and aa <= bb:
                        box_count += 1
                        box_ok &= cc <= aa
    ok &= box_ok
    out["exhaustive_one_step_box"] = {
        "box": "r = 1..6, p_{r-1} = 1..12, p_r = 1..12, p_{r+1} = 1..24",
        "triples_with_WR_and_ISO_and_weak_descent": box_count,
        "all_have_p_{r+1} <= p_r": box_ok,
    }

    marker(ok, "IDENTITIES")
    out["all_verified"] = bool(ok)
    return out


# ---------------------------------------------------------------------------
# 3a. all forests of order <= 14
# ---------------------------------------------------------------------------


def section_forests(nmax: int = 14) -> dict:
    t0 = time.time()
    tp = fi.tree_polys_upto(nmax)
    per_n = {}
    total = hyp_ok = concl_ok = prop_ok = cross_ok = 0
    case_counts = {k: 0 for k in CASES}
    min_ratio = None
    min_ratio_witness = None
    min_Q = None
    min_Q_witness = None
    min_wr = None
    min_wr_witness = None
    zero_Q_forests = 0
    zero_wr_forests = 0
    iso_all_r = wr_upto_alpha_minus_1 = wr_all_r = wr_alpha_fails = 0
    wr_fail_before_alpha: list[dict] = []
    per_n_min_ratio = {}
    for n in range(0, nmax + 1):
        cnt = 0
        n_min_ratio = None
        n_min_witness = None
        for comps, P in fi.forests(n, tp):
            cnt += 1
            total += 1
            alpha = len(P) - 1
            h = HYPOTHESES(P)
            u = UNIMODAL(P)
            pr = PROPAGATION(P)
            cc = crosscheck_core(P)
            hyp_ok += h
            concl_ok += u
            prop_ok += pr
            cross_ok += cc
            case_counts[classify(P)] += 1
            sizes = tuple(k for k, _ in comps)
            iso_all_r += all(ISO(P, r) for r in range(1, alpha))
            wr_fail_early = [r for r in range(1, alpha) if not WR(P, r)]
            wr_upto_alpha_minus_1 += not wr_fail_early
            wr_all_r += all(WR(P, r) for r in range(1, alpha + 1))
            wr_alpha_fails += alpha >= 1 and not WR(P, alpha)
            if wr_fail_early:
                wr_fail_before_alpha.append({"n": n, "component_sizes": sizes, "poly": P, "alpha": alpha,
                                             "L": L_of(alpha), "WR_fails_at_r": wr_fail_early,
                                             "all_in_tail": all(r >= L_of(alpha) for r in wr_fail_early)})
            zq = zw = False
            for r in prefix_indices(alpha):
                q = Q(P, r)
                w = r * P[r] - P[r - 1]
                ratio = Fraction(r * P[r] ** 2 + P[r - 1] ** 2, (r + 1) * P[r - 1] * P[r + 1])
                if n_min_ratio is None or ratio < n_min_ratio:
                    n_min_ratio, n_min_witness = ratio, {"component_sizes": sizes, "poly": P, "r": r}
                if min_ratio is None or ratio < min_ratio:
                    min_ratio, min_ratio_witness = ratio, {"n": n, "component_sizes": sizes, "poly": P, "r": r}
                if min_Q is None or q < min_Q:
                    min_Q, min_Q_witness = q, {"n": n, "component_sizes": sizes, "poly": P, "r": r}
                if min_wr is None or w < min_wr:
                    min_wr, min_wr_witness = w, {"n": n, "component_sizes": sizes, "poly": P, "r": r}
                zq |= q == 0
                zw |= w == 0
            zero_Q_forests += zq
            zero_wr_forests += zw
        per_n[n] = cnt
        if n_min_ratio is not None:
            per_n_min_ratio[n] = {"ratio": str(n_min_ratio), "float": float(n_min_ratio), **n_min_witness}
    counts_ok = all(per_n[n] == fi.OEIS_A005195[n] for n in range(0, nmax + 1))
    ok = counts_ok and hyp_ok == total and concl_ok == total and prop_ok == total and cross_ok == total
    marker(ok, "FORESTS_N_LE_14")
    note(f"forests n=0..{nmax}: {total} (n=1..{nmax}: {total - 1}); hypotheses hold on {hyp_ok}, "
         f"unimodal {concl_ok}, propagation {prop_ok}, core cross-check {cross_ok}")
    note(f"proof cases: {case_counts}")
    note(f"min prefix ISO ratio {min_ratio} = {float(min_ratio):.6f} at {min_ratio_witness}")
    note(f"min prefix Q_r = {min_Q} at {min_Q_witness}; min prefix WR slack = {min_wr} at {min_wr_witness}")
    note(f"(data) ISO_r holds for ALL r=1..alpha-1 on {iso_all_r}/{total}; WR_r holds for all r<=alpha-1 on "
         f"{wr_upto_alpha_minus_1}/{total}; WR_r holds for all r<=alpha on {wr_all_r}/{total}")
    return {
        "nmax": nmax,
        "forest_counts_per_n": per_n,
        "forest_counts_match_A005195": counts_ok,
        "total_forests_n0_to_nmax": total,
        "total_forests_n1_to_nmax": total - 1,
        "hypotheses_hold": hyp_ok,
        "conclusion_unimodal": concl_ok,
        "propagation_property_holds": prop_ok,
        "core_crosscheck_agree": cross_ok,
        "proof_case_counts": case_counts,
        "min_prefix_ISO_ratio": str(min_ratio),
        "min_prefix_ISO_ratio_witness": min_ratio_witness,
        "min_prefix_ISO_ratio_per_n": {str(k): v for k, v in per_n_min_ratio.items()},
        "min_prefix_Q": min_Q,
        "min_prefix_Q_witness": min_Q_witness,
        "min_prefix_WR_slack": min_wr,
        "min_prefix_WR_slack_witness": min_wr_witness,
        "forests_with_some_prefix_Q_r_equal_0": zero_Q_forests,
        "forests_with_some_prefix_WR_slack_equal_0": zero_wr_forests,
        "data_not_needed_by_lemma": {
            "forests_with_ISO_r_for_all_r_1_to_alpha-1": iso_all_r,
            "forests_with_WR_r_for_all_r_1_to_alpha-1": wr_upto_alpha_minus_1,
            "forests_with_WR_r_for_all_r_1_to_alpha": wr_all_r,
            "forests_with_WR_alpha_failing": wr_alpha_fails,
            "forests_with_WR_failing_at_some_r_before_alpha": wr_fail_before_alpha,
        },
        "seconds": round(time.time() - t0, 3),
        "all_ok": bool(ok),
    }


# ---------------------------------------------------------------------------
# 3b. 100,000 seeded random sequences satisfying the hypotheses
# ---------------------------------------------------------------------------

ALPHA_MENU = [0, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 30]
SCALE_MENU = [1, 2, 3, 5, 10, 100, 10 ** 4, 10 ** 9, 10 ** 18]


def construct_sequence(rng: random.Random):
    """Build p_0..p_alpha index by index so that every hypothesis holds by
    construction.  Returns None when the admissible integer interval for the
    next term is empty (counted as a rejection by the caller).  Emptiness is
    genuine, not a sampler defect: ISO_r together with positivity can leave no
    room, e.g. p_{r-1} = 2, p_r = 1, r = 3 satisfy WR_3 but ISO_3 forces
    4*2*p_4 <= 3 + 4, i.e. p_4 <= 0."""
    alpha = rng.choice(ALPHA_MENU)
    L = L_of(alpha)
    scale = rng.choice(SCALE_MENU)
    strategy = rng.choice(["uniform", "lo", "hi", "near_hi", "mixed"])

    def pick(lo, hi):
        if strategy == "uniform":
            return rng.randint(lo, hi)
        if strategy == "lo":
            return lo
        if strategy == "hi":
            return hi
        if strategy == "near_hi":
            return max(lo, hi - rng.randint(0, 3))
        return rng.choice([lo, hi, rng.randint(lo, hi)])

    p = [rng.randint(1, scale)]
    # indices j = 1..L are governed by the prefix constraints
    for j in range(1, L + 1):
        r = j - 1  # ISO_r bounds p_j = p_{r+1} from above (needed iff 1 <= r <= L-1)
        lo = -(-p[j - 1] // j) if j <= L - 1 else 1  # WR_j: p_{j-1} <= j p_j (needed iff j <= L-1)
        if r >= 1:
            hi = (r * p[r] ** 2 + p[r - 1] ** 2) // ((r + 1) * p[r - 1])
        else:
            hi = lo + rng.choice([0, 1, 2, 5, scale, 3 * scale])
        if lo > hi:
            return None
        p.append(pick(lo, hi))
    # indices j = L+1..alpha: the decreasing tail p_j <= p_{j-1}
    for j in range(L + 1, alpha + 1):
        prev = p[j - 1]
        mode = rng.choice(["uniform", "plateau", "one", "step"])
        if mode == "uniform":
            p.append(rng.randint(1, prev))
        elif mode == "plateau":
            p.append(prev)
        elif mode == "one":
            p.append(1)
        else:
            p.append(max(1, prev - rng.randint(0, 3)))
    return p


def section_random(total: int = 100_000, n_reject_sampler: int = 40_000) -> dict:
    t0 = time.time()
    rng = random.Random(SEED)
    accepted = []

    # sampler A: rejection sampling of uniform sequences (alpha >= 2 so that at
    # least one hypothesis is in force; alpha = 0, 1 are covered by sampler B)
    rej_tried = 0
    rej_per_alpha = {a: [0, 0] for a in range(2, 8)}
    while len(accepted) < n_reject_sampler:
        alpha = rng.randint(2, 7)
        M = rng.choice([2, 3, 5, 10, 30])
        p = [rng.randint(1, M) for _ in range(alpha + 1)]
        rej_tried += 1
        rej_per_alpha[alpha][0] += 1
        if HYPOTHESES(p):
            rej_per_alpha[alpha][1] += 1
            accepted.append(("reject", p))
    rej_accepted = len(accepted)

    # sampler B: constructive
    con_tried = con_empty = 0
    con_not_hyp = 0
    while len(accepted) < total:
        con_tried += 1
        p = construct_sequence(rng)
        if p is None:
            con_empty += 1
            continue
        if not HYPOTHESES(p):  # would be a bug in the sampler, not in the lemma
            con_not_hyp += 1
            continue
        accepted.append(("construct", p))
    con_accepted = total - rej_accepted

    # validation of the conclusion on all accepted sequences
    concl_ok = prop_ok = cross_ok = hyp_ok = 0
    case_counts = {k: 0 for k in CASES}
    alpha_hist: dict[int, int] = {}
    with_zero_Q = with_zero_wr = with_prefix_plateau = with_pLm1_eq_pL = with_tail_plateau = 0
    max_alpha = 0
    for _, p in accepted:
        alpha = len(p) - 1
        max_alpha = max(max_alpha, alpha)
        alpha_hist[alpha] = alpha_hist.get(alpha, 0) + 1
        hyp_ok += HYPOTHESES(p)
        concl_ok += UNIMODAL(p)
        prop_ok += PROPAGATION(p)
        cross_ok += crosscheck_core(p)
        case_counts[classify(p)] += 1
        pre = list(prefix_indices(alpha))
        with_zero_Q += any(Q(p, r) == 0 for r in pre)
        with_zero_wr += any(r * p[r] - p[r - 1] == 0 for r in pre)
        with_prefix_plateau += any(p[r] == p[r - 1] for r in pre)
        L = L_of(alpha)
        with_pLm1_eq_pL += (L >= 2 and p[L - 1] == p[L])
        with_tail_plateau += any(p[r] == p[r + 1] for r in tail_indices(alpha))
    ok = (len(accepted) == total and hyp_ok == total and concl_ok == total
          and prop_ok == total and cross_ok == total and con_not_hyp == 0)
    marker(ok, "RANDOM_100000_HYPOTHESES_IMPLY_UNIMODAL")
    note(f"rejection sampler: {rej_accepted}/{rej_tried} accepted "
         f"(rate {rej_accepted / rej_tried:.4f}); constructive sampler: {con_accepted}/{con_tried} "
         f"(empty-interval rejections {con_empty}, rate {con_accepted / con_tried:.4f})")
    note(f"all {total}: hypotheses {hyp_ok}, unimodal {concl_ok}, propagation {prop_ok}, "
         f"core cross-check {cross_ok}; cases {case_counts}")
    note(f"edge coverage: prefix Q_r=0 in {with_zero_Q}, prefix WR slack 0 in {with_zero_wr}, "
         f"prefix plateau in {with_prefix_plateau}, p[L-1]==p[L] in {with_pLm1_eq_pL}, tail plateau in {with_tail_plateau}")
    return {
        "seed": SEED,
        "total_sequences": len(accepted),
        "rejection_sampler": {
            "description": "alpha uniform in 2..7, entries uniform in 1..M with M in {2,3,5,10,30}; accept iff hypotheses",
            "tried": rej_tried,
            "accepted": rej_accepted,
            "acceptance_rate": str(Fraction(rej_accepted, rej_tried)),
            "acceptance_rate_float": rej_accepted / rej_tried,
            "per_alpha_tried_accepted": {str(a): v for a, v in rej_per_alpha.items()},
        },
        "constructive_sampler": {
            "description": "alpha from a menu up to 30, magnitudes up to 1e18; p_j chosen inside the exact "
                           "integer interval [ceil(p_{j-1}/j) if WR_j needed else 1, floor((r p_r^2+p_{r-1}^2)/((r+1)p_{r-1})) "
                           "if ISO_r needed] with r=j-1; tail non-increasing; strategies uniform/lo/hi/near_hi/mixed",
            "tried": con_tried,
            "accepted": con_accepted,
            "empty_interval_rejections": con_empty,
            "constructed_but_failed_hypotheses(bug_indicator)": con_not_hyp,
            "acceptance_rate": str(Fraction(con_accepted, con_tried)),
            "acceptance_rate_float": con_accepted / con_tried,
        },
        "hypotheses_hold": hyp_ok,
        "conclusion_unimodal": concl_ok,
        "propagation_property_holds": prop_ok,
        "core_crosscheck_agree": cross_ok,
        "proof_case_counts": case_counts,
        "alpha_histogram": {str(k): v for k, v in sorted(alpha_hist.items())},
        "max_alpha": max_alpha,
        "edge_coverage": {
            "sequences_with_some_prefix_Q_r_equal_0": with_zero_Q,
            "sequences_with_some_prefix_WR_slack_equal_0": with_zero_wr,
            "sequences_with_some_prefix_plateau_p_r_equal_p_r-1": with_prefix_plateau,
            "sequences_with_p[L-1]_equal_p[L]": with_pLm1_eq_pL,
            "sequences_with_some_tail_plateau": with_tail_plateau,
        },
        "seconds": round(time.time() - t0, 3),
        "all_ok": bool(ok),
    }


# ---------------------------------------------------------------------------
# 3c. necessity: drop a single prefix hypothesis and unimodality can fail
# ---------------------------------------------------------------------------


def _violation_profile(p):
    alpha = len(p) - 1
    pre = list(prefix_indices(alpha))
    wr_fail = [r for r in pre if not WR(p, r)]
    iso_fail = [r for r in pre if not ISO(p, r)]
    return wr_fail, iso_fail, TAIL(p)


def section_necessity(tries: int = 200_000) -> dict:
    t0 = time.time()
    rng = random.Random(SEED + 1)
    stats = {
        "single_ISO": {"in_category": 0, "not_unimodal": 0, "per_alpha_not_unimodal": {}, "examples": {}},
        "single_WR": {"in_category": 0, "not_unimodal": 0, "per_alpha_not_unimodal": {}, "examples": {}},
    }
    all_hyp = all_hyp_unimodal = 0
    for _ in range(tries):
        alpha = rng.randint(3, 8)
        V = rng.choice([3, 5, 10, 20])
        p = [rng.randint(1, V) for _ in range(alpha + 1)]
        wr_fail, iso_fail, tail_ok = _violation_profile(p)
        if tail_ok and not wr_fail and not iso_fail:
            all_hyp += 1
            all_hyp_unimodal += UNIMODAL(p)
            continue
        if not tail_ok:
            continue
        cat = None
        if not wr_fail and len(iso_fail) == 1:
            cat, r = "single_ISO", iso_fail[0]
        elif not iso_fail and len(wr_fail) == 1:
            cat, r = "single_WR", wr_fail[0]
        if cat is None:
            continue
        st = stats[cat]
        st["in_category"] += 1
        if not UNIMODAL(p):
            st["not_unimodal"] += 1
            st["per_alpha_not_unimodal"][alpha] = st["per_alpha_not_unimodal"].get(alpha, 0) + 1
            st["examples"].setdefault(tuple(p), {
                "p": p, "alpha": alpha, "L": L_of(alpha), "failing_r": r,
                "Q_r": Q(p, r), "WR_slack_r": r * p[r] - p[r - 1]})
    for st in stats.values():
        st["distinct_not_unimodal_sequences"] = len(st["examples"])
        exs = sorted(st["examples"].values(), key=lambda e: (e["alpha"], max(e["p"]), e["p"]))
        st["examples"] = exs[:6]
        st["per_alpha_not_unimodal"] = {str(k): v for k, v in sorted(st["per_alpha_not_unimodal"].items())}

    # exhaustive tiny boxes (deterministic exact counts, independent of the RNG)
    exhaustive = {}
    for alpha, V in ((3, 6), (4, 6), (5, 4)):
        L = L_of(alpha)
        tot = single_iso = single_iso_nu = single_wr = single_wr_nu = full = full_nu = 0
        for idx in range(V ** (alpha + 1)):
            p = []
            m = idx
            for _ in range(alpha + 1):
                p.append(m % V + 1)
                m //= V
            tot += 1
            wr_fail, iso_fail, tail_ok = _violation_profile(p)
            if not tail_ok:
                continue
            u = UNIMODAL(p)
            if not wr_fail and not iso_fail:
                full += 1
                full_nu += (not u)
            elif not wr_fail and len(iso_fail) == 1:
                single_iso += 1
                single_iso_nu += (not u)
            elif not iso_fail and len(wr_fail) == 1:
                single_wr += 1
                single_wr_nu += (not u)
        exhaustive[f"alpha={alpha},entries 1..{V}"] = {
            "L": L, "sequences": tot,
            "all_hypotheses": full, "all_hypotheses_not_unimodal": full_nu,
            "single_ISO_fail": single_iso, "single_ISO_fail_not_unimodal": single_iso_nu,
            "single_WR_fail": single_wr, "single_WR_fail_not_unimodal": single_wr_nu,
        }
    ex_ok = all(v["all_hypotheses_not_unimodal"] == 0 for v in exhaustive.values())

    found_iso = stats["single_ISO"]["not_unimodal"]
    found_wr = stats["single_WR"]["not_unimodal"]
    ok = found_iso > 0 and found_wr > 0 and all_hyp_unimodal == all_hyp and ex_ok
    marker(ok, "NECESSITY_SINGLE_HYPOTHESIS_DROPPED")
    note(f"tried {tries}: single-ISO-violators {stats['single_ISO']['in_category']} of which NOT unimodal {found_iso}; "
         f"single-WR-violators {stats['single_WR']['in_category']} of which NOT unimodal {found_wr}; "
         f"full-hypotheses {all_hyp} all unimodal {all_hyp_unimodal == all_hyp}")
    note(f"smallest single-ISO example: {stats['single_ISO']['examples'][:1]}")
    note(f"smallest single-WR example: {stats['single_WR']['examples'][:1]}")
    note(f"exhaustive boxes: {exhaustive}")
    return {
        "seed": SEED + 1,
        "description": "random alpha in 3..8, entries uniform in 1..V, V in {3,5,10,20}; a sequence is a "
                       "'single_ISO' (resp. 'single_WR') violator if TAIL holds, every prefix WR_r (resp. ISO_r) "
                       "holds, and exactly one prefix ISO_r (resp. WR_r) fails",
        "tried": tries,
        "sequences_satisfying_all_hypotheses": all_hyp,
        "of_which_unimodal": all_hyp_unimodal,
        "single_ISO": stats["single_ISO"],
        "single_WR": stats["single_WR"],
        "exhaustive_boxes": exhaustive,
        "seconds": round(time.time() - t0, 3),
        "all_ok": bool(ok),
    }


# ---------------------------------------------------------------------------
# 3d. KLYM T1 (26 vertices): hypotheses hold although log-concavity fails
# ---------------------------------------------------------------------------


def section_klym() -> dict:
    n, edges = fi.klym_3kk_tree(4)
    P = fi.indep_poly_from_edges(n, edges)
    p = fi.KLYM_T1_POLY
    alpha = len(p) - 1
    L = L_of(alpha)
    pre = list(prefix_indices(alpha))
    wr_slacks = {r: r * p[r] - p[r - 1] for r in range(1, alpha + 1)}
    Qs = {r: Q(p, r) for r in range(1, alpha)}
    lc_fail = [r for r in range(1, alpha) if p[r] ** 2 < p[r - 1] * p[r + 1]]
    wr_fail_all = [r for r in range(1, alpha + 1) if wr_slacks[r] < 0]
    iso_fail_all = [r for r in range(1, alpha) if Qs[r] < 0]
    m_first, m_last = mode_indices(p)
    ok = (P == p and n == 26 and alpha == 14 and L == 9 and pre == list(range(1, 9))
          and HYPOTHESES(p) and UNIMODAL(p) and PROPAGATION(p) and crosscheck_core(p)
          and lc_fail == [13] and 14 in wr_fail_all and 13 in wr_fail_all
          and all(r >= L for r in wr_fail_all) and all(r >= L for r in iso_fail_all)
          and classify(p) == "A_no_descent_p[L-1]>p[L]" and (m_first, m_last) == (8, 8))
    marker(ok, "KLYM_T1_HYPOTHESES_HOLD")
    note(f"alpha={alpha}, L={L}, prefix r=1..{L - 1}; WR slacks prefix {[wr_slacks[r] for r in pre]}")
    note(f"Q_r prefix {[Qs[r] for r in pre]}")
    note(f"log-concavity fails at r={lc_fail} (p_13^2={p[13] ** 2} < p_12*p_14={p[12] * p[14]}); "
         f"WR fails at r={wr_fail_all} (p_13={p[13]} > 14*p_14={14 * p[14]}); ISO fails at r={iso_fail_all}; "
         f"mode index {m_first}; case {classify(p)}")
    return {
        "poly": p,
        "recomputed_from_klym_3kk_tree(4)_matches": P == p,
        "n": n, "alpha": alpha, "L": L, "prefix_indices": pre,
        "hypotheses_hold": HYPOTHESES(p),
        "unimodal": UNIMODAL(p),
        "prefix_WR_slack": {str(r): wr_slacks[r] for r in pre},
        "prefix_Q": {str(r): Qs[r] for r in pre},
        "prefix_ISO_ratio": {str(r): str(Fraction(r * p[r] ** 2 + p[r - 1] ** 2, (r + 1) * p[r - 1] * p[r + 1])) for r in pre},
        "tail_holds": TAIL(p),
        "log_concavity_failures_r": lc_fail,
        "WR_failures_all_r_1_to_alpha": wr_fail_all,
        "WR_14_detail": f"p_13 = {p[13]} > 14 * p_14 = {14 * p[14]}",
        "WR_13_detail": f"p_12 = {p[12]} > 13 * p_13 = {13 * p[13]}",
        "ISO_failures_all_r_1_to_alpha-1": iso_fail_all,
        "Q_all_r": {str(r): Qs[r] for r in range(1, alpha)},
        "mode_index_first_last": [m_first, m_last],
        "proof_case": classify(p),
        "all_ok": bool(ok),
    }


# ---------------------------------------------------------------------------
# 4. sharpness
# ---------------------------------------------------------------------------


def section_sharpness(nmax_forests: int = 12) -> dict:
    out: dict = {}
    ok = True

    # (i) edgeless forest: binomial sequence
    n, r = sp.symbols("n r", positive=True, integer=True)
    B = sp.binomial
    ratio = (r * B(n, r) ** 2 + B(n, r - 1) ** 2) / ((r + 1) * B(n, r - 1) * B(n, r + 1))
    target = (1 + r / (n - r + 1) ** 2) * (1 + 1 / (n - r))
    simple = 1 + (n + 1) / ((n - r + 1) * (n - r))
    d1 = sp.simplify(sp.combsimp(ratio - target))
    d2 = sp.simplify(target - simple)
    rat1 = sp.simplify(sp.combsimp(B(n, r) / B(n, r - 1)) - (n - r + 1) / r)
    rat2 = sp.simplify(sp.combsimp(B(n, r + 1) / B(n, r - 1)) - (n - r + 1) * (n - r) / (r * (r + 1)))
    lim_r1 = sp.limit(simple.subs(r, 1), n, sp.oo)
    lim_r_two_thirds = sp.limit(simple.subs(r, 2 * n / 3), n, sp.oo)
    ok &= d1 == 0 and d2 == 0 and rat1 == 0 and rat2 == 0 and lim_r1 == 1 and lim_r_two_thirds == 1
    # exact rational cross-check and monotonicity in r
    frac_ok = mono_ok = True
    for nn in range(2, 41):
        prev = None
        for rr in range(1, nn):
            lhs = Fraction(rr * comb(nn, rr) ** 2 + comb(nn, rr - 1) ** 2, (rr + 1) * comb(nn, rr - 1) * comb(nn, rr + 1))
            rhs = 1 + Fraction(nn + 1, (nn - rr + 1) * (nn - rr))
            frac_ok &= lhs == rhs
            if prev is not None:
                mono_ok &= lhs > prev  # strictly increasing in r
            prev = lhs
    ok &= frac_ok and mono_ok
    out["edgeless_binomial"] = {
        "ratio": str(ratio),
        "claimed_product_form": str(target),
        "sympy_simplify(combsimp(ratio - product_form))": str(d1),
        "equivalent_simple_form": str(simple),
        "sympy_simplify(product_form - simple_form)": str(d2),
        "binomial_ratio_identities": {
            "C(n,r)/C(n,r-1) - (n-r+1)/r": str(rat1),
            "C(n,r+1)/C(n,r-1) - (n-r+1)(n-r)/(r(r+1))": str(rat2),
        },
        "limit_n_to_oo_at_r=1": str(lim_r1),
        "limit_n_to_oo_at_r=2n/3": str(lim_r_two_thirds),
        "exact_Fraction_check_n<=40_all_1<=r<=n-1": frac_ok,
        "ratio_strictly_increasing_in_r_(min_over_prefix_is_r=1)": mono_ok,
        "min_over_prefix_ratio_at_r=1": "1 + (n+1)/(n(n-1))",
        "consequence": "inf over forests and prefix r of the ISO ratio is 1: ISO_r cannot be strengthened to "
                       "r p_r^2 + p_{r-1}^2 >= c (r+1) p_{r-1} p_{r+1} with any constant c > 1",
        "verified": bool(d1 == 0 and d2 == 0 and rat1 == 0 and rat2 == 0 and frac_ok and mono_ok),
    }

    # (ii) star K_{1,m} at r = 2
    m = sp.symbols("m", positive=True, integer=True)
    p1, p2, p3 = m + 1, B(m, 2), B(m, 3)
    Q2 = sp.expand(sp.expand_func(2 * p2 ** 2 + p1 ** 2 - 3 * p1 * p3))
    ratio2 = sp.cancel(sp.expand_func((2 * p2 ** 2 + p1 ** 2) / (3 * p1 * p3)))
    excess = sp.factor(ratio2 - 1)
    ser = sp.series(ratio2, m, sp.oo, n=6).removeO()
    ser_str = str(sp.series(ratio2, m, sp.oo, n=6))
    star_ok = Q2 == 2 * m ** 2 + m + 1
    star_ok &= sp.simplify(excess - 2 * (2 * m ** 2 + m + 1) / (m * (m - 1) * (m - 2) * (m + 1))) == 0
    star_ok &= sp.simplify(ser - (1 + 4 / m ** 2 + 10 / m ** 3 + 26 / m ** 4 + 54 / m ** 5)) == 0
    # exact integer check against the core library
    star_int_ok = True
    star_prefix_from_m = None
    for mm in range(3, 41):
        pstar = [comb(mm, k) + (1 if k == 1 else 0) for k in range(mm + 1)]
        if mm <= 14:
            edges = [(0, i) for i in range(1, mm + 1)]
            star_int_ok &= fi.indep_poly_from_edges(mm + 1, edges) == pstar
        star_int_ok &= Q(pstar, 2) == 2 * mm * mm + mm + 1
        if 2 in prefix_indices(mm) and star_prefix_from_m is None:
            star_prefix_from_m = mm
        if mm >= 4:
            star_int_ok &= 2 in prefix_indices(mm)
    ok &= star_ok and star_int_ok
    out["star_K1m_r2"] = {
        "sequence": "p_0 = 1, p_1 = m + 1, p_k = C(m, k) for k >= 2 (alpha = m)",
        "Q_2_sympy": str(Q2),
        "Q_2_claimed": "2*m**2 + m + 1",
        "ratio_r2_rational_function": str(ratio2),
        "ratio_r2_minus_1_factored": str(excess),
        "ratio_r2_series_at_m_oo": ser_str,
        "r=2_lies_in_the_prefix_iff": f"m >= {star_prefix_from_m}",
        "exact_integer_check_m=3..40_and_core_polynomial_m<=14": star_int_ok,
        "verified": bool(star_ok and star_int_ok),
    }

    # (iii) where WR / ISO first fail beyond the prefix; minimal cutoff needed by TAIL
    tp = fi.tree_polys_upto(nmax_forests)
    per_alpha: dict[int, dict] = {}
    glob_wr = None
    glob_iso = None
    wr_in_prefix = iso_in_prefix = 0
    total = 0
    for nn in range(1, nmax_forests + 1):
        for comps, P in fi.forests(nn, tp):
            total += 1
            alpha = len(P) - 1
            L = L_of(alpha)
            first_wr = next((rr for rr in range(1, alpha + 1) if not WR(P, rr)), None)
            first_iso = next((rr for rr in range(1, alpha) if not ISO(P, rr)), None)
            m_first, m_last = mode_indices(P)
            if first_wr is not None and first_wr <= L - 1:
                wr_in_prefix += 1
            if first_iso is not None and first_iso <= L - 1:
                iso_in_prefix += 1
            d = per_alpha.setdefault(alpha, {
                "L": L, "forests": 0, "WR_fails_somewhere": 0, "min_first_WR_fail_r": None,
                "ISO_fails_somewhere": 0, "min_first_ISO_fail_r": None,
                "max_first_mode_index": -1, "max_last_mode_index": 0,
                "witness_max_first_mode_index": None,
            })
            d["forests"] += 1
            if m_first > d["max_first_mode_index"]:
                d["witness_max_first_mode_index"] = {"n": nn, "component_sizes": [k for k, _ in comps], "poly": P}
            if first_wr is not None:
                d["WR_fails_somewhere"] += 1
                d["min_first_WR_fail_r"] = first_wr if d["min_first_WR_fail_r"] is None else min(d["min_first_WR_fail_r"], first_wr)
                if glob_wr is None or first_wr < glob_wr["r"]:
                    glob_wr = {"r": first_wr, "n": nn, "component_sizes": [k for k, _ in comps], "poly": P, "alpha": alpha, "L": L}
            if first_iso is not None:
                d["ISO_fails_somewhere"] += 1
                d["min_first_ISO_fail_r"] = first_iso if d["min_first_ISO_fail_r"] is None else min(d["min_first_ISO_fail_r"], first_iso)
                if glob_iso is None or first_iso < glob_iso["r"]:
                    glob_iso = {"r": first_iso, "n": nn, "component_sizes": [k for k, _ in comps], "poly": P, "alpha": alpha, "L": L}
            d["max_first_mode_index"] = max(d["max_first_mode_index"], m_first)
            d["max_last_mode_index"] = max(d["max_last_mode_index"], m_last)
    for alpha, d in per_alpha.items():
        d["min_first_WR_fail_minus_L"] = None if d["min_first_WR_fail_r"] is None else d["min_first_WR_fail_r"] - d["L"]
        d["min_first_ISO_fail_minus_L"] = None if d["min_first_ISO_fail_r"] is None else d["min_first_ISO_fail_r"] - d["L"]
        d["L_minus_max_first_mode_index"] = d["L"] - d["max_first_mode_index"]
    cutoff_ok = wr_in_prefix == 0 and iso_in_prefix == 0 and all(d["L_minus_max_first_mode_index"] >= 0 for d in per_alpha.values())
    ok &= cutoff_ok
    out["cutoff_data_forests_n_le_12"] = {
        "forests_examined_n=1..12": total,
        "WR_failures_inside_prefix": wr_in_prefix,
        "ISO_failures_inside_prefix": iso_in_prefix,
        "smallest_r_where_WR_r_ever_fails": glob_wr,
        "smallest_r_where_ISO_r_ever_fails": glob_iso if glob_iso is not None else "ISO_r never fails for any r, any forest n <= 12",
        "per_alpha": {str(a): per_alpha[a] for a in sorted(per_alpha)},
        "reading": {
            "larger_cutoff": "a cutoff L'' > L would need WR_r/ISO_r for r in [L, L''-1]; the columns "
                             "min_first_WR_fail_minus_L / min_first_ISO_fail_minus_L say how far beyond L "
                             "that is possible on the data (0 means: already fails at r = L for some forest)",
            "smaller_cutoff": "a cutoff L' < L never adds WR/ISO requirements but asks TAIL from L'; TAIL from L' "
                              "holds iff L' >= first mode index, so L_minus_max_first_mode_index is the slack the "
                              "data leaves for lowering the cutoff at that alpha",
        },
        "verified_prefix_clean_and_L_at_least_first_mode": cutoff_ok,
    }

    marker(ok, "SHARPNESS")
    note(f"edgeless ISO ratio = {simple}; star Q_2 = {Q2}, ratio_2 = {ratio2}, series {ser_str}")
    note(f"forests n<=12: WR first fails at r={glob_wr['r']} (n={glob_wr['n']}, poly={glob_wr['poly']}); "
         f"ISO first fails: {glob_iso if glob_iso is None else glob_iso}")
    for a in sorted(per_alpha):
        note(f"alpha={a}: {per_alpha[a]}")
    out["all_ok"] = bool(ok)
    return out


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

LEMMA_STATEMENT = (
    "Let p_0, ..., p_alpha be positive integers (alpha >= 0) and, for alpha >= 1, "
    "L = ceil((2 alpha - 1)/3). Assume WR_r: p_{r-1} <= r p_r and ISO_r: "
    "r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0 for every 1 <= r <= L-1, and "
    "p_r >= p_{r+1} for every L <= r <= alpha-1. Then (p_r) is unimodal: there is an m "
    "with p_0 <= ... <= p_m >= ... >= p_alpha. More precisely, with r_0 the first index in "
    "1..L-1 with p_{r_0} <= p_{r_0-1} (if any): p is strictly increasing on [0, r_0-1] and "
    "non-increasing on [r_0-1, alpha]; if there is no such r_0, p is strictly increasing on "
    "[0, L-1] and non-increasing on [L, alpha]."
)


def main() -> int:
    t0 = time.time()
    # sanity of L_of against the core and against an exact ceiling
    L_ok = all(L_of(a) == fi.L_cutoff(a) == -((-(2 * a - 1)) // 3) for a in range(1, 501)) and L_of(0) == 0
    L_ok &= all(1 <= L_of(a) <= a for a in range(1, 501))
    L_ok &= [L_of(a) for a in range(0, 8)] == [0, 1, 1, 2, 3, 3, 4, 5] and L_of(14) == 9
    marker(L_ok, "L_CUTOFF_DEFINITION")
    results = {
        "task": "certify the WR/ISO-prefix + decreasing-tail => unimodal reduction (Erdős #993 project)",
        "lemma": LEMMA_STATEMENT,
        "definitions": {
            "L(alpha)": "ceil((2 alpha - 1)/3) for alpha >= 1; 0 for alpha = 0",
            "prefix": "r = 1 .. L-1 (WR_r and ISO_r assumed)",
            "tail": "r = L .. alpha-1 (p_r >= p_{r+1} assumed)",
            "WR_r": "p_{r-1} <= r p_r",
            "ISO_r": "Q_r = r p_r^2 + p_{r-1}^2 - (r+1) p_{r-1} p_{r+1} >= 0",
            "unimodal": "exists m: p_0 <= ... <= p_m >= ... >= p_alpha (plateaus allowed)",
            "L_values_alpha_0_to_7": [L_of(a) for a in range(0, 8)],
            "L_matches_core_and_exact_ceiling_alpha<=500": bool(L_ok),
        },
        "environment": {
            "python": platform.python_version(),
            "sympy": sp.__version__,
            "seed": SEED,
        },
    }
    results["identities"] = section_identities()
    results["forests_n_le_14"] = section_forests(14)
    results["random_sequences"] = section_random(100_000, 40_000)
    results["necessity"] = section_necessity(200_000)
    results["klym_t1"] = section_klym()
    results["sharpness"] = section_sharpness(12)
    results["seconds_total"] = round(time.time() - t0, 3)
    results["failures"] = list(FAILURES)
    results["pass"] = not FAILURES

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w") as fh:
        json.dump(results, fh, indent=1, default=str)
    print(f"wrote {OUT_JSON}")
    if FAILURES:
        print("FAIL_WR_ISO_TAIL_LEMMA_REPLAY", FAILURES)
        return 1
    print("PASS_WR_ISO_TAIL_LEMMA_REPLAY")
    return 0


if __name__ == "__main__":
    sys.exit(main())
