import { locAttribute } from "@/i18n"
import { getStringifier } from "@/services/stringify"

function getTokenSignature(scope) {
    const sId = scope?.sentenceData?.s_id || scope?.sentenceData?.sentence_id || ""
    const pos = scope?.wordData?.position ?? ""
    const word = scope?.wordData?.word ?? ""
    return `${sId}:${pos}:${word}`
}

function ensureHiddenStore(scope) {
    const sig = getTokenSignature(scope)
    const w = window
    if (w.__foHiddenMetaSig !== sig) {
        w.__foHiddenMetaSig = sig
        w.__foHiddenMeta = {}
        w.__foHiddenMetaOpen = false
    }
    return w.__foHiddenMeta
}

function resetHiddenStore() {
    const w = window
    w.__foHiddenMetaSig = null
    w.__foHiddenMeta = {}
    w.__foHiddenMetaOpen = false
}

function renderHiddenSection() {
    const w = window
    const container = document.querySelector("#selected_word")
    if (!container) return

    const existing = container.querySelector("#fo-hidden-meta")
    const entries = Object.values(w.__foHiddenMeta || {})

    if (!entries.length) {
        if (existing) existing.remove()
        return
    }

    const section = existing || document.createElement("div")
    section.id = "fo-hidden-meta"

    const open = Boolean(w.__foHiddenMetaOpen)
    const label = `Fjalt (${entries.length})`
    const rows = entries
        .map((e) => `<div><strong>${e.label}</strong>: ${e.value}</div>`)
        .join("")

    section.innerHTML = `
        <div class="mt-2">
            <button type="button" class="btn btn-link text-left w-full" id="fo-hidden-meta-toggle">${label}</button>
            <div id="fo-hidden-meta-body" class="text-sm" style="display:${open ? "block" : "none"}">
                ${rows}
            </div>
        </div>
    `

    const button = section.querySelector("#fo-hidden-meta-toggle")
    const body = section.querySelector("#fo-hidden-meta-body")
    if (button && body) {
        button.onclick = () => {
            w.__foHiddenMetaOpen = !w.__foHiddenMetaOpen
            body.style.display = w.__foHiddenMetaOpen ? "block" : "none"
        }
    }

    if (!existing) container.appendChild(section)
    else container.appendChild(section) // re-append to keep it at the bottom
}

function isMeaningfulScalar(value) {
    if (value == null) return false
    if (typeof value !== "string") return true
    const trimmed = value.trim()
    if (!trimmed) return false
    if (trimmed === "_") return false
    return true
}

function isMeaningfulSet(value) {
    if (value == null) return false
    if (typeof value !== "string") return true

    // CWB uses '|' as set separator and may represent empty sets as just '|'
    const parts = value.split("|").filter(Boolean)
    return parts.length > 0
}

export default {
    /**
     * Hides the sidebar row entirely if the value is empty/placeholder.
     * Intended for morph-feature attributes where many tokens have no value.
     */
    foHideEmpty: {
        template: String.raw`
            <span ng-if="!isEmpty">
                <strong ng-if="attrs.label">{{ attrs.label | locObj:$root.lang }}</strong><span ng-if="attrs.label">: </span>

                <span ng-if="attrs.type == 'set'">
                    <ul>
                        <li ng-repeat="item in valueArray">
                            <span ng-bind-html="renderValue(item) | trust"></span>
                        </li>
                    </ul>
                </span>

                <span ng-if="attrs.type != 'set'" ng-bind-html="renderValue(value) | trust"></span>
            </span>
        `,
        controller: [
            "$scope",
            "store",
            function ($scope, store) {
                // Always sync/reset the hidden store for the currently selected token
                // before deciding whether this specific attribute should contribute to it.
                ensureHiddenStore($scope)

                const hideValuesRaw = $scope.attrs?.sidebar_hide_values
                const hideValues = Array.isArray(hideValuesRaw)
                    ? hideValuesRaw
                    : typeof hideValuesRaw === "string"
                      ? [hideValuesRaw]
                      : []

                const isHiddenScalarValue =
                    $scope.attrs?.type !== "set" &&
                    typeof $scope.value === "string" &&
                    hideValues.includes($scope.value)

                const isEmptySet = $scope.attrs?.type === "set" && !isMeaningfulSet($scope.value)
                const isEmptyScalar = $scope.attrs?.type !== "set" && !isMeaningfulScalar($scope.value)

                $scope.isEmpty = Boolean(isEmptySet || isEmptyScalar || isHiddenScalarValue)
                $scope.valueArray = (($scope.value || "").split("|") || []).filter(Boolean)

                // Collect only values hidden by sidebar_hide_values (not plain empty placeholders)
                if (isHiddenScalarValue) {
                    const hidden = ensureHiddenStore($scope)

                    const labelObj = $scope.attrs?.label
                    const label =
                        typeof labelObj === "string"
                            ? labelObj
                            : (labelObj && (labelObj[store.lang] || labelObj.eng || labelObj.fao)) || $scope.key

                    // Render value as the user would have seen it
                    let rendered = $scope.value
                    if ($scope.attrs?.stringify) rendered = getStringifier($scope.attrs.stringify)(rendered)
                    if ($scope.attrs?.translation) rendered = locAttribute($scope.attrs, rendered, store.lang)

                    // Avoid showing empty string in hidden list
                    if (rendered == null || rendered === "") rendered = $scope.value

                    hidden[$scope.key] = { key: $scope.key, label, value: rendered }
                }

                // (Re)render expandable section at bottom
                // Use a short timeout so #selected_word has been populated.
                setTimeout(() => renderHiddenSection(), 0)

                $scope.renderValue = (value, key = $scope.key) => {
                    let out = value
                    if ($scope.attrs.stringify) out = getStringifier($scope.attrs.stringify)(out)
                    if ($scope.attrs.translation) out = locAttribute($scope.attrs, out, store.lang)
                    if ($scope.attrs.type === "url") {
                        out = `<a href="${out}" class="exturl sidebar_url" target="_blank">${decodeURI(out)}</a>`
                    }
                    return out
                }
            },
        ],
    },
    copyRowButton: (options = {}) => ({
        template: `<span class="cursor-pointer" ng-click="click()"><i class="fa-solid fa-copy"></i> {{ 'copy_row' | loc:$root.lang }}</span>`,
        controller: [
            "$scope",
            function ($scope) {
                $scope.click = async () => {
                    const attributes = Array.isArray(options.attributes) && options.attributes.length
                        ? options.attributes
                        : ["word"]

                    const copyStr = attributes
                        .map((attribute) =>
                            ($scope.tokens || [])
                                .map((token) => token?.[attribute] ?? $scope.sentenceData?.[attribute] ?? "")
                                .join("\t")
                        )
                        .join("\n")

                    try {
                        await navigator.clipboard.writeText(copyStr)
                    } catch (_err) {
                        // keep silent to avoid breaking sidebar interactions on clipboard permission errors
                    }
                }
            },
        ],
    }),
    resetHiddenStore: {
        template: "",
        controller: [
            function () {
                resetHiddenStore()
                setTimeout(() => renderHiddenSection(), 0)
            },
        ],
    },
}
