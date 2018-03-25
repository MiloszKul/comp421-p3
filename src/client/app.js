var app = angular.module('421-Prj', ['ngRoute', 'tc.chartjs','ngTable','datetimepicker']);

//router
app.config(['$routeProvider',function($routeProvider) {
		$routeProvider
			.when("/", {
				templateUrl: "src/client/pages/home.html",
			})
			.when("/viewBills", {
				templateUrl: "src/client/pages/viewBills.html",
				controller: "viewBills"
			})
			.when("/newReservation", {
				templateUrl: "src/client/pages/newReservation.html",
				controller: "newReservation"
			})
			.when("/generateBills", {
				templateUrl: "src/client/pages/generateBills.html",
				controller: "generateBills"
            })
      .when("/occupiedRooms", {
          templateUrl: "src/client/pages/occupiedRooms.html",
          controller: "occupiedRooms"
      })
			.when("/manageEmployee", {
					templateUrl: "src/client/pages/manageEmployee.html",
					controller: "manageEmployee"
			})
			.when("/viewProfits", {
				templateUrl: "src/client/pages/viewProfits.html",
				controller: "viewProfits"
			});
}]);

//date time config
app.config(['datetimepickerProvider',function (datetimepickerProvider) {
    datetimepickerProvider.setOptions({
    	locale: 'en',
    	format:'YYYY-MM-DD'
    });
}]);

//create bills for occupations that do not have a bill yet
app.controller('generateBills', ['$scope','$http','NgTableParams', function($scope,$http,ngTableParams){
	$scope.makeBills = function(){
		$http.get("./generateBills").success(function(data) {
			$scope.successAlert = true;
			$scope.failAlter=false;
		}).error(function (error){
			$scope.successAlert = false;
			$scope.failAlter=true;
		});
	}

}]);
//view occupied rooms
app.controller('occupiedRooms', ['$scope', '$http', function ($scope, $http) {
    $scope.startDate = "2017-01-01";
    $scope.endDate = "2018-01-01";

    $scope.loadData = function () {
        $http.get("./getRoomReservation?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate).success(function (d) {
            $scope.roomsChart = {
                data: {
                    labels: ['Free', 'Occupied', 'Reserved'],
                    datasets: [{
                        data: [100 - d.ocnt - d.rcnt, d.ocnt, d.rcnt],
                        backgroundColor: ["#aaaaaa", "#04a558", "#ffd000"]
                    }]
                },
                options: {
                    title: {
                        display: true,
                        fontSize: 16,
                        text: "Occupied Rooms"
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    $scope.loadData();
}]);
//view bills
app.controller('viewBills', ['$scope','$http','NgTableParams', function($scope,$http,ngTableParams){
	$http.get("./getBills").success(function(data) {
				$scope.billsData = data;
				$scope.billsTable = new ngTableParams({
						page: 1,
						count: 25
				}, {
						dataset:$scope.billsData
				});
	  });


 }]);
//new reservations
app.controller('newReservation', ['$scope','$http',function($scope,$http){

	$http.get("./getRooms").success(function(data) {
		$scope.rooms=data;
  	});
	$http.get("./getCustomers").success(function(data) {
		$scope.customers=data;
	});
	$scope.addReservation = function(){
		if($scope.newRes.$valid){
		  $http.post("./addRes",JSON.stringify($scope.reservation)).success(function(data) {
				$scope.successAlert = true;
				$scope.failAlert=false;
			}).error(function (error){
				$scope.successAlert = false;
				$scope.failAlert=true;
			});
		}
	}


}]);
app.controller('manageEmployee',['$scope','$http', function($scope,$http){
    $http.get("./getEmployees").success(function(data) {
        $scope.employees=data;
    });
		$scope.getEmployee = function(){
			$http.get("./getEmployee?sin=" + $scope.sin).success(function(data) {
					$scope.employee=data;
					$scope.employee.salary=parseInt($scope.employee.salary);
			});
		}
		$scope.updateEmployee = function(){
			$http.post("./setEmployee",JSON.stringify($scope.employee)).success(function(data) {
				$scope.successAlert = true;
				$scope.failAlter=false;
				$scope.getEmployee();
			}).error(function (error){
				$scope.successAlert = false;
				$scope.failAlter=true;
			});
		}

}]);
 //view profits
 app.controller('viewProfits', ['$scope','$http', function($scope,$http){
	$scope.startDate = "2017-12-01";
	$scope.endDate = "2017-12-31";

	$scope.loadData = function(){
 		$http.get("./getProfits?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate).success(function(data) {
			$scope.profitsChart = {
				data:{
					labels: data.map(function (a) {
						return a.date;
					}),
					datasets:[{
						data:data.map(function (a) {
							return a.profit === null ? 0 : a.profit;
						}),
						label:'Profit',
						borderColor: "#1aa000",
						backgroundColor: "rgba(26, 160, 0,0.6)"
					}]
				},
				options: {
					title: {
						display: true,
						fontSize:16,
						text: "Profits By Day"
					},
					legend:{
							display:true,
							position:'top'
					}
				}
			}
    });
	}
	$scope.loadData();

  }]);
