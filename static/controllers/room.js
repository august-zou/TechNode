angular.module('techNodeApp').controller('RoomCtrl', function($scope, socket) {
  $scope.messages = []
  socket.emit('messages.read')
  socket.on('messages.read', function (messages) {
    $scope.messages = messages
  })
  socket.on('messages.add', function (message) {
    $scope.messages.push(message)
  })
});


