const fields = [
    ["dictionary_headword", "Leitorð í orðabók", "Dictionary headword"],
    ["dictionary_subheadword", "Undirleitorð", "Subheadword"],
    ["homonym", "Leitorðsnummar", "Homonym number"],
    ["inflection_display", "Leitorðseginleikar", "Headword properties"],
    ["phonetic", "Framburður", "Pronunciation"],
    ["sense_number", "Undirmerking", "Sense number"],
    ["sense_definition", "Leitorðsmerking", "Headword sense"],
    ["phrase_type", "Slag í orðabók", "Dictionary text type"],
    ["comment_target", "Viðmerking um", "Note about"],
    ["original_phrase", "Upprunaligt dømi", "Original example"],
    ["related_example", "Tilknýtt dømi", "Related example"],
    ["example_explanation", "Frágreiðing um dømið", "Explanation of the example"],
    ["dictionary_notes", "Orðabókaviðmerking", "Dictionary note"],
    ["subject_field", "Yrkisøki", "Subject field"],
    ["register", "Stílvirði", "Register"],
    ["regional_headword", "Staðbundið (leitorð)", "Regional headword"],
    ["regional_sense", "Staðbundið (merking)", "Regional sense"],
    ["regional_example", "Staðbundið (dømi)", "Regional example"],
    ["citations", "Heimild", "Source citation"],
    ["created_at", "Stovnað í orðabókini", "Dictionary entry created"],
    ["modified_at", "Seinast broytt í orðabókini", "Dictionary entry last modified"],
]
const setFields = new Set([
    "dictionary_notes", "subject_field", "register", "regional_headword", "regional_sense", "regional_example",
])

/** Restore the shared bounded JSON transport used by both dictionaries. */
export function dictionaryEntries(value, sentenceData = {}) {
    try {
        const parts = /^(?:FOB|ISLEX)JSON:([2-8]):/.exec(value)
        if (parts) {
            value = value.slice(parts[0].length)
            for (let part = 2; part <= Number(parts[1]); part++) {
                const next = sentenceData[`text_ordabokarpostar_${part}`]
                if (typeof next !== "string" || !next || /^_+undef_+$/i.test(next)) return []
                value += next
            }
        }
        const entries = JSON.parse(value)
        if (!Array.isArray(entries)) return []
        return entries.filter(entry => entry && typeof entry === "object" && !Array.isArray(entry))
    } catch (_) {
        return []
    }
}

/** Each entry keeps its own fields; Angular text bindings escape their contents. */
export function dictionaryEntryRows(value, sentenceData = {}) {
    return dictionaryEntries(value, sentenceData).map(entry => ({
        fields: fields.flatMap(([key, fao, eng]) => {
            const raw = entry[key]
            if (raw == null || raw === "") return []
            const values = (setFields.has(key) ? String(raw).split("|") : [String(raw)])
                .map(value => value.trim()).filter(value => value && !/^_+undef_+$/i.test(value))
                .map(value => key === "dictionary_notes" && value === "orðtak" ? "orðatak" : value)
            return values.length ? [{ key, label: { fao, eng }, values }] : []
        }),
    })).filter(entry => entry.fields.some(field => field.key === "dictionary_headword"))
        .map(entry => ({
            headword: entry.fields.find(field => field.key === "dictionary_headword"),
            fields: entry.fields.filter(field => field.key !== "dictionary_headword"),
        }))
}

export const dictionaryEntryTemplate = String.raw`
        <sidebar-section ng-repeat="entry in dictionaryEntries track by $index" class="block mt-2"
            initial-open="$first"
            title-prefix="{{ entry.headword.label | locObj:$root.lang }}:"
            title="{{ entry.headword.values[0] }}" title-url="entry.headword.url">
            <div ng-repeat="field in entry.fields track by field.key" class="mb-1">
                <strong>{{ field.label | locObj:$root.lang }}:</strong>
                <span ng-if="field.values.length == 1 && !field.url" ng-class="{'italic': field.italic}">{{ field.values[0] }}</span>
                <a ng-if="field.values.length == 1 && field.url" ng-href="{{field.url}}"
                    target="_blank" rel="noopener noreferrer">{{ field.values[0] }}</a>
                <ul ng-if="field.values.length > 1">
                    <li ng-repeat="value in field.values track by $index" ng-class="{'italic': field.italic}">{{ value }}</li>
                </ul>
            </div>
        </sidebar-section>
        <p ng-if="!dictionaryEntries.length" class="mt-2">{{ unavailable | locObj:$root.lang }}</p>
    `

export const foDictionaryEntries = {
    block: true,
    template: dictionaryEntryTemplate,
    controller: ["$scope", function ($scope) {
        $scope.dictionaryEntries = dictionaryEntryRows($scope.value, $scope.sentenceData)
        $scope.unavailable = {
            fao: "Orðabókarpostarnir kunnu ikki vísast.",
            eng: "The dictionary entries could not be displayed.",
        }
    }],
}
