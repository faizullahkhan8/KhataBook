const fs = require('fs');

const file = 'g:/Android Development/KhataBook/src/screens/PasscodeScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. imports
content = content.replace('    OptionModal,\r\n', '');
content = content.replace('AutoLockDelay, PasscodeLength, usePasscode', 'PasscodeLength, usePasscode');

// 2. AUTO_LOCK_OPTIONS block
content = content.replace(/const AUTO_LOCK_OPTIONS = \[\r?\n(?:.*\r?\n){27}\];\r?\n/, '');

// 3. autoLockDelay and setAutoLockDelay
content = content.replace(/[ \t]*autoLockDelay,\r?\n/g, '');
content = content.replace(/[ \t]*setAutoLockDelay,\r?\n/g, '');

// 4. showAutoLockModal
content = content.replace(/[ \t]*const \[showAutoLockModal, setShowAutoLockModal\] = useState\(false\);\r?\n/g, '');

// 5. getAutoLockLabel and autoLockOptionsWithLabels
content = content.replace(/[ \t]*const getAutoLockLabel = \(delay: AutoLockDelay\) =>\r?\n(?:.*\r?\n){5}/g, '');
content = content.replace(/[ \t]*const autoLockOptionsWithLabels = AUTO_LOCK_OPTIONS\.map\(\(opt\) => \(\{\r?\n(?:.*\r?\n){3}\}\)\);\r?\n/g, '');

// 6. autoLockSection
const autoLockSectionRegex = /[ \t]*<View style=\{styles\.autoLockSection\}>\r?\n(?:.*\r?\n){32}[ \t]*<\/View>\r?\n/g;
content = content.replace(autoLockSectionRegex, '');

// 7. OptionModal JSX
const optionModalRegex = /[ \t]*<OptionModal\r?\n(?:.*\r?\n){9}[ \t]*\/>\r?\n/g;
content = content.replace(optionModalRegex, '');

fs.writeFileSync(file, content);
console.log('Removed delay option from PasscodeScreen.tsx');
