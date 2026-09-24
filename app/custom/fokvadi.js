// Display both the older separate CWB fields and MMG's newer korp_* summaries.
// Original manuscript/edition metadata stays untouched in CWB and the archive.
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim()
const comparable = (value) => clean(value).toLowerCase().replace(/[ .;,:]+$/, "")
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const contains = (text, part) =>
    new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(part)}(?![\\p{L}\\p{N}_])`, "u").test(text)

export function balladSource(manuscript, note) {
    const parts = []
    for (const part of [clean(manuscript), clean(note)]) {
        const key = comparable(part)
        if (!key || parts.some((previous) => contains(comparable(previous), key))) continue
        const shorter = parts.findIndex((previous) => contains(key, comparable(previous)))
        if (shorter >= 0) parts[shorter] = part
        else parts.push(part)
    }
    return parts.join("; ")
}

export function balladEdition(edition, sourceFile) {
    const references = clean(edition).split("|").map((part) => part.trim().replace(/^\d+\.\s*/, ""))
    const ccf = references.filter((part) => /Føroya kvæði|\bFK\b/i.test(part))
    let display = [...new Set(ccf)].join(" | ") || clean(edition)
    const volume = /^Bind\s+([IVXLCDM]+)\.docx?$/i.exec(clean(sourceFile))?.[1].toUpperCase()
    if (volume && !new RegExp(`\\b(?:vol\\.?|bind|band)\\s+${volume}\\b`, "i").test(display)) {
        display = [display, `Føroya kvæði, bind ${volume}`].filter(Boolean).join("; ")
    }
    return display
}

function summaryComponent(primary, fallback, summarize) {
    return {
        template: '<span ng-bind="displayValue"></span>',
        controller: ["$scope", "$element", function ($scope, $element) {
            const data = $scope.sentenceData || {}
            // Attach to both legacy fields so a missing primary value never hides
            // the fallback. Render only one row when both fields have values.
            if ($scope.key === fallback && clean(data[primary])) {
                $element.hide()
                return
            }
            $scope.displayValue = summarize(data[primary], data[fallback])
            if (!$scope.displayValue) $element.hide()
        }],
    }
}

export const foBalladSource = summaryComponent("text_heimild", "text_handrit", (note, manuscript) =>
    balladSource(manuscript, note))
export const foBalladEdition = summaryComponent("text_utgava", "text_bind", balladEdition)
