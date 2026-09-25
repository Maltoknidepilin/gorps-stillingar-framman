// Display both the older separate CWB fields and MMG's newer korp_* summaries.
// Original manuscript/edition metadata stays untouched in CWB and the archive.
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim()
const comparable = (value) => clean(value).toLowerCase().replace(/[ .;,:]+$/, "")
const readableVolume = (value) => clean(value).replace(/^Bind\s+([IVXLCDM]+)\.docx?$/i, "Føroya kvæði, bind $1")

export function balladEdition(edition, sourceFile) {
    const references = clean(edition).split("|").map((part) => readableVolume(part.trim().replace(/^\d+\.\s*/, "")))
    const ccf = references.filter((part) => /Føroya kvæði|\bFK\b/i.test(part))
    let display = [...new Set(ccf)].join(" | ") || readableVolume(edition)
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

export const foBalladSource = {
    template: '<span ng-bind="displayValue"></span>',
    controller: ["$scope", "$element", function ($scope, $element) {
        const data = $scope.sentenceData || {}
        // A source note may name a collector, a manuscript, or both. Do not
        // classify it as an author or merge it into the separate manuscript row.
        $scope.displayValue = clean($scope.value ?? data[$scope.key])
        if (!$scope.displayValue || ($scope.key === "text_heimild" &&
            comparable($scope.displayValue) === comparable(data.text_handrit))) {
            $element.hide()
        }
    }],
}
export const foBalladEdition = summaryComponent("text_utgava", "text_bind", balladEdition)
