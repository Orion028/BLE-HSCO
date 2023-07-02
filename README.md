
# BLE HSCO

This project aims to establish a connection and display weight data from a BLE (Bluetooth Low Energy) device to a React Native/Expo app.




## Initial Setup

### Initial expo Installation (can also use react-native startup)

```bash
  npx create-expo-app my-project
  cd my-project
```

### BLE dependencies packages

```bash
  npm i react-native-ble-plx
  npm i --save-dev @config-plugins/react-native-ble-plx
  npm i react-native-base64
  npm i --save-dev "@types/react-native-base64
```

### Why react-native-ble-plx? 

The "react-native-ble-plx" library is a popular choice for working with BLE devices in React Native. It provides an easy-to-use interface for discovering, connecting to, and communicating with BLE peripherals.

### Configure react-native-ble-plx in expo-app

In app.json file, plugins add the below config

```bash
"plugins": [
      [
        "@config-plugins/react-native-ble-plx",
        {
          "isBackgroundEnabled": true,
          "modes": [
            "peripheral",
            "central"
          ],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to bluetooth devices"
        }
      ]
    ],
```

In app.json also setup permission for bluetooth use for react-native-ble-plx

```bash
"android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT"
      ],
      "package": "com.temp.temp"
    },
```
## Usage/Examples

### Hook for using ble functions

```typescript
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
      //Get only devices which only includes scale in the ble device name
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

```

### Below is the example to use it in the app
```typescript
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useBLE from "./useBLE";
import DeviceModal from "./DeviceModalConnection";

const App = () => {
  const {
    requestPermissions,
    scanForPeripherals,
    allDevices,
    connectToDevice,
    connectedDevice,
    disconnectFromDevice,
    weight,
    monitorNotification,
    cancelNotification,
  } = useBLE();
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [start, setStart] = useState<boolean>(false);

  const scanForDevices = async () => {
    const isPermissionsEnabled = await requestPermissions();
    if (isPermissionsEnabled) {
      scanForPeripherals();
    }
  };

  const hideModal = () => {
    setIsModalVisible(false);
  };

  const openModal = async () => {
    scanForDevices();
    setIsModalVisible(true);
  };

  useEffect(() => {
    if(start) {
      monitorNotification()
    } else {
      cancelNotification()
    }
  }, [start])
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.TitleWrapper}>
        {connectedDevice ? (
          <>
            <Text style={styles.TitleText}>Weight Is:</Text>
            <Text style={styles.Text}>{weight} kg</Text>
          </>
        ) : (
          <>
            <Text style={styles.TitleText}>Please Connect to a</Text>
            <Text style={styles.TitleText}>HSCO WEIGHT BLE DEVICE</Text>
          </>
        )}
      </View>
      {connectedDevice && (
        <TouchableOpacity
          onPress={() => setStart(!start)}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaButtonText}>
            {start ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={connectedDevice ? disconnectFromDevice : openModal}
        style={styles.ctaButton}
      >
        <Text style={styles.ctaButtonText}>
          {connectedDevice ? "Disconnect" : "Connect"}
        </Text>
      </TouchableOpacity>
      <DeviceModal
        closeModal={hideModal}
        visible={isModalVisible}
        connectToPeripheral={connectToDevice}
        devices={allDevices}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  TitleWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  TitleText: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: 20,
    color: "black",
  },
  Text: {
    fontSize: 25,
    marginTop: 15,
  },
  ctaButton: {
    backgroundColor: "#FF6060",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default App;

```

Created a modal to show list of BLE devices

```typescript
import React, { FC, useCallback } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  Modal,
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Device } from "react-native-ble-plx";

type DeviceModalListItemProps = {
  item: ListRenderItemInfo<Device>;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

type DeviceModalProps = {
  devices: Device[];
  visible: boolean;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

const DeviceModalListItem: FC<DeviceModalListItemProps> = (props) => {
  const { item, connectToPeripheral, closeModal } = props;

  const connectAndCloseModal = useCallback(() => {
    connectToPeripheral(item.item);
    closeModal();
  }, [closeModal, connectToPeripheral, item.item]);

  return (
    <TouchableOpacity
      onPress={connectAndCloseModal}
      style={modalStyle.ctaButton}
    >
      <Text style={modalStyle.ctaButtonText}>{item.item.name}</Text>
    </TouchableOpacity>
  );
};

const DeviceModal: FC<DeviceModalProps> = (props) => {
  const { devices, visible, connectToPeripheral, closeModal } = props;

  const renderDeviceModalListItem = useCallback(
    (item: ListRenderItemInfo<Device>) => {
      return (
        <DeviceModalListItem
          item={item}
          connectToPeripheral={connectToPeripheral}
          closeModal={closeModal}
        />
      );
    },
    [closeModal, connectToPeripheral]
  );

  return (
    <Modal
      style={modalStyle.modalContainer}
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={closeModal}
    >
      <SafeAreaView style={modalStyle.modalTitle}>
        <Text style={modalStyle.modalTitleText}>
          Tap on a device to connect
        </Text>
        <FlatList
          contentContainerStyle={modalStyle.modalFlatlistContiner}
          data={devices}
          renderItem={renderDeviceModalListItem}
        />
      </SafeAreaView>
    </Modal>
  );
};

const modalStyle = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  modalFlatlistContiner: {
    flex: 1,
    justifyContent: "center",
  },
  modalCellOutline: {
    borderWidth: 1,
    borderColor: "black",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },
  modalTitle: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  modalTitleText: {
    marginTop: 40,
    fontSize: 30,
    fontWeight: "bold",
    marginHorizontal: 20,
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#FF6060",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 20,
    marginBottom: 5,
    borderRadius: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});

export default DeviceModal;
```
## Run Locally

Clone the project

```bash
git clone https://github.com/Orion028/BLE-HSCO
```

Go to the project directory

```bash
cd my-project
```

Install dependencies

```bash
npm install
```

Prebuild the application

```bash
npx expo prebuild
```
After prebuild an android folder would be created.
Inside that folder create a file name local.properties and add the location of sdk, example - 

```bash
sdk.dir = C:\\Users\\suman\\AppData\\Local\\Android\\Sdk
```

Next simply run 

```bash
npm run android
```

### In screenshots folder in repo you can see the example images

Note: Use actual device using USB for debugging

## Documentation

[Expo](https://docs.expo.dev/)

[react-native-ble-plx](https://dotintent.github.io/react-native-ble-plx/)

