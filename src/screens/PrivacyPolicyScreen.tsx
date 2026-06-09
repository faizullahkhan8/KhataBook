import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Card, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useLanguage, useTheme } from "../store";

interface PolicySection {
    title: string;
    paragraphs?: string[];
    bullets?: string[];
    contact?: boolean;
}

const EFFECTIVE_DATE = "June 9, 2026";
const URDU_EFFECTIVE_DATE = "9 جون 2026";
const CONTACT_EMAIL = "faizullahofficial0@gmail.com";

const POLICY_SECTIONS: PolicySection[] = [
    {
        title: "1. Scope",
        paragraphs: [
            "This Privacy Policy explains how KhataBook handles information when you use the mobile application. KhataBook is a local-first credit and ledger management tool developed by Faiz Ullah Khan.",
            "By using KhataBook, you acknowledge the practices described in this policy. If you do not agree, please stop using the app and remove it from your device.",
        ],
    },
    {
        title: "2. Information You Provide",
        paragraphs: [
            "KhataBook processes information that you choose to enter so the app can provide its ledger-management features.",
        ],
        bullets: [
            "Customer details, including name, phone number, CNIC, email address, address, notes, and an optional photo.",
            "Account details, including account number, account type, credit limit, balance, and account status.",
            "Transaction and payment details, including amounts, descriptions, references, payment methods, notes, and dates.",
            "Message templates and message text that you create for customer communications.",
            "App preferences, such as your selected language.",
        ],
    },
    {
        title: "3. How Information Is Used",
        bullets: [
            "Create and manage customer profiles, accounts, balances, transactions, payments, and ledgers.",
            "Calculate financial summaries, reports, and account insights on your device.",
            "Prepare customer SMS messages and open your device's messaging composer.",
            "Remember app preferences and maintain the app's functionality.",
            "Diagnose errors and improve the app when you voluntarily contact the developer for support.",
        ],
    },
    {
        title: "4. Local Storage and Data Transfers",
        paragraphs: [
            "KhataBook is designed as a local-first app. Business and customer records are stored in a SQLite database on your device. Your language preference is also stored locally.",
            "The current version does not operate a developer-controlled server, automatically upload your ledger data, provide cloud backup, use advertising networks, or use analytics trackers.",
            "Information leaves the app only when you initiate an action, such as opening the SMS composer, choosing a photo through the operating system, or contacting the developer. Those actions are then subject to the privacy practices of your device, mobile carrier, messaging app, email provider, or other service you choose.",
        ],
    },
    {
        title: "5. Device Permissions",
        paragraphs: [
            "KhataBook requests permissions only when you use a feature that needs them. You may deny or revoke permissions in your device settings, although the related feature may stop working.",
        ],
        bullets: [
            "Camera: used only when you choose to take a customer photo.",
            "Photos and media library: used only when you choose an existing customer photo.",
            "Messaging app: used to prepare recipient phone numbers and message text in your device's SMS composer. KhataBook does not request direct SMS permission and cannot confirm delivery.",
        ],
    },
    {
        title: "6. Sharing and Sale of Information",
        paragraphs: [
            "KhataBook does not sell, rent, or trade your personal information or your customers' information. The developer does not receive your locally stored ledger data through normal use of the current app.",
            "Information may be disclosed only when you deliberately share it through another app or service, when you provide it in a support request, or when disclosure is required by applicable law.",
        ],
    },
    {
        title: "7. Data Retention and Deletion",
        paragraphs: [
            "Records remain on your device until you delete them in the app, clear the app's storage, or uninstall the app. Deleting a customer may also delete related accounts and transactions.",
            "Because the current version has no developer-controlled cloud account or server backup, the developer generally cannot retrieve, restore, or remotely delete your local data. Before uninstalling or clearing app storage, preserve any records you are legally or operationally required to keep.",
        ],
    },
    {
        title: "8. Security",
        paragraphs: [
            "KhataBook uses the storage and security protections provided by your device and operating system. You are responsible for securing your device, controlling who can access the app, and maintaining appropriate backups.",
            "No storage or security method is completely secure. Avoid entering information that is not needed for your business purpose, and follow applicable privacy, accounting, and recordkeeping laws when storing customer information.",
        ],
    },
    {
        title: "9. Your Responsibilities and Choices",
        bullets: [
            "Review, update, or delete records using the app's available controls.",
            "Control camera and photo-library permissions through your device settings.",
            "Choose whether to send or discard any SMS after the app opens the messaging composer.",
            "Obtain any consent required before storing or using another person's information.",
            "Contact the developer with privacy questions or requests concerning information you voluntarily submitted for support.",
        ],
    },
    {
        title: "10. Children's Privacy",
        paragraphs: [
            "KhataBook is intended for business and ledger management and is not directed to children under 13. The developer does not knowingly collect children's personal information through a developer-controlled service. Do not use the app to store a child's information unless you have a lawful reason and any required permission.",
        ],
    },
    {
        title: "11. Changes to This Policy",
        paragraphs: [
            "This policy may be updated when the app's features, data practices, or legal obligations change. The revised policy will show a new effective date. Material changes may also be communicated within the app or through the app's distribution page.",
        ],
    },
    {
        title: "12. Contact",
        paragraphs: [
            "For privacy questions, concerns, or requests, contact the developer:",
        ],
        contact: true,
    },
];

