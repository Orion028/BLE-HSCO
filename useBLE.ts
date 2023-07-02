/* eslint-disable no-bitwise */
import { useMemo, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  BleError,
  BleManager,
  Characteristic,
  Device,
  Service,
} from "react-native-ble-plx";

import * as ExpoDevice from "expo-device";

// Decode/encode base64 to string
import base64 from "react-native-base64";

//Constant variables: The WEIGHT_SCALE_UUID and WEIGHT_RATE_CHARACTERISTIC variables 
//define the UUIDs of the weight scale service and characteristic used for communication with the BLE device.
const WEIGHT_SCALE_UUID = "bc340e9b-ea14-1fb5-d64d-726000210324";
const WEIGHT_RATE_CHARACTERISTIC = "bc340e9b-ea14-1fb5-d64d-726001210324";

interface BluetoothLowEnergyApi {
  requestPermissions(): Promise<boolean>;
  scanForPeripherals(): void;
  connectToDevice: (deviceId: Device) => void;
  disconnectFromDevice: () => void;
  connectedDevice: Device | null;
  allDevices: Device[];
  weight: string;
  monitorNotification: () => void;
  cancelNotification: () => void;
}

function useBLE(): BluetoothLowEnergyApi {
  //The arrow function () => new BleManager() inside useMemo is responsible for creating a new instance of the BleManager class. 
  // The BleManager class is imported from the react-native-ble-plx library and represents the main interface for managing BLE functionality in the React Native app.
  const bleManager = useMemo(() => new BleManager(), []);
  const [allDevices, setAllDevices] = useState<Device[]>([]); //Stores the list of devices
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null); 
  const [weight, setWeight] = useState<string>("0");

  const requestAndroid31Permissions = async () => {
    const bluetoothScanPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const bluetoothConnectPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );
    const fineLocationPermission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Bluetooth Low Energy requires Location",
        buttonPositive: "OK",
      }
    );

    return (
      bluetoothScanPermission === "granted" &&
      bluetoothConnectPermission === "granted" &&
      fineLocationPermission === "granted"
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "Bluetooth Low Energy requires Location",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const isAndroid31PermissionsGranted =
          await requestAndroid31Permissions();

        return isAndroid31PermissionsGranted;
      }
    } else {
      return true;
    }
  };


  // Check whether the device is duplicate or not
  const isDuplicteDevice = (devices: Device[], nextDevice: Device) =>
    devices.findIndex((device) => nextDevice.id === device.id) > -1;


  // BLE device scanning: The scanForPeripherals function starts scanning for BLE devices using the startDeviceScan method of the BleManager instance. 
  // It filters the discovered devices based on their names, specifically looking for devices with "Scale" in their names. 
  // The discovered devices are stored in the allDevices state, avoiding duplicates.
  const scanForPeripherals = () =>
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
      }
      if (device?.name?.includes("Scale")) {
        setAllDevices((prevState: Device[]) => {
          if (!isDuplicteDevice(prevState, device)) {
            return [...prevState, device];
          }
          return prevState;
        });
      }
    });

  // Device connection: The connectToDevice function establishes a connection to a specific BLE device using the connectToDevice method of the BleManager instance. 
  // It also discovers the services and characteristics of the device using the discoverAllServicesAndCharacteristicsForDevice method.  
  const connectToDevice = async (device: Device) => {
    try {
      const deviceConnection = await bleManager.connectToDevice(device.id);
      setConnectedDevice(deviceConnection);

      //getting ble devices all charateristics and services
      const deviceChars =
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(
          device.id
        );
      const services = await deviceChars.services();

      const serviceUUIDs = services.map((service: Service) => service.uuid);

      bleManager.stopDeviceScan();
    } catch (e) {
      console.log("FAILED TO CONNECT", e);
    }
  };

  // Characteristic monitoring: The monitorNotification function sets up a notification to monitor a specific characteristic's value changes on the connected device. 
  // It uses the monitorCharacteristicForService method of the connected device instance, decoding and updating the weight data when a new value is received.
  const monitorNotification = async () => {
    if (connectedDevice) {
      connectedDevice.monitorCharacteristicForService(
        WEIGHT_SCALE_UUID,
        WEIGHT_RATE_CHARACTERISTIC,
        (error: BleError | null, characteristic: Characteristic | null) => {
          if (characteristic?.value) {
            const rawData = base64.decode(characteristic?.value);
            if (weight !== rawData) setWeight(rawData);
          }
          if (error) {
            console.log("error", error);
          }
        },
        "weight234"
      );
    }
  };

  // Notification cancellation: The cancelNotification function cancels the previously set notification using the cancelTransaction method of the BleManager instance.
  const cancelNotification = async () => {
    if (connectedDevice) {
      bleManager.cancelTransaction("weight234");
    }
  };

  // Device disconnection: The disconnectFromDevice function disconnects from the currently connected device using the cancelDeviceConnection method of the BleManager instance. 
  // It also resets the connected device and weight data states.
  const disconnectFromDevice = () => {
    if (connectedDevice) {
      bleManager.cancelDeviceConnection(connectedDevice.id);
      setConnectedDevice(null);
      setWeight("0");
    }
  };

  return {
    scanForPeripherals,
    requestPermissions,
    connectToDevice,
    allDevices,
    connectedDevice,
    disconnectFromDevice,
    weight,
    monitorNotification,
    cancelNotification,
  };
}

export default useBLE;
