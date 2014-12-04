angular.module('techNodeApp').controller('MessageCreatorCtrl', function($scope, socket) {
  $scope.newMessage = ''
  $scope.createMessage = function () {
    if ($scope.newMessage == '') {
      return
    }
    socket.emit('messages.create', $scope.newMessage)
    $scope.newMessage = ''
  }
});