const URDU_POLICY_SECTIONS: PolicySection[] = [
    {
        title: "1. اس پالیسی کا دائرہ",
        paragraphs: [
            "یہ رازداری پالیسی بتاتی ہے کہ KhataBook موبائل ایپ استعمال کرتے وقت آپ اور آپ کے گاہکوں کی معلومات کے ساتھ کیا معاملہ کیا جاتا ہے۔ KhataBook ایک مقامی طور پر کام کرنے والی کاروباری کھاتہ اور ادھار مینجمنٹ ایپ ہے جسے فیض اللہ خان نے تیار کیا ہے۔",
            "ایپ استعمال کرنے کا مطلب ہے کہ آپ اس پالیسی میں بیان کردہ طریقہ کار سے آگاہ ہیں۔ اگر آپ اس سے متفق نہیں تو ایپ کا استعمال بند کر کے اسے اپنے آلے سے حذف کر سکتے ہیں۔",
        ],
    },
    {
        title: "2. وہ معلومات جو آپ درج کرتے ہیں",
        paragraphs: [
            "KhataBook صرف وہ کاروباری معلومات استعمال کرتی ہے جو آپ اپنی مرضی سے ایپ میں درج کرتے ہیں تاکہ کھاتہ داری کی سہولیات فراہم کی جا سکیں۔",
        ],
        bullets: [
            "گاہک کا نام، فون نمبر، شناختی کارڈ نمبر، ای میل، پتہ، نوٹس اور اختیاری تصویر۔",
            "اکاؤنٹ نمبر، اکاؤنٹ کی قسم، کریڈٹ حد، موجودہ بیلنس اور اکاؤنٹ کی حالت۔",
            "لین دین اور ادائیگی کی رقم، تفصیل، حوالہ، ادائیگی کا طریقہ، نوٹس اور تاریخ۔",
            "گاہکوں کو بھیجنے کے لیے آپ کے بنائے ہوئے پیغام کے نمونے اور متن۔",
            "ایپ کی ترجیحات، مثلاً منتخب زبان۔",
        ],
    },
    {
        title: "3. معلومات کیوں استعمال کی جاتی ہیں",
        bullets: [
            "گاہکوں کے پروفائل، اکاؤنٹس، بیلنس، لین دین، ادائیگیاں اور کھاتے بنانے اور سنبھالنے کے لیے۔",
            "آپ کے آلے پر مالی خلاصے، رپورٹس اور کاروباری جائزے تیار کرنے کے لیے۔",
            "گاہک کے لیے SMS تیار کر کے آپ کے موبائل کی میسج ایپ کھولنے کے لیے۔",
            "آپ کی منتخب ترجیحات یاد رکھنے اور ایپ کو درست طور پر چلانے کے لیے۔",
            "جب آپ خود معاونت کے لیے رابطہ کریں تو مسئلہ سمجھنے اور ایپ بہتر بنانے کے لیے۔",
        ],
    },
    {
        title: "4. معلومات کہاں محفوظ رہتی ہیں",
        paragraphs: [
            "KhataBook کو اس طرح بنایا گیا ہے کہ بنیادی کاروباری ریکارڈ آپ ہی کے موبائل یا آلے پر رہیں۔ گاہک، اکاؤنٹ، لین دین، ادائیگی اور پیغام کے نمونے مقامی SQLite ڈیٹابیس میں محفوظ ہوتے ہیں۔ زبان کی ترجیح بھی آلے پر محفوظ رہتی ہے۔",
            "موجودہ ورژن میں ڈویلپر کے زیر انتظام سرور، خودکار کلاؤڈ بیک اپ، اشتہارات یا تجزیاتی ٹریکر موجود نہیں ہیں۔ ایپ عام استعمال کے دوران آپ کا کھاتہ ڈیٹا ڈویلپر کو نہیں بھیجتی۔",
            "معلومات صرف اس وقت کسی دوسری سروس تک جاتی ہیں جب آپ خود کوئی کارروائی کریں، مثلاً SMS کمپوزر کھولیں، تصویر منتخب کریں یا ڈویلپر سے رابطہ کریں۔ ایسی صورت میں متعلقہ موبائل نظام، نیٹ ورک، میسج ایپ، ای میل سروس یا دوسری منتخب سروس کی اپنی رازداری شرائط لاگو ہوں گی۔",
        ],
    },
    {
        title: "5. موبائل کی اجازتیں",
        paragraphs: [
            "ایپ کسی اجازت کی درخواست صرف اسی وقت کرتی ہے جب آپ متعلقہ سہولت استعمال کرنا چاہیں۔ آپ موبائل کی ترتیبات سے اجازت مسترد یا واپس لے سکتے ہیں، لیکن اس سے وہ سہولت کام نہیں کرے گی۔",
        ],
        bullets: [
            "کیمرہ: صرف اس وقت استعمال ہوتا ہے جب آپ گاہک کی نئی تصویر لینا چاہیں۔",
            "تصاویر یا میڈیا لائبریری: صرف اس وقت استعمال ہوتی ہے جب آپ گاہک کے لیے پہلے سے موجود تصویر منتخب کریں۔",
            "میسج ایپ: فون نمبر اور تیار شدہ متن آپ کے SMS کمپوزر میں کھولنے کے لیے استعمال ہوتی ہے۔ KhataBook براہ راست SMS بھیجنے کی اجازت نہیں مانگتی اور پیغام پہنچنے کی تصدیق نہیں کر سکتی۔",
        ],
    },
    {
        title: "6. معلومات کی فروخت یا شراکت",
        paragraphs: [
            "KhataBook آپ یا آپ کے گاہکوں کی معلومات فروخت، کرائے پر یا کاروباری تبادلے میں نہیں دیتی۔ موجودہ ایپ کے عام استعمال میں ڈویلپر کو آپ کے آلے پر محفوظ کھاتہ ریکارڈ تک رسائی حاصل نہیں ہوتی۔",
            "معلومات صرف تب دوسری جگہ جا سکتی ہیں جب آپ خود کسی ایپ یا سروس کے ذریعے شیئر کریں، معاونت کی درخواست میں فراہم کریں، یا قابل اطلاق قانون کے تحت دینا ضروری ہو۔",
        ],
    },
    {
        title: "7. ریکارڈ کتنی مدت محفوظ رہتا ہے",
        paragraphs: [
            "آپ کا ریکارڈ اس وقت تک آلے پر رہتا ہے جب تک آپ اسے ایپ سے حذف نہ کریں، ایپ کا ڈیٹا صاف نہ کریں یا ایپ اَن انسٹال نہ کریں۔ گاہک حذف کرنے سے اس سے منسلک اکاؤنٹس اور لین دین بھی حذف ہو سکتے ہیں۔",
            "چونکہ موجودہ ورژن میں ڈویلپر کے زیر انتظام اکاؤنٹ یا کلاؤڈ بیک اپ موجود نہیں، اس لیے ڈویلپر عموماً آپ کا مقامی ڈیٹا واپس حاصل، بحال یا دور سے حذف نہیں کر سکتا۔ ایپ اَن انسٹال کرنے یا ڈیٹا صاف کرنے سے پہلے ضروری کاروباری اور قانونی ریکارڈ محفوظ کر لیں۔",
        ],
    },
    {
        title: "8. معلومات کا تحفظ",
        paragraphs: [
            "KhataBook آپ کے موبائل اور آپریٹنگ سسٹم کی فراہم کردہ حفاظتی سہولیات استعمال کرتی ہے۔ اپنے موبائل کو لاک رکھنا، غیر مجاز افراد کی رسائی روکنا اور ضروری بیک اپ رکھنا آپ کی ذمہ داری ہے۔",
            "کوئی بھی طریقہ مکمل طور پر محفوظ نہیں ہوتا۔ صرف وہی ذاتی معلومات درج کریں جو کاروباری مقصد کے لیے واقعی ضروری ہوں، اور گاہکوں کا ریکارڈ رکھتے وقت متعلقہ رازداری، حساب کتاب اور ریکارڈ رکھنے کے قوانین پر عمل کریں۔",
        ],
    },
    {
        title: "9. آپ کے اختیارات اور ذمہ داریاں",
        bullets: [
            "ایپ میں دستیاب سہولیات کے ذریعے ریکارڈ دیکھیں، درست کریں یا حذف کریں۔",
            "موبائل کی ترتیبات سے کیمرہ اور تصاویر کی اجازت کنٹرول کریں۔",
            "SMS کمپوزر کھلنے کے بعد پیغام بھیجنے یا منسوخ کرنے کا فیصلہ خود کریں۔",
            "کسی دوسرے شخص کی معلومات محفوظ یا استعمال کرنے سے پہلے ضروری اجازت حاصل کریں۔",
            "معاونت کے دوران خود فراہم کی گئی معلومات سے متعلق سوال یا درخواست کے لیے ڈویلپر سے رابطہ کریں۔",
        ],
    },
    {
        title: "10. بچوں کی رازداری",
        paragraphs: [
            "KhataBook کاروباری کھاتہ داری کے لیے بنائی گئی ہے اور 13 سال سے کم عمر بچوں کے لیے مخصوص نہیں۔ ڈویلپر اپنی کسی آن لائن سروس کے ذریعے جان بوجھ کر بچوں کی ذاتی معلومات جمع نہیں کرتا۔ کسی بچے کی معلومات صرف اسی صورت میں محفوظ کریں جب آپ کے پاس قانونی وجہ اور مطلوبہ اجازت موجود ہو۔",
        ],
    },
    {
        title: "11. پالیسی میں تبدیلی",
        paragraphs: [
            "ایپ کی سہولیات، معلومات کے استعمال یا قانونی تقاضوں میں تبدیلی آنے پر یہ پالیسی اپ ڈیٹ کی جا سکتی ہے۔ نئی پالیسی پر مؤثر ہونے کی تازہ تاریخ درج ہوگی۔ اہم تبدیلی کی اطلاع ایپ یا ایپ کی تقسیم کے صفحے پر بھی دی جا سکتی ہے۔",
        ],
    },
    {
        title: "12. رابطہ",
        paragraphs: [
            "رازداری سے متعلق سوال، تشویش یا درخواست کے لیے ڈویلپر سے اس ای میل پر رابطہ کریں:",
        ],
        contact: true,
    },
];

