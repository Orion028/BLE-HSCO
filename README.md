
# BLE HSCO

This project aims to establish a connection and display weight data from a BLE (Bluetooth Low Energy) device to a React Native/Expo app.




## Installation

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

