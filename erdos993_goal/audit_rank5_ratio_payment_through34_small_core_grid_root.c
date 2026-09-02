#define audit_ratio_payment_grid audit_ratio_payment_grid28_unused
#include "audit_rank5_ratio_payment_through28_small_core_grid_root.c"
#undef audit_ratio_payment_grid

/*
 * Independent through-34 grid using the included clean two-pass reroot DP.
 * Only the finite sibling range and fresh result storage differ.
 */

#define AUDIT34_SIBLING_SLOTS 33

static u64 audit34_tree_count[AUDIT_MAX_ORDER + 1];
static u64 audit34_root_count[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS];
static u64 audit34_negative_count[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS];
static i128 audit34_minimum_margin[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS];
static unsigned char audit34_minimum_set[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS];
static u64 audit34_witness_tree[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS];
static int audit34_witness_root[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS];
static u64 audit34_witness_window[AUDIT_MAX_ORDER + 1][AUDIT34_SIBLING_SLOTS][5];
static int audit34_registered;

static void report_audit34(void)
{
    puts("GRID,core_order,siblings,total_order,trees,roots,negative,minimum,witness_tree,witness_root,a,b,d,e,f");
    u64 total_tree_rows = 0, total_root_rows = 0, total_negative = 0;
    for (int order = 1; order <= AUDIT_MAX_ORDER; ++order)
    {
        int low = 10 - order;
        if (low < 0) low = 0;
        int high = 32 - order;
        for (int siblings = low; siblings <= high; ++siblings)
        {
            printf("GRID,%d,%d,%d,%llu,%llu,%llu,", order, siblings,
                   order + siblings + 2, audit34_tree_count[order],
                   audit34_root_count[order][siblings],
                   audit34_negative_count[order][siblings]);
            print_i128(audit34_minimum_margin[order][siblings]);
            printf(",%llu,%d,%llu,%llu,%llu,%llu,%llu\n",
                   audit34_witness_tree[order][siblings],
                   audit34_witness_root[order][siblings],
                   audit34_witness_window[order][siblings][0],
                   audit34_witness_window[order][siblings][1],
                   audit34_witness_window[order][siblings][2],
                   audit34_witness_window[order][siblings][3],
                   audit34_witness_window[order][siblings][4]);
            total_tree_rows += audit34_tree_count[order];
            total_root_rows += audit34_root_count[order][siblings];
            total_negative += audit34_negative_count[order][siblings];
        }
    }
    printf("TOTAL,%llu,%llu,%llu\n", total_tree_rows, total_root_rows, total_negative);
    puts(total_negative == 0
         ? "PASS_INDEPENDENT_RANK5_SMALL_CORE_GRID_THROUGH34_AUDIT"
         : "FAIL_RANK5_SMALL_CORE_GRID_THROUGH34_AUDIT");
}

void audit_ratio_payment_grid34(FILE *output, int parent[], int order)
{
    (void)output;
    if (!audit34_registered)
    {
        if (atexit(report_audit34) != 0) abort();
        audit34_registered = 1;
    }
    n_current = order;
    memset(degree_of, 0, sizeof(degree_of));
    memset(neighbor, 0, sizeof(neighbor));
    memset(downward_excluded, 0, sizeof(downward_excluded));
    memset(downward_total, 0, sizeof(downward_total));
    memset(deleted_polynomial, 0, sizeof(deleted_polynomial));
    for (int vertex = 2; vertex <= order; ++vertex)
    {
        int ancestor = parent[vertex];
        neighbor[vertex][degree_of[vertex]++] = ancestor;
        neighbor[ancestor][degree_of[ancestor]++] = vertex;
    }
    downward_pass(1, 0);
    outward_pass(1, 0, poly_one(), poly_one());
    Poly core = downward_total[1];
    u64 tree_index = audit34_tree_count[order]++;

    int low = 10 - order;
    if (low < 0) low = 0;
    int high = 32 - order;
    for (int siblings = low; siblings <= high; ++siblings)
    {
        u64 d = with_isolates(&core, siblings, 3);
        u64 e = with_isolates(&core, siblings, 4);
        u64 f = with_isolates(&core, siblings, 5);
        for (int root = 1; root <= order; ++root)
        {
            u64 a = e + deleted_polynomial[root].c[3];
            u64 b = f + deleted_polynomial[root].c[4];
            i128 margin = payment_margin(a, b, d, e, f);
            ++audit34_root_count[order][siblings];
            if (margin < 0) ++audit34_negative_count[order][siblings];
            if (!audit34_minimum_set[order][siblings]
                || margin < audit34_minimum_margin[order][siblings])
            {
                audit34_minimum_set[order][siblings] = 1;
                audit34_minimum_margin[order][siblings] = margin;
                audit34_witness_tree[order][siblings] = tree_index;
                audit34_witness_root[order][siblings] = root;
                audit34_witness_window[order][siblings][0] = a;
                audit34_witness_window[order][siblings][1] = b;
                audit34_witness_window[order][siblings][2] = d;
                audit34_witness_window[order][siblings][3] = e;
                audit34_witness_window[order][siblings][4] = f;
            }
        }
    }
}
