#!/usr/bin/env python3
"""Symbolic factor reconnaissance for the adjacent singleton-endpoint residual."""

import sympy as sp

from derive_iso_common_factor_product_rule_root import (
    defect_form, multiply, nested, wronskian_part,
)
from derive_iso_n5_disconnected_mark_factorization_g1_nonadjacent import phi
from derive_iso_nested_compact_operator_root import leaf_kernel, symbols, w, z


def main():
    P, P0, Y, Q = (symbols(name) for name in ("P", "P0", "Y", "Q"))
    PY, PQ, P0Q = multiply(P, Y), multiply(P, Q), multiply(P0, Q)
    D = (PY, PY, PQ, PQ)
    n_d = nested(D)
    r_d = defect_form(D)
    kernel = sp.expand((z - w) ** 2 * (P0Q[0] * PQ[1] + PY[0] * P0Q[1]))
    swapped = kernel.xreplace({z: w, w: z, **{
        P[0]: P[1], P[1]: P[0], P0[0]: P0[1], P0[1]: P0[0],
        Y[0]: Y[1], Y[1]: Y[0], Q[0]: Q[1], Q[1]: Q[0],
        P[2]: P[3], P[3]: P[2], P0[2]: P0[3], P0[3]: P0[2],
        Y[2]: Y[3], Y[3]: Y[2], Q[2]: Q[3], Q[3]: Q[2],
    }})
    # Simultaneous xreplace with z<->w is unsafe because of key collision;
    # reconstruct the transpose directly from the row entries.
    kernel_t = sp.expand((z - w) ** 2 * (P0Q[1] * PQ[0] + PY[1] * P0Q[0]))
    delta_op = sp.expand((w * kernel + z * kernel_t) / 2)
    fop = sp.expand(n_d + delta_op)
    phi_y = phi(Y, Q)

    one = (sp.Integer(1), sp.Integer(1), sp.Integer(0), sp.Integer(0))
    psi0 = sp.expand(leaf_kernel(one, one) - z*w*phi(one, one)/2)
    psi_y = sp.expand(leaf_kernel(Y, Q) - z*w*phi_y/2)
    main_term = sp.expand(P[0] * P[1] * (z + w) * psi_y)
    remainder = sp.expand(fop - main_term)
    quotient, residual = sp.div(remainder, phi_y, domain="QQ[" + ",".join(
        map(str, sorted(remainder.free_symbols - {z, w}, key=str))
    ) + "]")
    print("N_D_TERMS", len(sp.Add.make_args(n_d)))
    print("DELTA_TERMS", len(sp.Add.make_args(delta_op)))
    print("FOP_TERMS", len(sp.Add.make_args(fop)))
    print("PHI_DIVISION_RESIDUAL", sp.factor(residual))
    print("PHI_QUOTIENT", sp.factor(quotient))
    expected_n = sp.expand(
        P[0]*P[1]*((z+w)*psi_y + psi0*phi_y)
        + wronskian_part(P)*(z+w)*phi_y
    )
    print("N_PRODUCT_RESIDUAL", sp.factor(n_d - expected_n))
    print("R_PRODUCT_RESIDUAL", sp.factor(r_d - P[0]*P[1]*(z+w)*phi_y))


if __name__ == "__main__":
    main()
