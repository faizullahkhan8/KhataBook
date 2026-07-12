import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useLanguage, useTheme } from "../store";

interface TermsSection {
    title: string;
    paragraphs?: string[];
    bullets?: string[];
    privacyLink?: boolean;
    contact?: boolean;
}

const EFFECTIVE_DATE = "July 13, 2026";
const URDU_EFFECTIVE_DATE = "13 جولائی 2026";
const CONTACT_EMAIL = "faizullahofficial0@gmail.com";

const ENGLISH_SECTIONS: TermsSection[] = [
    {
        title: "1. Acceptance of These Terms",
        paragraphs: [
            "These Terms of Use govern your access to and use of the KhataBook mobile application. KhataBook is a local-first credit, customer-account, and ledger management tool developed by Faiz Ullah Khan.",
            "By installing, accessing, or using KhataBook, you agree to these Terms and the Privacy Policy. If you do not agree, do not use the app and remove it from your device.",
        ],
    },
    {
        title: "2. Eligibility and Authority",
        paragraphs: [
            "You must be legally capable of entering into these Terms. If you use KhataBook for a business, organization, or another person, you confirm that you have authority to act for them and that they accept these Terms.",
        ],
    },
    {
        title: "3. License to Use KhataBook",
        paragraphs: [
            "Subject to these Terms, you receive a limited, personal, non-exclusive, non-transferable, revocable license to install and use KhataBook for lawful business and recordkeeping purposes.",
            "The app is licensed, not sold. No ownership rights in KhataBook, its design, code, branding, or other protected material are transferred to you.",
        ],
    },
    {
        title: "4. Intended Use and No Professional Advice",
        paragraphs: [
            "KhataBook helps you record and review customer accounts, balances, transactions, payments, reports, and messages. It is a recordkeeping aid and does not replace professional accounting, financial, tax, legal, compliance, or debt-collection advice.",
            "Calculations and reports depend on the information you enter and may contain mistakes or omissions. You must independently verify important records and decisions.",
        ],
    },
    {
        title: "5. Your Records and Responsibilities",
        bullets: [
            "Enter accurate, lawful, and appropriately authorized information.",
            "Review balances, transactions, messages, reports, and calculations before relying on or sharing them.",
            "Obtain any consent or legal authority required to store and use customer names, phone numbers, CNICs, photos, and other personal information.",
            "Follow applicable privacy, consumer-protection, accounting, tax, lending, debt-collection, communications, and recordkeeping laws.",
            "Secure your device, restrict unauthorized access, and maintain any backups you require.",
            "Preserve records that your business or applicable law requires you to retain.",
        ],
    },
    {
        title: "6. Local Data and Cloud Backup",
        paragraphs: [
            "The current version stores core ledger, store, and customer records locally on your device. You may optionally use your Google Drive account to securely backup and restore your database. This cloud backup relies on a third-party service (Google), and you are responsible for maintaining access to and securing your Google account.",
            "The developer does not provide developer-controlled cloud backup and is not responsible for data lost due to device failure, lost Google account access, or accidental deletion of records or backups. Clearing app storage, deleting records, or uninstalling the app may permanently remove information if not backed up.",
            "The Privacy Policy explains KhataBook's information-handling practices and forms part of these Terms.",
        ],
        privacyLink: true,
    },
    {
        title: "7. Messages and Third-Party Services",
        paragraphs: [
            "KhataBook may prepare recipient details and message text, then open your device's SMS composer. You decide whether to send each message. The app cannot guarantee or confirm delivery.",
            "Your use of mobile networks, messaging apps, email services, app stores, operating-system features, or other third-party services is governed by their own terms, fees, availability, and privacy practices. KhataBook is not responsible for those services.",
        ],
    },
    {
        title: "8. Prohibited Use",
        paragraphs: ["You must not use KhataBook to:"],
        bullets: [
            "Break any law, violate another person's rights, or facilitate fraud, harassment, threats, discrimination, or unlawful debt collection.",
            "Store or use personal information without an appropriate lawful basis or required consent.",
            "Send spam, deceptive, abusive, or unauthorized communications.",
            "Introduce malicious code, interfere with the app, bypass security controls, or attempt unauthorized access.",
            "Copy, sell, sublicense, reverse engineer, decompile, or commercially exploit the app except where applicable law expressly permits it.",
            "Misrepresent KhataBook, the developer, or your relationship with either.",
        ],
    },
    {
        title: "9. Intellectual Property",
        paragraphs: [
            "KhataBook and its original code, visual design, branding, text, and features are owned by or licensed to the developer and are protected by applicable intellectual-property laws.",
            "You retain responsibility for and any rights you have in the business records and content you enter. You grant no ownership of your locally stored records to the developer merely by using the app.",
        ],
    },
    {
        title: "10. Updates, Changes, and Availability",
        paragraphs: [
            "KhataBook may be updated, changed, suspended, or discontinued to improve features, address security or legal requirements, or for operational reasons. Features may differ by device, operating system, region, or app version.",
            "Updates may change compatibility or require you to accept revised Terms. The developer does not guarantee that every feature will always be available or that older versions will remain supported.",
        ],
    },
    {
        title: "11. Disclaimer of Warranties",
        paragraphs: [
            "To the fullest extent permitted by law, KhataBook is provided on an \"as is\" and \"as available\" basis. The developer does not guarantee that the app will always be uninterrupted, error-free, secure, accurate, compatible, or suitable for every business purpose.",
            "Nothing in these Terms excludes warranties or rights that cannot lawfully be excluded under applicable consumer law.",
        ],
    },
    {
        title: "12. Limitation of Liability",
        paragraphs: [
            "To the fullest extent permitted by law, the developer will not be liable for indirect, incidental, special, consequential, or punitive losses, or for lost profits, lost business, lost data, incorrect records, missed payments, failed messages, or decisions made using the app.",
            "Where liability cannot legally be excluded, it will be limited to the minimum extent permitted by applicable law. These limitations do not apply where the law does not allow them.",
        ],
    },
    {
        title: "13. Indemnity",
        paragraphs: [
            "To the extent permitted by law, you agree to be responsible for claims, losses, or reasonable costs arising from your unlawful use of KhataBook, your violation of these Terms, or your infringement of another person's rights. This does not require you to compensate the developer for losses caused by the developer's own unlawful conduct.",
        ],
    },
    {
        title: "14. Termination",
        paragraphs: [
            "You may stop using KhataBook at any time by uninstalling it. Your license to use the app ends if you materially violate these Terms. Provisions that by their nature should continue, including intellectual property, disclaimers, liability limits, and dispute terms, survive termination.",
        ],
    },
    {
        title: "15. Governing Law and Disputes",
        paragraphs: [
            "These Terms are governed by the applicable laws of Pakistan, without limiting any mandatory rights you may have under another applicable law.",
            "Before starting formal proceedings, you and the developer should attempt in good faith to resolve a dispute by email. If it cannot be resolved, it may be brought before a court with lawful jurisdiction in Pakistan.",
        ],
    },
    {
        title: "16. General Terms",
        paragraphs: [
            "If any provision is found unenforceable, the remaining provisions continue in effect. A failure to enforce a provision is not a waiver. You may not transfer your rights under these Terms without permission; the developer may transfer these Terms as part of a lawful business transfer or reorganization.",
            "These Terms and the Privacy Policy form the complete agreement about your use of the current app and replace prior understandings on that subject.",
        ],
    },
    {
        title: "17. Changes to These Terms",
        paragraphs: [
            "These Terms may be updated when KhataBook's features, operations, or legal obligations change. Revised Terms will show a new effective date. Continued use after revised Terms become effective means you accept them, where permitted by law.",
        ],
    },
    {
        title: "18. Contact",
        paragraphs: [
            "For questions about these Terms or KhataBook, contact the developer:",
        ],
        contact: true,
    },
];

