const fs = require('fs');
const path = require('path');

const files = [
    "src/components/DateRangePicker.tsx",
    "src/components/OptionModal.tsx",
    "src/components/ViewPhoto.tsx",
    "src/hooks/useDeleteAuthentication.tsx",
    "src/screens/AddCustomerScreen.tsx",
    "src/screens/AddTransactionScreen.tsx",
    "src/screens/CustomerTransactionsScreen.tsx",
    "src/screens/CustomersScreen.tsx",
    "src/screens/LogsScreen.tsx",
    "src/screens/MessagesScreen.tsx",
    "src/screens/PasscodeScreen.tsx",
    "src/screens/TransactionDetailScreen.tsx",
    "src/screens/TrashScreen.tsx"
];

for (const relativeFile of files) {
    const file = path.join(__dirname, relativeFile);
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');

    // 1. Remove the destructured import
    content = content.replace(/const \{ setAutoLockSuspended \} = usePasscode\(\);?\r?\n?/g, '');
    content = content.replace(/,\s*setAutoLockSuspended/g, '');
    content = content.replace(/setAutoLockSuspended,\s*/g, '');

    // 2. Remove return () => setAutoLockSuspended(false);
    content = content.replace(/[ \t]*return \(\) => setAutoLockSuspended\([^)]*\);\r?\n?/g, '');

    // 3. Remove isolated calls
    content = content.replace(/[ \t]*setAutoLockSuspended\([^)]*\);\r?\n?/g, '');

    // 4. Remove onPress/onDismiss inline arrow functions
    content = content.replace(/onPress:\s*\(\)\s*=>\s*setAutoLockSuspended\(false\),?/g, '');
    content = content.replace(/onDismiss:\s*\(\)\s*=>\s*setAutoLockSuspended\(false\),?/g, '');
    content = content.replace(/\{\s*onDismiss:\s*\(\)\s*=>\s*setAutoLockSuspended\(false\)\s*\},?/g, '');

    // 5. Remove dependencies in hooks
    content = content.replace(/\[\s*setAutoLockSuspended\s*\]/g, '[]');

    fs.writeFileSync(file, content);
}
console.log('Cleanup script finished.');
