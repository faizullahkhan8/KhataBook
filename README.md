# KhataBook

KhataBook is a private, offline-first credit and ledger management app built with React Native and Expo. It helps small businesses manage customers, record credit and payment transactions, monitor balances, and share payment reminders.

## Features

- Create and manage customer profiles, contact details, photos, and credit limits
- Record credit and payment transactions with a complete customer history
- View financial reports, metrics, and a combined ledger
- Search customers and arrange them with drag-and-drop ordering
- Create reusable message templates and send reminders through SMS
- Protect the app with a passcode and supported device biometrics
- Switch between English and Urdu
- Use light, dark, or system themes
- Store native business data locally in a SQLCipher-encrypted SQLite database

## Tech Stack

- React Native 0.81 and React 19
- Expo SDK 54 and Expo Router
- TypeScript
- SQLCipher with `@op-engineering/op-sqlite` on Android/iOS
- Plaintext `expo-sqlite` on web
- Argon2id passcode and recovery-answer verifiers
- React Navigation
- i18next and react-i18next
- Expo SecureStore and LocalAuthentication
- React Native Reanimated and Gesture Handler

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Git
- Java Development Kit (JDK) 17
- Android Studio with:
  - Android SDK
  - Android SDK Platform-Tools
  - Android SDK Build-Tools
  - Android Emulator and a configured virtual device
- A rebuilt development client on a physical device or simulator
- Xcode and CocoaPods for iOS development (macOS only)
- EAS CLI for cloud builds (optional)

For local Android development, configure `ANDROID_HOME` to point to your Android
SDK and add `platform-tools` to your system `PATH`. Android Studio's bundled JDK
can be used instead of installing Java separately.

Install the optional EAS CLI globally when creating cloud builds:

```bash
npm install --global eas-cli
```

### Installation

```bash
git clone https://github.com/faizullahkhan8/KhataBook.git
cd KhataBook
npm install
npm start
```

From the Expo terminal, press `a` for Android, `i` for iOS, or `w` for web.

Native database encryption and Argon2id use native modules and do not work in
Expo Go. Rebuild the development client after changing native dependencies.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Expo development server |
| `npm run android` | Start Expo and open Android |
| `npm run ios` | Start Expo and open iOS |
| `npm run web` | Start the web version |
| `npm run lint` | Run Expo ESLint |
| `npm run type-check` | Run TypeScript checks |
| `npm run clean` | Remove local dependencies and generated Expo output |

## Project Structure

```text
app/                    Expo Router routes and root layout
assets/                 App icons, fonts, and images
src/
  components/           Reusable UI components
  constants/            Colors, spacing, and typography tokens
  db/                   SQLite setup, schema, and migrations
  hooks/                Data access and reusable React hooks
  i18n/                 English and Urdu translations
  models/               TypeScript domain models
  navigation/           Main tab navigation
  screens/              Application screens
  services/             Customer, account, transaction, and message logic
  store/                Database, theme, language, and passcode contexts
  utils/                Currency, date, and message helpers
android/                Native Android project
app.json                Expo application configuration
eas.json                EAS build profiles
```

## Main Screens

- Customers
- Customer profile and transactions
- Reports
- Messages
- Ledger
- Settings
- Passcode
- About, feedback, privacy policy, and terms of use

## Local Database

KhataBook encrypts its Android and iOS database with SQLCipher using a random
device-only key stored in SecureStore. PINs and recovery answers are one-way
hashed with Argon2id. If the device-only database key is lost, encrypted records
cannot be recovered.

The web version intentionally retains plaintext `expo-sqlite` storage. Do not
use the web version for sensitive financial or personal records.

The main database tables are:

- `customers`
- `accounts`
- `transactions`
- `payments`
- `customer_order`
- `message_templates`
- `app_metadata`
- `security_settings`

## Quality Checks

Run these checks before submitting changes:

```bash
npm run lint
npm run type-check
```

## EAS Builds

The repository includes EAS profiles for development, preview APK, and production Android App Bundle builds:

```bash
eas build --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
```

## Developer

**Faiz Ullah Khan**

- GitHub: [faizullahkhan8](https://github.com/faizullahkhan8)
- Email: faizullahofficial0@gmail.com

## License

This project is private and proprietary.
