/** Display metadata without changing the stored values used by CQP and TEI. */
export default {
    foBalladReference(value) {
        return String(value ?? "").trim().replace(/^(?:CCF|TSB)\s+/i, "")
    },
    foEstimatedPeriod(value) {
        return String(value ?? "").replace(/^(\d{4})\/(\d{4})$/, "$1-$2")
    },
    foDateOnly(value) {
        const text = String(value ?? "")
        // Preserve the source calendar date; timezone conversion could shift it.
        return /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(text)?.[1] || text
    },
}