const ENGLISH_SUMMARY = [
    {
        icon: "phone-portrait-outline" as const,
        text: "Customer and ledger records are stored locally on your device.",
    },
    {
        icon: "cloud-offline-outline" as const,
        text: "No automatic cloud backup or developer-controlled server upload.",
    },
    {
        icon: "megaphone-outline" as const,
        text: "No ads, analytics trackers, or sale of personal information.",
    },
    {
        icon: "key-outline" as const,
        text: "Camera and photo access are requested only when you choose those features.",
    },
];

const URDU_SUMMARY = [
    {
        icon: "phone-portrait-outline" as const,
        text: "گاہکوں اور کھاتے کا ریکارڈ آپ کے اپنے آلے پر محفوظ رہتا ہے۔",
    },
    {
        icon: "cloud-offline-outline" as const,
        text: "خودکار کلاؤڈ بیک اپ یا ڈویلپر کے سرور پر ڈیٹا اپ لوڈ نہیں ہوتا۔",
    },
    {
        icon: "megaphone-outline" as const,
        text: "کوئی اشتہار، تجزیاتی ٹریکر یا ذاتی معلومات کی فروخت نہیں ہوتی۔",
    },
    {
        icon: "key-outline" as const,
        text: "کیمرہ اور تصاویر کی اجازت صرف آپ کے منتخب کرنے پر مانگی جاتی ہے۔",
    },
];