const URDU_SECTIONS: TermsSection[] = [
    {
        title: "1. شرائط کی منظوری",
        paragraphs: [
            "یہ استعمال کی شرائط KhataBook موبائل ایپ تک آپ کی رسائی اور اس کے استعمال پر لاگو ہوتی ہیں۔ KhataBook ایک مقامی طور پر کام کرنے والی ادھار، گاہک اکاؤنٹ اور کھاتہ مینجمنٹ ایپ ہے جسے فیض اللہ خان نے تیار کیا ہے۔",
            "KhataBook انسٹال یا استعمال کرنے سے آپ ان شرائط اور رازداری پالیسی سے اتفاق کرتے ہیں۔ اگر آپ متفق نہیں تو ایپ استعمال نہ کریں اور اسے اپنے آلے سے حذف کر دیں۔",
        ],
    },
    {
        title: "2. اہلیت اور اختیار",
        paragraphs: [
            "ان شرائط کو قبول کرنے کے لیے آپ کا قانونی طور پر اہل ہونا ضروری ہے۔ اگر آپ KhataBook کسی کاروبار، ادارے یا دوسرے شخص کی طرف سے استعمال کرتے ہیں تو آپ تصدیق کرتے ہیں کہ آپ کو ان کی نمائندگی کا اختیار حاصل ہے اور وہ بھی ان شرائط کے پابند ہوں گے۔",
        ],
    },
    {
        title: "3. ایپ استعمال کرنے کی اجازت",
        paragraphs: [
            "ان شرائط کی پابندی کے ساتھ آپ کو KhataBook قانونی کاروباری اور ریکارڈ رکھنے کے مقاصد کے لیے استعمال کرنے کی محدود، ذاتی، غیر خصوصی، ناقابل منتقلی اور منسوخ کی جا سکنے والی اجازت دی جاتی ہے۔",
            "ایپ آپ کو فروخت نہیں کی جاتی بلکہ استعمال کی اجازت دی جاتی ہے۔ KhataBook، اس کے ڈیزائن، کوڈ، نام یا محفوظ مواد کی ملکیت آپ کو منتقل نہیں ہوتی۔",
        ],
    },
    {
        title: "4. ایپ کا مقصد اور پیشہ ورانہ مشورہ",
        paragraphs: [
            "KhataBook گاہک اکاؤنٹس، بیلنس، لین دین، ادائیگی، رپورٹس اور پیغامات درج اور دیکھنے میں مدد کرتی ہے۔ یہ صرف ریکارڈ رکھنے کا ذریعہ ہے اور پیشہ ورانہ حساب کتاب، مالی، ٹیکس، قانونی، ضابطہ جاتی یا قرض وصولی کے مشورے کا متبادل نہیں۔",
            "حسابات اور رپورٹس آپ کی درج کردہ معلومات پر منحصر ہوتے ہیں اور ان میں غلطی یا کمی ہو سکتی ہے۔ اہم ریکارڈ اور فیصلوں کی آزادانہ تصدیق کرنا آپ کی ذمہ داری ہے۔",
        ],
    },
    {
        title: "5. آپ کے ریکارڈ اور ذمہ داریاں",
        bullets: [
            "درست، قانونی اور مناسب اجازت کے ساتھ حاصل کی گئی معلومات درج کریں۔",
            "بیلنس، لین دین، پیغام، رپورٹ یا حساب پر انحصار یا اسے شیئر کرنے سے پہلے خود جانچ کریں۔",
            "گاہک کا نام، فون نمبر، شناختی کارڈ نمبر، تصویر یا دوسری ذاتی معلومات محفوظ کرنے سے پہلے ضروری رضامندی یا قانونی اختیار حاصل کریں۔",
            "رازداری، صارف تحفظ، حساب کتاب، ٹیکس، قرض، وصولی، رابطہ اور ریکارڈ رکھنے کے قابل اطلاق قوانین پر عمل کریں۔",
            "اپنے آلے کو محفوظ رکھیں، غیر مجاز رسائی روکیں اور ضروری بیک اپ خود رکھیں۔",
            "وہ ریکارڈ محفوظ رکھیں جسے کاروباری ضرورت یا قانون کے تحت رکھنا لازم ہو۔",
        ],
    },
    {
        title: "6. مقامی ڈیٹا اور کلاؤڈ بیک اپ",
        paragraphs: [
            "موجودہ ورژن بنیادی گاہک اور کھاتہ ریکارڈ آپ کے اپنے آلے پر محفوظ کرتا ہے۔ آپ اپنے ڈیٹا کو محفوظ رکھنے اور بحال کرنے کے لیے اختیاری طور پر اپنے گوگل ڈرائیو (Google Drive) اکاؤنٹ کا استعمال کر سکتے ہیں۔ یہ کلاؤڈ بیک اپ گوگل کی سروس پر منحصر ہے، اور اپنے گوگل اکاؤنٹ تک رسائی اور اسے محفوظ رکھنا آپ کی ذمہ داری ہے۔",
            "ڈویلپر کے زیر انتظام کوئی کلاؤڈ بیک اپ فراہم نہیں کیا جاتا، اور آلے کے خراب ہونے، گوگل اکاؤنٹ تک رسائی کھونے، یا ریکارڈز/بیک اپ کے حادثاتی طور پر حذف ہونے کی صورت میں ڈیٹا کے ضیاع کا ذمہ دار ڈویلپر نہیں ہوگا۔ بیک اپ کے بغیر ایپ کا ڈیٹا صاف کرنے، ریکارڈ حذف کرنے یا ایپ اَن انسٹال کرنے سے معلومات مستقل طور پر ضائع ہو سکتی ہیں۔",
            "رازداری پالیسی وضاحت کرتی ہے کہ KhataBook معلومات کے ساتھ کیا معاملہ کرتی ہے اور وہ ان شرائط کا حصہ ہے۔",
        ],
        privacyLink: true,
    },
    {
        title: "7. پیغامات اور دوسری سروسز",
        paragraphs: [
            "KhataBook وصول کنندہ کا نمبر اور پیغام کا متن تیار کر کے موبائل کا SMS کمپوزر کھول سکتی ہے۔ ہر پیغام بھیجنے یا منسوخ کرنے کا فیصلہ آپ کرتے ہیں۔ ایپ پیغام پہنچنے کی ضمانت یا تصدیق نہیں کرتی۔",
            "موبائل نیٹ ورک، میسج ایپ، ای میل سروس، ایپ اسٹور، آپریٹنگ سسٹم یا کسی دوسری بیرونی سروس کے استعمال پر ان کی اپنی شرائط، فیس، دستیابی اور رازداری پالیسی لاگو ہوتی ہے۔ KhataBook ان سروسز کی ذمہ دار نہیں۔",
        ],
    },
    {
        title: "8. ممنوع استعمال",
        paragraphs: ["آپ KhataBook کو درج ذیل مقاصد کے لیے استعمال نہیں کر سکتے:"],
        bullets: [
            "قانون توڑنے، کسی کے حقوق پامال کرنے، دھوکا دہی، ہراسانی، دھمکی، امتیاز یا غیر قانونی قرض وصولی کے لیے۔",
            "ذاتی معلومات کسی قانونی بنیاد یا ضروری رضامندی کے بغیر محفوظ یا استعمال کرنے کے لیے۔",
            "غیر مطلوب، دھوکا دہی پر مبنی، توہین آمیز یا غیر مجاز پیغامات بھیجنے کے لیے۔",
            "نقصان دہ کوڈ شامل کرنے، ایپ میں خلل ڈالنے، حفاظتی اقدامات توڑنے یا غیر مجاز رسائی حاصل کرنے کے لیے۔",
            "ایپ کو نقل، فروخت، ذیلی لائسنس، ریورس انجینئر، ڈی کمپائل یا تجارتی طور پر استعمال کرنے کے لیے، سوائے اس حد تک جہاں قانون واضح اجازت دے۔",
            "KhataBook، ڈویلپر یا ان کے ساتھ اپنے تعلق کے بارے میں غلط تاثر دینے کے لیے۔",
        ],
    },
    {
        title: "9. دانشورانہ ملکیت",
        paragraphs: [
            "KhataBook کا اصل کوڈ، بصری ڈیزائن، نام، متن اور سہولیات ڈویلپر کی ملکیت ہیں یا اسے ان کے استعمال کی اجازت حاصل ہے، اور یہ قابل اطلاق دانشورانہ ملکیت کے قوانین کے تحت محفوظ ہیں۔",
            "ایپ میں درج کیے گئے کاروباری ریکارڈ اور مواد کی ذمہ داری اور ان میں موجود آپ کے حقوق آپ ہی کے پاس رہتے ہیں۔ صرف ایپ استعمال کرنے سے ڈویلپر کو آپ کے مقامی ریکارڈ کی ملکیت حاصل نہیں ہوتی۔",
        ],
    },
    {
        title: "10. اپ ڈیٹ، تبدیلی اور دستیابی",
        paragraphs: [
            "سہولیات بہتر بنانے، سکیورٹی یا قانونی تقاضے پورے کرنے یا انتظامی وجوہات کی بنا پر KhataBook کو اپ ڈیٹ، تبدیل، عارضی طور پر بند یا ختم کیا جا سکتا ہے۔ سہولیات آلے، آپریٹنگ سسٹم، علاقے یا ورژن کے لحاظ سے مختلف ہو سکتی ہیں۔",
            "اپ ڈیٹ سے مطابقت بدل سکتی ہے یا نئی شرائط قبول کرنا ضروری ہو سکتا ہے۔ ڈویلپر ہر سہولت کی مستقل دستیابی یا پرانے ورژن کی مسلسل معاونت کی ضمانت نہیں دیتا۔",
        ],
    },
    {
        title: "11. ضمانت سے متعلق وضاحت",
        paragraphs: [
            "قانون کی اجازت کی زیادہ سے زیادہ حد تک KhataBook موجودہ حالت اور دستیابی کی بنیاد پر فراہم کی جاتی ہے۔ ڈویلپر ضمانت نہیں دیتا کہ ایپ ہمیشہ بلا تعطل، غلطی سے پاک، مکمل محفوظ، درست، ہر آلے کے مطابق یا ہر کاروباری مقصد کے لیے موزوں ہوگی۔",
            "ان شرائط میں کوئی بات ایسے صارف حقوق یا ضمانت کو ختم نہیں کرتی جسے قابل اطلاق قانون کے تحت ختم نہیں کیا جا سکتا۔",
        ],
    },
    {
        title: "12. ذمہ داری کی حد",
        paragraphs: [
            "قانون کی اجازت کی زیادہ سے زیادہ حد تک ڈویلپر بالواسطہ، اتفاقی، خصوصی، نتیجتاً یا تعزیری نقصان، منافع یا کاروبار کے نقصان، ڈیٹا کے ضیاع، غلط ریکارڈ، چھوٹی ہوئی ادائیگی، ناکام پیغام یا ایپ کی بنیاد پر کیے گئے فیصلے کا ذمہ دار نہیں ہوگا۔",
            "جہاں ذمہ داری کو قانونی طور پر ختم نہیں کیا جا سکتا، وہ قابل اطلاق قانون کی اجازت کی کم سے کم حد تک محدود ہوگی۔ جہاں قانون ایسی حد کی اجازت نہ دے وہاں یہ حد لاگو نہیں ہوگی۔",
        ],
    },
    {
        title: "13. خلاف ورزی سے پیدا ہونے والی ذمہ داری",
        paragraphs: [
            "قانون کی اجازت کی حد تک آپ KhataBook کے غیر قانونی استعمال، ان شرائط کی خلاف ورزی یا کسی دوسرے شخص کے حقوق پامال کرنے سے پیدا ہونے والے دعووں، نقصانات یا مناسب اخراجات کے ذمہ دار ہوں گے۔ ڈویلپر کے اپنے غیر قانونی عمل سے پیدا ہونے والے نقصان کی ذمہ داری آپ پر نہیں ہوگی۔",
        ],
    },
    {
        title: "14. استعمال کا خاتمہ",
        paragraphs: [
            "آپ کسی بھی وقت ایپ اَن انسٹال کر کے استعمال بند کر سکتے ہیں۔ اگر آپ ان شرائط کی سنگین خلاف ورزی کریں تو ایپ استعمال کرنے کی اجازت ختم ہو جاتی ہے۔ دانشورانہ ملکیت، ضمانت، ذمہ داری کی حد اور تنازع سے متعلق وہ دفعات جو اپنی نوعیت کے لحاظ سے جاری رہنی چاہئیں، استعمال ختم ہونے کے بعد بھی نافذ رہیں گی۔",
        ],
    },
    {
        title: "15. قابل اطلاق قانون اور تنازع",
        paragraphs: [
            "یہ شرائط پاکستان کے قابل اطلاق قوانین کے تحت سمجھی جائیں گی، تاہم کسی دوسرے قابل اطلاق قانون کے تحت حاصل لازمی حقوق محدود نہیں ہوں گے۔",
            "قانونی کارروائی شروع کرنے سے پہلے آپ اور ڈویلپر ای میل کے ذریعے نیک نیتی سے مسئلہ حل کرنے کی کوشش کریں گے۔ مسئلہ حل نہ ہونے پر اسے پاکستان میں قانونی اختیار رکھنے والی عدالت کے سامنے پیش کیا جا سکتا ہے۔",
        ],
    },
    {
        title: "16. عمومی شرائط",
        paragraphs: [
            "اگر کسی شق کو ناقابل نفاذ قرار دیا جائے تو باقی شرائط نافذ رہیں گی۔ کسی شق پر فوری عمل نہ کرنا اس حق سے دستبرداری نہیں۔ آپ اجازت کے بغیر ان شرائط کے تحت اپنے حقوق منتقل نہیں کر سکتے؛ ڈویلپر قانونی کاروباری منتقلی یا تنظیم نو کے حصے کے طور پر انہیں منتقل کر سکتا ہے۔",
            "یہ شرائط اور رازداری پالیسی موجودہ ایپ کے استعمال سے متعلق مکمل معاہدہ ہیں اور اسی موضوع پر سابقہ سمجھ بوجھ کی جگہ لیتی ہیں۔",
        ],
    },
    {
        title: "17. شرائط میں تبدیلی",
        paragraphs: [
            "KhataBook کی سہولیات، انتظام یا قانونی تقاضوں میں تبدیلی پر یہ شرائط اپ ڈیٹ کی جا سکتی ہیں۔ نئی شرائط پر مؤثر ہونے کی تازہ تاریخ درج ہوگی۔ قانون کی اجازت کے مطابق نئی شرائط نافذ ہونے کے بعد ایپ کا مسلسل استعمال ان کی منظوری سمجھا جائے گا۔",
        ],
    },
    {
        title: "18. رابطہ",
        paragraphs: [
            "ان شرائط یا KhataBook سے متعلق سوال کے لیے ڈویلپر سے رابطہ کریں:",
        ],
        contact: true,
    },
];

