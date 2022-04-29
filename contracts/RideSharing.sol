// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract RideSharing {

    uint bike = 1;
    uint car = 2;

    struct Coordinates {
        int lat;
        int long;
    }

    struct pickAndDrop {
        Coordinates pickLocation;
        Coordinates dropLocation;
        uint riderVehicle;
        uint fare;
        bool status;
    }

    struct Driver {
        uint driverId;
        string name;
        string email;
        string licenseNo;
        string contactNo;
        string driverAddress;
        uint driverVehicle;
        bool isDriver;
    }

    struct Rider {
        uint riderId;
        string name;
        string email;
        string contactNo;
        string riderAddress;
        bool isRider;
    }

    mapping(address => pickAndDrop) public rideRequests;

    mapping(address => Driver) public drivers;
    mapping(address => Rider) public riders;

    address[] public driversList;
    address[] public ridersList;

    event requestRide(
        uint indexed riderId, 
        uint indexed vehicle, 
        int[] pickLocation, 
        int[] dropLocation
    );
    event requestAccepted(
        uint indexed driverId
    );

    // Restricted to a Driver only
    modifier onlyDriver {
        require(drivers[msg.sender].isDriver == true, "Not a driver");
        _;
    }

    // Restricted to a rider only
    modifier onlyRider {
        require(riders[msg.sender].isRider == true, "Not a rider");
        _;
    }

    // Stores Driver
    function storeDriver(
        string memory _name, 
        string memory _email, 
        string memory _licenseNo, 
        string memory _contactNo, 
        string memory _driverAddress, 
        uint _driverVehicle
    ) public {
        require(_driverVehicle == bike || _driverVehicle == car, "Not a bike or a car");
        driversList.push(msg.sender);
        drivers[msg.sender] = Driver({
            driverId: driversList.length - 1, 
            name: _name, 
            email: _email, 
            licenseNo:_licenseNo, 
            contactNo: _contactNo, 
            driverAddress: _driverAddress, 
            driverVehicle: _driverVehicle, 
            isDriver: true
        });
    }

    // Stores Rider
    function storeRider(
        string memory _name, 
        string memory _email, 
        string memory _contactNo, 
        string memory _riderAddress
    ) public {
        ridersList.push(msg.sender);
        riders[msg.sender] = Rider({
            riderId: ridersList.length - 1, 
            name: _name, 
            email: _email, 
            contactNo: _contactNo, 
            riderAddress: _riderAddress, 
            isRider: true
        });
    }

    // Request bike or car ride by providing pick and drop location
    function riderRequestRide(
        int[] memory _pickLocation, 
        int[] memory _dropLocation, 
        uint _vehicle, 
        uint _fare
    ) public onlyRider {
        require(_vehicle == bike || _vehicle == car, "Not a bike or a car");
        require(rideRequests[msg.sender].status == false, "Cannot initiate multiple ride requests");
        rideRequests[msg.sender] = pickAndDrop({
            pickLocation: Coordinates({lat: _pickLocation[0], long: _pickLocation[1]}), 
            dropLocation: Coordinates({lat: _dropLocation[0], long: _dropLocation[1]}),
            riderVehicle: _vehicle,
            fare: _fare, 
            status: true
        });
        emit requestRide(riders[msg.sender].riderId, _vehicle, _pickLocation, _dropLocation);
    }

    // Chooses ride request by driver
    function driverChooseRideRequest(uint _riderId) public onlyDriver {
        require(rideRequests[ridersList[_riderId]].status == true, "Request does not exist");
        require(rideRequests[ridersList[_riderId]].riderVehicle == drivers[msg.sender].driverVehicle, "Rider's and Driver's vechile must be same");
        rideRequests[ridersList[_riderId]].status = false;
        emit requestAccepted(drivers[msg.sender].driverId);
    }

    // Pay fare to driver
    function pay(uint _driverId) public payable onlyRider {
        require(rideRequests[msg.sender].fare == msg.value, "Rider set fare and paying amount must be same");
        payable(driversList[_driverId]).transfer(msg.value);
    }
}

