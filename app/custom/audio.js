import settings from "@/settings"
import { AudioPlayback, audioNumber, audioRange, formatAudioTime } from "@/kwic/audio-playback"

/** Adapter for the existing sidebar audio feature. Attribute names belong in presets. */
export default (options = {}) => ({
    block: true,
    template: `<div ng-if="audioUrl" class="fo-audio">
        <div ng-if="sentenceRange" class="fo-audio__time">
            <strong>{{'audio_recording_range' | loc:$root.lang}}:</strong> {{sentenceTime}}
        </div>
        <div ng-if="sentenceRange" class="fo-audio__actions">
            <button type="button" class="btn btn-default btn-sm"
                ng-click="playSentence()" ng-class="{'active': sentencePlaying}">
                <i class="fa-solid fa-volume-high" aria-hidden="true"></i>
                {{'play_sentence' | loc:$root.lang}}
            </button>
        </div>
        <audio controls preload="none"
            aria-label="{{attrs.label[$root.lang] || attrs.label.fao}}"></audio>
        <a ng-href="{{audioUrl}}" download target="_blank" rel="noopener noreferrer">
            <i class="fa-solid fa-download" aria-hidden="true"></i>
            {{'download_audio_file' | loc:$root.lang}}
        </a>
        <span ng-if="playbackFailed" role="status">{{'audio_playback_failed' | loc:$root.lang}}</span>
    </div>`,
    controller: ["$scope", "$element", function ($scope, $element) {
        let playback, audio, destroyed = false, request = 0
        try {
            const url = new URL($scope.value)
            if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password)
                $scope.audioUrl = url.href
        } catch (_) { /* Old/missing audio metadata has no broken player. */ }

        const attrs = $scope.sentenceData || {}
        const relative = audioRange(attrs[options.sentence_start], attrs[options.sentence_end])
        // FPSC uses speech WAVs. Only an explicitly configured meeting player
        // may add the speech offset. Never infer the time base from URL shape.
        const offset = options.time_base === "meeting" ? audioNumber(attrs[options.speech_start]) : 0
        if (relative && offset != undefined && offset >= 0) {
            $scope.sentenceRange = { start: relative.start + offset, end: relative.end + offset }
            $scope.sentenceTime = `${formatAudioTime($scope.sentenceRange.start)}–${formatAudioTime($scope.sentenceRange.end)}`
        }

        const update = () => {
            if (!destroyed) $scope.$evalAsync(() => {
                $scope.sentencePlaying = Boolean(playback?.range && !audio?.paused)
            })
        }
        $scope.$$postDigest(() => {
            if (destroyed || !$scope.audioUrl) return
            audio = $element[0].querySelector("audio")
            if (!audio) return
            playback = new AudioPlayback(audio, settings.audio_playback, update)
            playback.setSource($scope.audioUrl)
        })
        $scope.playSentence = async () => {
            if (!playback || !$scope.sentenceRange) return
            const current = ++request
            const { start, end } = $scope.sentenceRange
            const playing = playback.playSentence(start, end)
            if (process.env.ENVIRONMENT !== "production") console.debug("Sentence audio", {
                attributes: Object.fromEntries((options.debug_attributes || []).map(key => [key, attrs[key]])),
                source: $scope.audioUrl, timeBase: options.time_base || "speech", offset,
                aligned: relative, effective: playback.range,
            })
            const ok = await playing
            if (!destroyed && current === request) $scope.$evalAsync(() => {
                $scope.playbackFailed = !ok
            })
        }
        $scope.$on("$destroy", () => { destroyed = true; playback?.destroy() })
    }],
})
