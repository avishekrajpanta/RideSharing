const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ContractFunctionVisibility } = require("hardhat/internal/hardhat-network/stack-traces/model");

describe("RideSharing Contract", () => {
  let contract;
  let Ajay, Sheraf;
  const bike = 1;
  const car = 2;
  const truck = 3;
  
  beforeEach(async () => {
    const RideSharing = await ethers.getContractFactory("RideSharing");
    contract = await RideSharing.deploy();
    await contract.deployed();
    [Ajay, Sheraf] = await ethers.getSigners();
  });

  describe("storeDriver", () => {
    it("Should store driver with correct information", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', bike);
      
      expect(await contract.driversList(0)).to.equal(Ajay.address);

      const driver = await contract.drivers(Ajay.address);
      expect(driver.driverId).to.equal(0);
      expect(driver.name).to.equal('Ajay Gurung');
      expect(driver.email).to.equal('ajaygurung@gmail.com');
      expect(driver.licenseNo).to.equal('104-342');
      expect(driver.contactNo).to.equal('9867800000');
      expect(driver.driverAddress).to.equal('Kalanki, Kathmandu');
      expect(driver.driverVehicle).to.equal(bike);
      expect(driver.isDriver).to.equal(true);
    });

    it("Throws when trying to store other than bike or car", async () => {
      const storeDriverTx = contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', truck);
      await expect(storeDriverTx).to.be.revertedWith("Not a bike or a car");
    });
  });

  describe("storeRider", () => {
    it("Should store rider with correct information", async () => {
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      
      expect(await contract.ridersList(0)).to.equal(Sheraf.address);

      const rider = await contract.riders(Sheraf.address);
      expect(rider.riderId).to.equal(0);
      expect(rider.name).to.equal('Sheraf Lama');
      expect(rider.email).to.equal('sheraflama@gmail.com');
      expect(rider.contactNo).to.equal('9847600000');
      expect(rider.riderAddress).to.equal('Naikap, Kathmandu');
      expect(rider.isRider).to.equal(true);
    });
  });

  describe("riderRequestRide", () => {
    const from = [ethers.utils.parseEther('27.686189'), ethers.utils.parseEther('85.227105')];
    const to = [ethers.utils.parseEther('27.679461'), ethers.utils.parseEther('85.322715')]

    it("Should allow rider to request bike or car ride", async () => {
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, car, ethers.utils.parseEther('2'));

      const rideRequest = await contract.rideRequests(Sheraf.address);
      expect(rideRequest.pickLocation.lat).to.equal(ethers.utils.parseEther('27.686189'));
      expect(rideRequest.pickLocation.long).to.equal(ethers.utils.parseEther('85.227105'));
      expect(rideRequest.dropLocation.lat).to.equal(ethers.utils.parseEther('27.679461'));
      expect(rideRequest.dropLocation.long).to.equal(ethers.utils.parseEther('85.322715'));
      expect(rideRequest.riderVehicle).to.equal(car);
      expect(rideRequest.fare).to.equal(ethers.utils.parseEther('2'));
      expect(rideRequest.status).to.equal(true);
    });

    it("Should fire requestRide event when rider sucessfully request a bike or car ride", async () => {
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');

      const riderRequestRideTx = await contract.connect(Sheraf).riderRequestRide(from, to, bike, ethers.utils.parseEther('1'));
      const rider = await contract.riders(Sheraf.address)
      await expect(riderRequestRideTx).to.emit(contract, 'requestRide').withArgs(rider.riderId, bike, from, to);
    });

    it("Throws when trying to request ride without being a rider", async () => {
      const riderRequestRideTx = contract.connect(Sheraf).riderRequestRide(from, to, bike, ethers.utils.parseEther('1'));
      await expect(riderRequestRideTx).to.be.revertedWith('Not a rider');
    });

    it("Throws when trying to request a ride with a vehicle other than bike or car", async () => {
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');

      const riderRequestRideTx = contract.connect(Sheraf).riderRequestRide(from, to, truck, ethers.utils.parseEther('1'));
      await expect(riderRequestRideTx).to.be.revertedWith('Not a bike or a car');
    })

    it("Throws when trying to initiate multiple ride requests without previous one being accepted", async () => {
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, bike, ethers.utils.parseEther('1'));

      const riderRequestRideTx = contract.connect(Sheraf).riderRequestRide(from, to, car, ethers.utils.parseEther('2'));
      await expect(riderRequestRideTx).to.be.revertedWith('Cannot initiate multiple ride requests');
    });
  });

  describe("DriverchooseRideRequest", () => {
    const from = [ethers.utils.parseEther('27.686189'), ethers.utils.parseEther('85.227105')];
    const to = [ethers.utils.parseEther('27.679461'), ethers.utils.parseEther('85.322715')]

    it("Should allow driver to accept ride request", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', bike);
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, bike, ethers.utils.parseEther('1'));

      const rider = await contract.riders(Sheraf.address);
      await contract.connect(Ajay).driverChooseRideRequest(rider.riderId);

      const rideRequest = await contract.rideRequests(Sheraf.address);
      expect(rideRequest.status).to.equal(false);
    });

    it("Should fire requestAccepted event when driver sucessfuly accept the request", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', bike);
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, bike, ethers.utils.parseEther('1'));

      const driver = await contract.drivers(Ajay.address);
      const rider = await contract.riders(Sheraf.address);
      const driverChooseRideRequestTx = await contract.connect(Ajay).driverChooseRideRequest(rider.riderId);
      await expect(driverChooseRideRequestTx).to.emit(contract, 'requestAccepted').withArgs(driver.driverId);
    });

    it("Throws when trying to accept ride request without being a driver", async () => {
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, car, ethers.utils.parseEther('1'));

      const rider = await contract.riders(Sheraf.address);
      const driverChooseRideRequestTx = contract.connect(Ajay).driverChooseRideRequest(rider.riderId);
      await expect(driverChooseRideRequestTx).to.be.revertedWith("Not a driver");
    });

    it("Throws when trying to accept ride request whoose status is false", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', bike);
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      
      const rider = await contract.riders(Sheraf.address);
      const driverChooseRideRequestTx = contract.connect(Ajay).driverChooseRideRequest(rider.riderId);
      await expect(driverChooseRideRequestTx).to.be.revertedWith("Request does not exist");
    });

    it("Throws when trying to accpet ride request without rider and driver vechile being the same", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', bike);
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, car, ethers.utils.parseEther('1'));

      const rider = await contract.riders(Sheraf.address);
      const driverChooseRideRequestTx = contract.connect(Ajay).driverChooseRideRequest(rider.riderId);
      await expect(driverChooseRideRequestTx).to.be.revertedWith("Rider's and Driver's vechile must be same");
    });
  });

  describe("pay", () => {
    const from = [ethers.utils.parseEther('27.686189'), ethers.utils.parseEther('85.227105')];
    const to = [ethers.utils.parseEther('27.679461'), ethers.utils.parseEther('85.322715')]

    it("Should allow user to pay fare", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', car);
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, car, ethers.utils.parseEther('3'));

      const rider = await contract.riders(Sheraf.address);
      await contract.connect(Sheraf).pay(rider.riderId, {value: ethers.utils.parseEther('3')});
    });

    it("Throws when trying to pay without being a rider", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', car);

      const rider = await contract.riders(Sheraf.address);
      const payTX = contract.connect(Sheraf).pay(rider.riderId, {value: ethers.utils.parseEther('2')});
      await expect(payTX).to.be.revertedWith("Not a rider");
    });

    it("Throws when rider set fare is not equal to paying amount", async () => {
      await contract.connect(Ajay).storeDriver('Ajay Gurung', 'ajaygurung@gmail.com', '104-342', '9867800000', 'Kalanki, Kathmandu', car);
      await contract.connect(Sheraf).storeRider('Sheraf Lama', 'sheraflama@gmail.com', '9847600000', 'Naikap, Kathmandu');
      await contract.connect(Sheraf).riderRequestRide(from, to, car, ethers.utils.parseEther('3'));

      const rider = await contract.riders(Sheraf.address);
      const payTX = contract.connect(Sheraf).pay(rider.riderId, {value: ethers.utils.parseEther('2')});
      await expect(payTX).to.be.revertedWith("Rider set fare and paying amount must be same");
    });
  });
});