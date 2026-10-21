import { dictionaryEntries, dictionaryEntryTemplate } from "./fob.js"

const fields = [
    ["dictionary_headword", "Íslendskt leitorð", "Icelandic headword"],
    ["inflection_display", "Leitorðseginleikar", "Headword properties"],
    ["icelandic_form", "Íslendskt orðasnið", "Icelandic word form"],
    ["icelandic_sense_text", "Íslendsk merkingarfrágreiðing", "Icelandic sense context"],
    ["faroese_headword", "Føroysk týðing av leitorði", "Faroese headword translation"],
    ["phrase_type", "Slag í orðabók", "Dictionary text type"],
    ["icelandic_example", "Íslendskur upprunatekstur", "Icelandic original"],
    ["subject_field", "Yrkisøki", "Subject field"],
    ["created_at", "Dagfesting", "Date"],
    ["modified_at", "Seinast broytt", "Last modified"],
]
const setFields = new Set(["faroese_headword", "icelandic_sense_text", "subject_field", "created_at", "modified_at"])
const typeLabels = {
    Dømi: { fao: "Dømi", eng: "Example" },
    Týðing: { fao: "Týðing", eng: "Translation" },
    "Sagnorð+bitil": { fao: "Sagnorð+bitil", eng: "Verb + particle" },
    Orðasamband: { fao: "Orðasamband", eng: "Collocation" },
    Orðataki: { fao: "Orðatak", eng: "Idiom" },
    Orðatak: { fao: "Orðatak", eng: "Idiom" },
    Frágreiðing: { fao: "Frágreiðing", eng: "Explanation" },
}

function safeLink(value) {
    try {
        const url = new URL(value)
        if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return value
    } catch (_) { /* A missing or malformed link leaves the source as plain text. */ }
}

function formatDate(value) {
    // ISLEX source timestamps have day precision. A year-only display date is
    // the owner's estimate for a text without a matched creation timestamp.
    return /^\d{4}$/.test(value) ? `≈ ${value}` : value
}

function dateValues(value) {
    return String(value || "").split("|").map(value => value.trim())
        .filter(value => value && !/^_+undef_+$/i.test(value))
}

export function islexDates(value) {
    return dateValues(value).map(value => formatDate(value))
}

function sameDates(first, second) {
    const a = [...new Set(dateValues(first))].sort()
    const b = [...new Set(dateValues(second))].sort()
    return a.length > 0 && a.length === b.length && a.every((value, index) => value === b[index])
}

export const foIslexDate = {
    template: String.raw`
        <span ng-if="dates.length === 1">{{dates[0]}}</span>
        <ul ng-if="dates.length > 1"><li ng-repeat="date in dates track by $index">{{date}}</li></ul>`,
    controller: ["$scope", function ($scope) {
        $scope.dates = islexDates($scope.value)
    }],
}

export function islexEntryRows(value, sentenceData = {}, lang = "fao") {
    return dictionaryEntries(value, sentenceData).map(entry => ({
        fields: fields.flatMap(([key, fao, eng]) => {
            const raw = entry[key]
            if (raw == null || raw === "") return []
            if (key === "modified_at" && sameDates(raw, entry.created_at)) return []
            const values = (setFields.has(key) ? String(raw).split("|") : [String(raw)])
                .map(value => value.trim()).filter(value => value && !/^_+undef_+$/i.test(value))
                .map(value => key === "phrase_type" ? (typeLabels[value]?.[lang] || typeLabels[value]?.fao || value) : value)
                .map(value => key === "created_at" ? formatDate(value) : value)
            return values.length ? [{ key, label: { fao, eng }, values,
                italic: ["icelandic_example", "icelandic_sense_text"].includes(key),
                url: key === "dictionary_headword" ? safeLink(entry.link) : undefined }] : []
        }),
    })).filter(entry => entry.fields.some(field => field.key === "dictionary_headword"))
        .map(entry => ({
            headword: entry.fields.find(field => field.key === "dictionary_headword"),
            fields: entry.fields.filter(field => field.key !== "dictionary_headword"),
        }))
}

export function islexHeadwords(value, sentenceData = {}) {
    const values = String(value || "").split("|").map(value => value.trim())
        .filter(value => value && !/^_+undef_+$/i.test(value))
    // Grouped results have entry-specific links in their own panels.
    const url = values.length === 1 ? safeLink(sentenceData.text_leinki) : undefined
    return values.map(value => ({ value, url }))
}

export const foIslexHeadword = {
    template: String.raw`
        <span ng-if="headwords.length === 1 && !headwords[0].url">{{headwords[0].value}}</span>
        <a ng-if="headwords.length === 1 && headwords[0].url" ng-href="{{headwords[0].url}}"
            target="_blank" rel="noopener noreferrer">{{headwords[0].value}}</a>
        <ul ng-if="headwords.length > 1">
            <li ng-repeat="headword in headwords track by $index">{{headword.value}}</li>
        </ul>`,
    controller: ["$scope", function ($scope) {
        $scope.headwords = islexHeadwords($scope.value, $scope.sentenceData)
    }],
}

export const foIslexEntries = {
    block: true,
    template: dictionaryEntryTemplate,
    controller: ["$scope", function ($scope) {
        $scope.dictionaryEntries = islexEntryRows($scope.value, $scope.sentenceData, $scope.$root?.lang || "fao")
        $scope.unavailable = {
            fao: "Orðabókarpostarnir kunnu ikki vísast.",
            eng: "The dictionary entries could not be displayed.",
        }
    }],
}
