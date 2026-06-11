# Fix Summary: Initial Balance Bypass Issue

## Problem

When a new customer was created with an initial balance, the `current_balance` was set directly on the account without creating a corresponding transaction record. This caused:

- ❌ Incomplete audit trail (no transaction history for opening balance)
- ❌ Ledger calculations don't match account balance
- ❌ Reports missing opening balance information
- ❌ Customer balance cannot be verified from transaction history

## Solution

### Core Approach

Instead of setting `current_balance` directly, we now:

1. Create account with `current_balance = 0`
2. Insert a DEBIT "Opening Balance" transaction for the initial amount
3. The database trigger automatically updates the balance from the transaction
4. Wrap both operations in a SQLite transaction for atomicity

### Implementation Details

#### 1. AccountService.createAccountWithOpeningBalance()

**File:** [src/services/AccountService.ts](src/services/AccountService.ts#L33-L92)

```typescript
// Creates account with opening balance transaction atomically
// Uses db.transactionAsync() to ensure both operations succeed or fail together
await this.db.transactionAsync(async (tx) => {
    // 1. Create account with balance = 0
    // 2. Insert DEBIT transaction for opening balance
    // Trigger automatically updates balance
});
```

Key features:

- Atomicity: Both account creation and transaction succeed/fail together
- If initialBalance = 0: Falls back to normal account creation
- If initialBalance > 0: Creates matching transaction

#### 2. Updated useCustomersWithAccounts Hook

**File:** [src/hooks/useCustomersWithAccounts.ts](src/hooks/useCustomersWithAccounts.ts#L107-L145)

```typescript
if (initialBalance > 0) {
    // Use new method with opening balance transaction
    await accountService.createAccountWithOpeningBalance(
        { ...account, current_balance: 0 },
        initialBalance,
    );
} else {
    // Normal account creation
    await accountService.createAccount({
        ...account,
        current_balance: 0,
    });
}
```

#### 3. TransactionService.createTransactionWithTimestamp()

**File:** [src/services/TransactionService.ts](src/services/TransactionService.ts#L31-L55)

Helper method to support transactions with explicit `created_at` timestamps:

- Used for opening balance transactions
- Can be used for data migration scenarios
- Supports manual timestamp control

### Data Flow

#### Before (Broken)

```
useCustomersWithAccounts.createCustomerWithAccounts(
    customer: {...},
    { initialBalance: 1000 }
)
    ↓
AccountService.createAccount({
    current_balance: 1000  ← Direct balance set
})
    ↓
Result:
  • accounts table: current_balance = 1000
  • transactions table: EMPTY ❌
  • Ledger: No opening entry ❌
```

#### After (Fixed)

```
useCustomersWithAccounts.createCustomerWithAccounts(
    customer: {...},
    { initialBalance: 1000 }
)
    ↓
AccountService.createAccountWithOpeningBalance(
    account: { current_balance: 0 },
    initialBalance: 1000
)
    ↓
SQLite Transaction:
    1. INSERT into accounts: current_balance = 0
    2. INSERT into transactions: DEBIT 1000, description="Opening Balance"
    3. Trigger updates account: current_balance = 0 + 1000 = 1000 ✓
    ↓
Result:
  • accounts table: current_balance = 1000 ✓
  • transactions table: Opening Balance DEBIT transaction ✓
  • Ledger: Complete from creation ✓
```

### Opening Balance Transaction Properties

| Property    | Value             | Purpose                                   |
| ----------- | ----------------- | ----------------------------------------- |
| type        | DEBIT (0)         | Increases balance (customer starts owing) |
| amount      | initialBalance    | The opening balance amount                |
| description | "Opening Balance" | Clear identification in ledger            |
| reference   | "INIT"            | Easy filtering for initial balances       |
| created_at  | Current timestamp | Can be set explicitly if needed           |

### Edge Cases Handled

1. **initialBalance = 0**
    - Creates account normally (no transaction needed)
    - Faster, simpler code path

2. **initialBalance < 0**
    - Creates account with 0 balance
    - User must add CREDIT transaction manually for negative opening balance

3. **Negative opening balance (customer overpaid)**
    - Not supported via initialBalance parameter
    - Must be handled as a separate CREDIT transaction if needed

4. **Large initial balances**
    - Stored as integer (cents) like all amounts
    - No precision loss

5. **Concurrent operations**
    - SQLite transaction ensures atomicity
    - Both operations complete or both rollback

## Testing

Created [test-opening-balance.ts](test-opening-balance.ts) with comprehensive tests:

- ✓ Account without initial balance (no transaction)
- ✓ Account with initial balance (has matching transaction)
- ✓ Account with zero initial balance (no transaction)
- ✓ Opening balance transaction properties
- ✓ Ledger audit trail

## Verification Checklist

After implementation:

- [x] Account created with initial balance has matching DEBIT transaction
- [x] Opening balance transaction has correct properties (description, reference, type)
- [x] Account balance calculated correctly from transaction
- [x] Ledger includes opening balance in audit trail
- [x] Database trigger fires and updates balance correctly
- [x] SQLite transaction ensures atomicity (both operations complete together)
- [x] Edge cases handled (zero balance, no balance, etc.)

## Migration Considerations

### For Existing Data

Existing customers/accounts with initial balances:

- **Old data remains unchanged** — No automatic migration
- **New customers** will use the correct approach
- **Optional:** Could create a data migration script to generate opening balance transactions for existing accounts

### Migration Script (Optional)

If needed to fix existing data:

```sql
-- Find accounts with no transactions but non-zero balance
SELECT a.id, a.customer_id, a.current_balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
WHERE a.current_balance != 0
AND t.id IS NULL;

-- For each: Create opening balance transaction
-- WARNING: This will change balances via trigger
```

## Performance Impact

- **Minimal:** Two operations in a single transaction vs. one operation
- **Atomicity benefit:** Prevents partial updates in edge cases
- **No query performance impact** (still O(1) operations)

## Backward Compatibility

✓ **Fully compatible:**

- Existing code calling `createAccount()` still works (no changes)
- Only new `createAccountWithOpeningBalance()` method is added
- Hook automatically routes to appropriate method based on initialBalance

## Related Fixes

This fix complements Issue #1 (Financial Sign Logic):

- Issue #1: Fixed DEBIT/CREDIT trigger logic (which direction increases balance)
- Issue #2: Fixed opening balance bypass (ensures transaction exists)
- Together: Complete consistency between ledger and balances
