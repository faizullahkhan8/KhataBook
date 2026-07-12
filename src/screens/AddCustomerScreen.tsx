import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, ErrorScreen, Input, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomerById } from "../hooks/useCustomerById";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { CustomerId } from "../models";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";
import { useDatabaseContext, useTheme } from "../store";
import { fromInteger, toInteger } from "../utils/currencyUtils";
import { deleteFromStorage, saveToPermanentStorage } from "../utils/fileUtils";

export const AddCustomerScreen: React.FC = () => {
    const {
        db,
        error: dbError,
        initDatabase,
        invalidate,
    } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customerId } = useLocalSearchParams<{ customerId?: string }>();
    const { createCustomer } = useCustomersWithAccounts(db);

    const parsedCustomerId = customerId
        ? (parseInt(customerId) as CustomerId)
        : (0 as any);
    const { customer } = useCustomerById(db, parsedCustomerId);

    const customerService = useMemo(
        () => (db ? new CustomerService(db) : null),
        [db],
    );
    const accountService = useMemo(
        () => (db ? new AccountService(db) : null),
        [db],
    );

    const isEditMode = !!customerId;

    const [customerInfo, setCustomerInfo] = useState({
        name: "",
        phone: "",
        cnic: "",
        email: "",
        address: "",
        notes: "",
    });

    const [accountInfo, setAccountInfo] = useState({
        accountNumber: `ACC-${Date.now()}`,
        creditLimit: "",
        initialBalance: "",
    });

    const [imageUri, setImageUri] = useState<string | null>(null);
    const originalImageUri = useRef<string | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            () => setIsKeyboardVisible(true),
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setIsKeyboardVisible(false),
        );
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    useEffect(() => {
        if (isEditMode && customer) {
            setCustomerInfo({
                name: customer.name || "",
                phone: customer.phone || "",
                cnic: customer.cnic || "",
                email: customer.email || "",
                address: customer.address || "",
                notes: customer.notes || "",
            });
            if (customer.accounts && customer.accounts.length > 0) {
                const account = customer.accounts[0];
                setAccountInfo({
                    accountNumber: account.account_number || "",
                    creditLimit: fromInteger(
                        account.credit_limit || 0,
                    ).toString(),
                    initialBalance: fromInteger(
                        account.current_balance || 0,
                    ).toString(),
                });
            }
            if (customer.image_uri) {
                setImageUri(customer.image_uri);
                originalImageUri.current = customer.image_uri;
            }
        }
    }, [isEditMode, customer]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!customerInfo.name.trim()) {
            newErrors.name = t("addCustomer.nameRequired");
        }
        const phoneDigits = customerInfo.phone.replace(/\D/g, "");
        if (customerInfo.phone.trim() && phoneDigits.length < 11) {
            newErrors.phone = t("addCustomer.phoneInvalid");
        }
        const cnicDigits = customerInfo.cnic.replace(/\D/g, "");
        if (customerInfo.cnic.trim() && cnicDigits.length !== 13) {
            newErrors.cnic = t("addCustomer.cnicInvalid");
        }
        if (
            customerInfo.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)
        ) {
            newErrors.email = t("addCustomer.emailInvalid");
        }
        if (!accountInfo.accountNumber.trim()) {
            newErrors.accountNumber = t("addCustomer.accountRequired");
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const finalImageUri = await saveToPermanentStorage(imageUri);
            if (isEditMode && customerId && customerService && accountService) {
                await customerService.updateCustomer(parsedCustomerId, {
                    name: customerInfo.name.trim(),
                    phone: customerInfo.phone.trim(),
                    cnic: customerInfo.cnic.trim(),
                    email: customerInfo.email.trim() || "",
                    address: customerInfo.address.trim() || "",
                    notes: customerInfo.notes.trim() || "",
                    image_uri: finalImageUri || "",
                });

                if (
                    originalImageUri.current &&
                    originalImageUri.current !== finalImageUri
                ) {
                    await deleteFromStorage(originalImageUri.current);
                }

                const account = customer?.accounts?.[0];
                if (account?.id) {
                    const creditLimitValue = accountInfo.creditLimit.trim();
                    await accountService.updateAccount(account.id, {
                        credit_limit: creditLimitValue
                            ? toInteger(parseFloat(creditLimitValue))
                            : (0 as any),
                    });
                }
                invalidate();
                router.back();
            } else {
                const newCustomerId = await createCustomer(
                    {
                        name: customerInfo.name.trim(),
                        phone: customerInfo.phone.trim(),
                        cnic: customerInfo.cnic.trim() || undefined,
                        email: customerInfo.email.trim() || undefined,
                        address: customerInfo.address.trim() || undefined,
                        notes: customerInfo.notes.trim() || undefined,
                        image_uri: finalImageUri || undefined,
                    },
                    {
                        creditLimit: accountInfo.creditLimit.trim()
                            ? toInteger(
                                  parseFloat(accountInfo.creditLimit.trim()),
                              )
                            : 0,
                        initialBalance: accountInfo.initialBalance.trim()
                            ? toInteger(
                                  parseFloat(accountInfo.initialBalance.trim()),
                              )
                            : 0,
                    },
                );
                if (newCustomerId) {
                    router.push("/" as any);
                }
            }
        } catch {
            Alert.alert(
                t("addCustomer.error"),
                isEditMode
                    ? t("addCustomer.updateError")
                    : t("addCustomer.createError"),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (
            customerInfo.name ||
            customerInfo.phone ||
            customerInfo.cnic ||
            customerInfo.email ||
            customerInfo.address
        ) {
            Alert.alert(
                t("addCustomer.discardTitle"),
                t("addCustomer.discardMessage"),
                [
                    { text: t("addCustomer.stay"), style: "cancel" },
                    {
                        text: t("addCustomer.discard"),
                        style: "destructive",
                        onPress: () => router.back(),
                    },
                ],
            );
        } else {
            router.back();
        }
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                t("addCustomer.permissionRequired"),
                t("addCustomer.cameraPermission"),
            );
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const pickFromGallery = async () => {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert(
                t("addCustomer.permissionRequired"),
                t("addCustomer.galleryPermission"),
            );
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            t("addCustomer.selectPhoto"),
            t("addCustomer.selectPhotoMessage"),
            [
                { text: t("addCustomer.cancel"), style: "cancel" },
                { text: t("addCustomer.camera"), onPress: pickFromCamera },
                { text: t("addCustomer.gallery"), onPress: pickFromGallery },
            ],
        );
    };

    const removeImage = () => {
        setImageUri(null);
    };

    return (
        <ErrorScreen
            error={dbError}
            type="database"
            isLoading={!db && !dbError}
            onRetry={initDatabase}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[
                    styles.container,
                    { backgroundColor: colors.background },
                ]}
            >
                <View
                    style={[
                        styles.header,
                        {
                            marginTop: insets.top + Spacing.sm,
                            marginHorizontal: Spacing.md,
                            marginBottom: Spacing.sm,
                            borderRadius: 10,
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.06,
                            shadowRadius: 4,
                            elevation: 2,
                        },
                    ]}
                >
                    <Pressable
                        onPress={handleCancel}
                        style={[
                            styles.backButton,
                            { backgroundColor: `${colors.primary}18` },
                        ]}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={20}
                            color={colors.primary}
                        />
                    </Pressable>
                    <Typography variant="heading-large" color="primary">
                        {isEditMode
                            ? t("addCustomer.editTitle")
                            : t("addCustomer.addTitle")}
                    </Typography>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Card
                        style={[
                            styles.sectionCard,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <View
                                style={[
                                    styles.iconWrap,
                                    { backgroundColor: `${colors.primary}15` },
                                ]}
                            >
                                <Ionicons
                                    name="person-outline"
                                    size={18}
                                    color={colors.primary}
                                />
                            </View>
                            <Typography variant="heading-small" color="primary">
                                {t("addCustomer.customerInfo")}
                            </Typography>
                        </View>

                        <View style={styles.imageContainer}>
                            {imageUri ? (
                                <View style={styles.imageWrapper}>
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={[
                                            styles.profileImage,
                                            { backgroundColor: colors.surface },
                                        ]}
                                    />
                                    <Pressable
                                        onPress={removeImage}
                                        style={styles.removeImageButton}
                                    >
                                        <Ionicons
                                            name="close-circle"
                                            size={28}
                                            color={colors.danger}
                                        />
                                    </Pressable>
                                </View>
                            ) : (
                                <Pressable
                                    onPress={showImagePickerOptions}
                                    style={[
                                        styles.imagePlaceholder,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="camera"
                                        size={32}
                                        color={colors.text.muted}
                                    />
                                    <Typography
                                        variant="body-small"
                                        color="muted"
                                        style={styles.imagePlaceholderText}
                                    >
                                        {t("addCustomer.addPhoto")}
                                    </Typography>
                                </Pressable>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="person"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.fullName")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t(
                                    "addCustomer.fullNamePlaceholder",
                                )}
                                value={customerInfo.name}
                                onChangeText={(text) => {
                                    setCustomerInfo({
                                        ...customerInfo,
                                        name: text,
                                    });
                                    if (errors.name)
                                        setErrors({ ...errors, name: "" });
                                }}
                                error={!!errors.name}
                            />
                            {errors.name && (
                                <Typography
                                    variant="small-small"
                                    color="danger"
                                    style={styles.errorText}
                                >
                                    {errors.name}
                                </Typography>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="call"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.phoneNumber")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t("addCustomer.phonePlaceholder")}
                                value={customerInfo.phone}
                                onChangeText={(text) => {
                                    setCustomerInfo({
                                        ...customerInfo,
                                        phone: text,
                                    });
                                    if (errors.phone)
                                        setErrors({ ...errors, phone: "" });
                                }}
                                error={!!errors.phone}
                                keyboardType="phone-pad"
                            />
                            {errors.phone && (
                                <Typography
                                    variant="small-small"
                                    color="danger"
                                    style={styles.errorText}
                                >
                                    {errors.phone}
                                </Typography>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="id-card"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.cnic")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t("addCustomer.cnicPlaceholder")}
                                value={customerInfo.cnic}
                                onChangeText={(text) => {
                                    setCustomerInfo({
                                        ...customerInfo,
                                        cnic: text,
                                    });
                                    if (errors.cnic)
                                        setErrors({ ...errors, cnic: "" });
                                }}
                                error={!!errors.cnic}
                                keyboardType="phone-pad"
                                maxLength={15}
                            />
                            {errors.cnic && (
                                <Typography
                                    variant="small-small"
                                    color="danger"
                                    style={styles.errorText}
                                >
                                    {errors.cnic}
                                </Typography>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="mail"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.email")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t("addCustomer.emailPlaceholder")}
                                value={customerInfo.email}
                                onChangeText={(text) => {
                                    setCustomerInfo({
                                        ...customerInfo,
                                        email: text,
                                    });
                                    if (errors.email)
                                        setErrors({ ...errors, email: "" });
                                }}
                                error={!!errors.email}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {errors.email && (
                                <Typography
                                    variant="small-small"
                                    color="danger"
                                    style={styles.errorText}
                                >
                                    {errors.email}
                                </Typography>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="location"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.address")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t(
                                    "addCustomer.addressPlaceholder",
                                )}
                                value={customerInfo.address}
                                onChangeText={(text) =>
                                    setCustomerInfo({
                                        ...customerInfo,
                                        address: text,
                                    })
                                }
                                multiline
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="document-text"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.notes")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t("addCustomer.notesPlaceholder")}
                                value={customerInfo.notes}
                                onChangeText={(text) =>
                                    setCustomerInfo({
                                        ...customerInfo,
                                        notes: text,
                                    })
                                }
                                multiline
                            />
                        </View>
                    </Card>

                    <Card
                        style={[
                            styles.sectionCard,
                            { backgroundColor: colors.surface },
                        ]}
                    >
                        <View style={styles.sectionHeader}>
                            <View
                                style={[
                                    styles.iconWrap,
                                    { backgroundColor: `${colors.success}15` },
                                ]}
                            >
                                <Ionicons
                                    name="card-outline"
                                    size={18}
                                    color={colors.success}
                                />
                            </View>
                            <Typography variant="heading-small" color="primary">
                                {t("addCustomer.accountInfo")}
                            </Typography>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="card"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.accountNumber")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t(
                                    "addCustomer.accountNumberPlaceholder",
                                )}
                                value={accountInfo.accountNumber}
                                onChangeText={(text) => {
                                    setAccountInfo({
                                        ...accountInfo,
                                        accountNumber: text,
                                    });
                                    if (errors.accountNumber)
                                        setErrors({
                                            ...errors,
                                            accountNumber: "",
                                        });
                                }}
                                error={!!errors.accountNumber}
                            />
                            {errors.accountNumber && (
                                <Typography
                                    variant="small-small"
                                    color="danger"
                                    style={styles.errorText}
                                >
                                    {errors.accountNumber}
                                </Typography>
                            )}
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="cash"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.creditLimit")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t(
                                    "addCustomer.creditLimitPlaceholder",
                                )}
                                value={accountInfo.creditLimit}
                                onChangeText={(text) =>
                                    setAccountInfo({
                                        ...accountInfo,
                                        creditLimit: text,
                                    })
                                }
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons
                                    name="wallet"
                                    size={16}
                                    color={colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="secondary"
                                >
                                    {t("addCustomer.openingBalance")}
                                </Typography>
                            </View>
                            <Input
                                placeholder={t(
                                    "addCustomer.openingBalancePlaceholder",
                                )}
                                value={accountInfo.initialBalance}
                                onChangeText={(text) =>
                                    setAccountInfo({
                                        ...accountInfo,
                                        initialBalance: text,
                                    })
                                }
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View
                            style={[
                                styles.accountInfo,
                                { backgroundColor: `${colors.primary}10` },
                            ]}
                        >
                            <Ionicons
                                name="information-circle"
                                size={16}
                                color={colors.primary}
                            />
                            <Typography
                                variant="small-small"
                                color="primary"
                                style={styles.accountInfoText}
                            >
                                {t("addCustomer.accountInfoMessage")}
                            </Typography>
                        </View>
                    </Card>
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        {
                            backgroundColor: colors.surface,
                            borderTopColor: colors.border,
                            paddingBottom: isKeyboardVisible
                                ? Spacing.sm
                                : Math.max(insets.bottom, Spacing.sm) +
                                  Spacing.sm,
                        },
                    ]}
                >
                    <Button
                        title={t("addCustomer.cancel")}
                        variant="secondary"
                        onPress={handleCancel}
                        style={styles.footerButton}
                    />
                    <Button
                        title={
                            isEditMode && isSubmitting
                                ? t("addCustomer.updating")
                                : isEditMode
                                  ? t("addCustomer.updateCustomer")
                                  : t("addCustomer.createCustomer")
                        }
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        style={styles.footerButton}
                    />
                </View>
            </KeyboardAvoidingView>
        </ErrorScreen>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
    },
    backButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    placeholder: {
        width: 34,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
    },
    sectionCard: {
        padding: Spacing.lg,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "transparent",
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    inputContainer: {
        marginBottom: Spacing.md,
    },
    inputLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    errorText: {
        marginTop: Spacing.xs,
    },
    accountInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: 8,
    },
    accountInfoText: {
        flex: 1,
        marginTop: 2,
    },
    footer: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.md,
        borderTopWidth: 1,
    },
    footerButton: {
        flex: 1,
    },
    imageContainer: {
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    imageWrapper: {
        position: "relative",
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    removeImageButton: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: Colors.background,
        borderRadius: 14,
    },
    imagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
    },
    imagePlaceholderText: {
        marginTop: Spacing.xs,
    },
});