export const PrivacyPolicyScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { language } = useLanguage();
    const isUrdu = language === "ur";
    const policySections = isUrdu ? URDU_POLICY_SECTIONS : POLICY_SECTIONS;
    const summaryItems = isUrdu ? URDU_SUMMARY : ENGLISH_SUMMARY;

    const openEmail = () => {
        Linking.openURL(
            `mailto:${CONTACT_EMAIL}?subject=KhataBook%20Privacy%20Inquiry`,
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
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={colors.primary}
                    />
                </Pressable>
                <Typography variant="heading-large" color="primary">
                    {t("settings.privacyPolicy")}
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
                            name="shield-checkmark"
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
                            ? "آپ کا کھاتہ آپ کے آلے پر محفوظ رہتا ہے"
                            : "Your ledger stays on your device"}
                    </Typography>
                    <Typography
                        variant="body-medium"
                        color="secondary"
                        style={styles.heroDescription}
                    >
                        {isUrdu
                            ? "KhataBook میں آپ کا کاروباری ریکارڈ بنیادی طور پر آپ کے اپنے آلے پر رہتا ہے۔ موجودہ ورژن اسے خودکار طور پر اپ لوڈ یا فروخت نہیں کرتا اور نہ ہی اشتہارات یا تجزیے کے لیے استعمال کرتا ہے۔"
                            : "KhataBook is local-first. The current version does not automatically upload, sell, or use your business data for advertising or analytics."}
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

                <Card style={styles.summaryCard}>
                    <Typography
                        variant="heading-small"
                        color="primary"
                        style={[
                            styles.sectionHeading,
                        ]}
                    >
                        {isUrdu ? "رازداری ایک نظر میں" : "Privacy at a glance"}
                    </Typography>
                    {summaryItems.map((item) => (
                        <SummaryRow
                            key={item.text}
                            icon={item.icon}
                            text={item.text}
                        />
                    ))}
                </Card>

                {policySections.map((section) => (
                    <Card key={section.title} style={styles.policyCard}>
                        <Typography
                            variant="heading-small"
                            color="primary"
                            style={[
                                styles.sectionHeading,
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
                                    { backgroundColor: colors.primary },
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
                        {section.contact && (
                            <Pressable
                                onPress={openEmail}
                                style={[
                                    styles.contactButton,
                                    { backgroundColor: colors.primary },
                                    false && [
                                        styles.rowReverse,
                                        styles.contactButtonRtl,
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
                ))}
            </ScrollView>
        </View>
    );
};

const SummaryRow: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
}> = ({ icon, text }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.summaryRow]}>
            <View
                style={[
                    styles.summaryIcon,
                    { backgroundColor: `${colors.primary}15` },
                ]}
            >
                <Ionicons name={icon} size={20} color={colors.primary} />
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
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    backButton: {
        padding: Spacing.sm,
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
    summaryCard: {
        marginBottom: Spacing.md,
    },
    policyCard: {
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
    rtlText: {
        textAlign: "right",
        writingDirection: "rtl",
    },
    bulletText: {
        flex: 1,
        lineHeight: 22,
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
    contactButtonRtl: {
        alignSelf: "flex-end",
    },
    contactText: {
        color: "#FFFFFF",
    },
});
