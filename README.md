# KhataBook - Credit Management System

A comprehensive credit management solution for tracking customer accounts, transactions, and maintaining digital ledgers. Built with React Native and Expo.

## Features

- **Customer Management** - Add, edit, and manage customer profiles with images
- **Transaction Tracking** - Record credits and debits with detailed history
- **Reports & Analytics** - View financial summaries and insights
- **Ledger View** - Complete transaction history with customer details
- **Drag & Drop Reordering** - Organize customers in your preferred order
- **Credit Limit** - Set and enforce credit limits per customer
- **Search** - Quickly find customers by name, phone, or email
- **Dark Theme** - Modern dark UI optimized for financial apps

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Database**: SQLite (expo-sqlite)
- **State Management**: React Context API
- **Styling**: StyleSheet with design tokens
- **Icons**: @expo/vector-icons
- **Gestures**: react-native-gesture-handler + react-native-reanimated

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository

    ```bash
    git clone <repository-url>
    cd KhataBook
    ```

2. Install dependencies

    ```bash
    npm install
    ```

3. Start the development server

    ```bash
    npm start
    ```

4. Run on device/simulator
    - Press `a` for Android
    - Press `i` for iOS
    - Press `w` for web

### Available Scripts

| Script               | Description                   |
| -------------------- | ----------------------------- |
| `npm start`          | Start Expo development server |
| `npm run android`    | Start for Android             |
| `npm run ios`        | Start for iOS                 |
| `npm run web`        | Start for web                 |
| `npm run lint`       | Run ESLint                    |
| `npm run type-check` | Run TypeScript type checking  |
| `npm run clean`      | Clean build artifacts         |

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── Typography.tsx
├── constants/         # Design tokens
│   ├── Colors.ts
│   ├── Spacing.ts
│   └── Typography.ts
├── db/               # Database configuration
│   └── database.ts
├── hooks/            # Custom React hooks
│   ├── useAccounts.ts
│   ├── useCustomerById.ts
│   ├── useCustomers.ts
│   ├── useCustomersWithAccounts.ts
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   └── useTransactions.ts
├── models/           # TypeScript interfaces
│   ├── Account.ts
│   ├── Customer.ts
│   └── Transaction.ts
├── navigation/       # Navigation configuration
│   └── AppNavigator.tsx
├── screens/          # Screen components
│   ├── AboutScreen.tsx
│   ├── AddCustomerScreen.tsx
│   ├── CustomersScreen.tsx
│   ├── CustomerTransactionsScreen.tsx
│   ├── LedgerScreen.tsx
│   └── ReportsScreen.tsx
├── services/         # Business logic & data access
│   ├── AccountService.ts
│   ├── CustomerService.ts
│   └── TransactionService.ts
├── store/            # State management
│   └── DatabaseContext.tsx
└── utils/            # Utility functions
    ├── currencyUtils.ts
    └── dateUtils.ts
```

## Screens

1. **Customers** - List all customers with search and drag-to-reorder
2. **Customer Transactions** - View/add transactions for a specific customer
3. **Add Customer** - Create or edit customer profiles
4. **Reports** - Financial summaries and statistics
5. **Ledger** - Complete transaction history
6. **About** - App info and developer details

## Database Schema

### Tables

- **customers** - Customer profiles
- **accounts** - Customer accounts with balances and credit limits
- **transactions** - Credit/debit transactions
- **customer_order** - Custom customer ordering for drag-and-drop

## Developer

**Faiz Ullah Khan**

- Full Stack Developer (MERN)
- React Native Development
- 3+ Years Industry Experience

**Contact:**

- Phone: +92 332 8753452, +92 331 7947676
- Email: faizullahofficial0@gmail.com, faizullahofficial12@gmail.com
- GitHub: [faizullahkhan8](https://github.com/faizullahkhan8)

## License

This project is private and proprietary.

## Support

For business inquiries or custom software development needs, contact the developer.