const ENGLISH_SUMMARY = [
    { icon: "checkmark-circle-outline" as const, text: "Use KhataBook only for lawful recordkeeping and business purposes." },
    { icon: "calculator-outline" as const, text: "Verify important balances, reports, and decisions independently." },
    { icon: "save-outline" as const, text: "You are responsible for your device security and preserving your local records or backups." },
    { icon: "people-outline" as const, text: "Obtain permission before storing or messaging another person's information." },
];

const URDU_SUMMARY = [
    { icon: "checkmark-circle-outline" as const, text: "KhataBook صرف قانونی کاروباری اور ریکارڈ رکھنے کے مقاصد کے لیے استعمال کریں۔" },
    { icon: "calculator-outline" as const, text: "اہم بیلنس، رپورٹ اور فیصلے کی خود تصدیق کریں۔" },
    { icon: "save-outline" as const, text: "اپنے آلے کی حفاظت اور مقامی ریکارڈ یا بیک اپ محفوظ رکھنا آپ کی ذمہ داری ہے۔" },
    { icon: "people-outline" as const, text: "کسی دوسرے شخص کی معلومات محفوظ کرنے یا اسے پیغام بھیجنے سے پہلے اجازت حاصل کریں۔" },
];

export const TermsOfUseScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { language } = useLanguage();
    const isUrdu = language === "ur";
    const sections = isUrdu ? URDU_SECTIONS : ENGLISH_SECTIONS;
    const summary = isUrdu ? URDU_SUMMARY : ENGLISH_SUMMARY;

    const openEmail = () => {
        Linking.openURL(
            `mailto:${CONTACT_EMAIL}?subject=KhataBook%20Terms%20Inquiry`,
        );
    };

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top, backgroundColor: colors.background },
            ]}
        >
            <View
                style={[
                    styles.header,
                    {
                        marginTop: Spacing.sm,
                        marginHorizontal: Spacing.md,
                        marginBottom: Spacing.sm,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.06,
                        shadowRadius: 4,
                        elevation: 2,
                    },
                ]}
            >
                <Pressable
                    onPress={() => router.back()}
                    style={[
                        styles.backButton,
                        { backgroundColor: `${colors.primary}18` },
                    ]}
                >
                    <Ionicons
                        name="chevron-back" size={20}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-large" color="primary">
                    {t("settings.termsOfUse")}
                </Typography>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + Spacing.xl },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <Card
                    style={[
                        styles.heroCard,
                        { backgroundColor: `${colors.primary}10` },
                    ]}
                >
                    <View
                        style={[
                            styles.heroIcon,
                            { backgroundColor: `${colors.primary}20` },
                        ]}
                    >
                        <Ionicons
                            name="document-text"
                            size={32}
                            color={colors.primary}
                        />
                    </View>
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={styles.centerText}
                    >
                        {isUrdu
                            ? "KhataBook ذمہ داری سے استعمال کریں"
                            : "Use KhataBook responsibly"}
                    </Typography>
                    <Typography
                        variant="body-medium"
                        color="secondary"
                        style={styles.heroDescription}
                    >
                        {isUrdu
                            ? "یہ شرائط ایپ کے قانونی اور ذمہ دارانہ استعمال، آپ کے ریکارڈ کی ذمہ داری اور اہم قانونی حدود واضح کرتی ہیں۔"
                            : "These Terms explain lawful and responsible app use, your responsibility for records, and important legal limitations."}
                    </Typography>
                    <Typography
                        variant="small-large"
                        color="muted"
                        style={styles.effectiveDate}
                    >
                        {isUrdu ? "مؤثر ہونے کی تاریخ" : "Effective date"}:{" "}
                        {isUrdu ? URDU_EFFECTIVE_DATE : EFFECTIVE_DATE}
                    </Typography>
                </Card>

                <Card style={styles.card}>
                    <Typography
                        variant="heading-small"
                        color="primary"
                        style={[
                            styles.sectionHeading,
                        ]}
                    >
                        {isUrdu ? "اہم باتیں ایک نظر میں" : "Key terms at a glance"}
                    </Typography>
                    {summary.map((item, index) => {
                        const itemColor = [colors.primary, colors.success, colors.warning, colors.danger][index % 4];
                        return (
                            <SummaryRow
                                key={item.text}
                                icon={item.icon}
                                text={item.text}
                                color={itemColor}
                            />
                        );
                    })}
                </Card>

                {sections.map((section, index) => {
                    const sectionColor = [colors.primary, colors.success, colors.warning, colors.danger][index % 4];
                    return (
                    <Card key={section.title} style={styles.card}>
                        <Typography
                            variant="heading-small"
                            style={[
                                styles.sectionHeading,
                                { color: sectionColor }
                            ]}
                        >
                            {section.title}
                        </Typography>
                        {section.paragraphs?.map((paragraph) => (
                            <Typography
                                key={paragraph}
                                variant="body-medium"
                                color="secondary"
                                style={[
                                    styles.paragraph,
                                ]}
                            >
                                {paragraph}
                            </Typography>
                        ))}
                        {section.bullets?.map((bullet) => (
                            <View
                                key={bullet}
                                style={[
                                    styles.bulletRow,
                                ]}
                            >
                                <View
                                    style={[
                                        styles.bullet,
                                        { backgroundColor: sectionColor },
                                        isUrdu && styles.bulletRtl,
                                    ]}
                                />
                                <Typography
                                    variant="body-medium"
                                    color="secondary"
                                    style={[
                                        styles.bulletText,
                                    ]}
                                >
                                    {bullet}
                                </Typography>
                            </View>
                        ))}
                        {section.privacyLink && (
                            <Pressable
                                onPress={() => router.push("/privacy-policy")}
                                style={[
                                    styles.actionButton,
                                    { borderColor: colors.primary },
                                    false && [
                                        styles.rowReverse,
                                        styles.actionButtonRtl,
                                    ],
                                ]}
                            >
                                <Ionicons
                                    name="shield-checkmark-outline"
                                    size={18}
                                    color={colors.primary}
                                />
                                <Typography variant="body-medium" color="primary">
                                    {isUrdu
                                        ? "رازداری پالیسی پڑھیں"
                                        : "Read the Privacy Policy"}
                                </Typography>
                            </Pressable>
                        )}
                        {section.contact && (
                            <Pressable
                                onPress={openEmail}
                                style={[
                                    styles.contactButton,
                                    { backgroundColor: colors.primary },
                                    false && [
                                        styles.rowReverse,
                                        styles.actionButtonRtl,
                                    ],
                                ]}
                            >
                                <Ionicons name="mail" size={18} color="#FFFFFF" />
                                <Typography
                                    variant="body-medium"
                                    style={styles.contactText}
                                >
                                    {CONTACT_EMAIL}
                                </Typography>
                            </Pressable>
                        )}
                    </Card>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const SummaryRow: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
    color: string;
}> = ({ icon, text, color }) => {
    return (
        <View style={[styles.summaryRow]}>
            <View
                style={[
                    styles.summaryIcon,
                    { backgroundColor: `${color}15` },
                ]}
            >
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Typography
                variant="body-medium"
                color="secondary"
                style={[styles.summaryText]}
            >
                {text}
            </Typography>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: Spacing.sm,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
    },
    heroCard: {
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    heroIcon: {
        width: 60,
        height: 60,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.md,
    },
    centerText: {
        textAlign: "center",
    },
    heroDescription: {
        textAlign: "center",
        lineHeight: 22,
        marginTop: Spacing.sm,
    },
    effectiveDate: {
        marginTop: Spacing.md,
        textAlign: "center",
    },
    card: {
        marginBottom: Spacing.md,
    },
    sectionHeading: {
        marginBottom: Spacing.md,
    },
    summaryRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    summaryIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: Spacing.md,
    },
    summaryIconRtl: {
        marginRight: 0,
        marginLeft: Spacing.md,
    },
    summaryText: {
        flex: 1,
        lineHeight: 21,
    },
    paragraph: {
        lineHeight: 22,
        marginBottom: Spacing.md,
    },
    bulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: Spacing.sm,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 8,
        marginRight: Spacing.md,
    },
    bulletRtl: {
        marginRight: 0,
        marginLeft: Spacing.md,
    },
    bulletText: {
        flex: 1,
        lineHeight: 22,
    },
    rtlText: {
        textAlign: "right",
        writingDirection: "rtl",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
    },
    actionButtonRtl: {
        alignSelf: "flex-end",
    },
    contactButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
    },
    contactText: {
        color: "#FFFFFF",
    },
});
