/** Link only to a real dictionary entry carried alongside the selected lemma. */
export const foLemma = {
    template: `
        <a ng-if="bendingarUrl" ng-href="{{bendingarUrl}}" target="_blank"
            rel="noopener noreferrer" ng-bind="value"></a>
        <span ng-if="!bendingarUrl" ng-bind="value"></span>
    `,
    controller: ["$scope", function ($scope) {
        const id = String($scope.wordData?.bendingar_id ?? "")
        if (/^[1-9][0-9]*$/.test(id)) {
            $scope.bendingarUrl = `https://bendingar.fo/bending/${id}`
        }
    }],
}
