angular.module('techNodeApp').config(function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode({
    enabled: true,
    requireBase: false
  });
  $routeProvider.
    when('/', {
      templateUrl: '/views/room.html',
      controller: 'RoomCtrl'
    }).
    when('/login', {
      templateUrl: '/views/login.html',
      controller: 'LoginCtrl'
    }).
    otherwise({
      redirectTo: '/login'
    });
});
