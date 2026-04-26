import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Input, Typography } from "../components";
import { Colors, Spacing } from "../constants";
import { useCustomerById } from "../hooks/useCustomerById";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { AccountService } from "../services/AccountService";
import { CustomerService } from "../services/CustomerService";
import { useDatabaseContext } from "../store";
import { toInteger, fromInteger } from "../utils/currencyUtils";
import { CustomerId } from "../models";

export const AddCustomerScreen: React.FC = () => {
    const { db, invalidate } = useDatabaseContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { customerId } = useLocalSearchParams<{ customerId?: string }>();
    const { createCustomer } = useCustomersWithAccounts(db);
    const { customer } = useCustomerById(
        db,
        customerId ? (parseInt(customerId) as CustomerId) : (0 as any),
    );
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
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

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
                email: customer.email || "",
                address: customer.address || "",
                notes: customer.notes || "",
            });
            if (customer.accounts && customer.accounts.length > 0) {
                const account = customer.accounts[0];
                setAccountInfo({
                    accountNumber: account.account_number || "",
                    creditLimit: fromInteger(account.credit_limit || 0).toString(),
                    initialBalance: fromInteger(account.current_balance || 0).toString(),
                });
            }
            if (customer.image_uri) {
                setImageUri(customer.image_uri);
            }
        }
    }, [isEditMode, customer]);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!customerInfo.name.trim()) {
            newErrors.name = "Name is required";
        }
        if (!customerInfo.phone.trim()) {
            newErrors.phone = "Phone number is required";
        }
        if (
            customerInfo.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)
        ) {
            newErrors.email = "Invalid email format";
        }
        if (!accountInfo.accountNumber.trim()) {
            newErrors.accountNumber = "Account number is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            if (isEditMode && customerId && customerService && accountService) {
                // Update existing customer
                await customerService.updateCustomer(parseInt(customerId) as CustomerId, {
                    name: customerInfo.name.trim(),
                    phone: customerInfo.phone.trim(),
                    email: customerInfo.email.trim() || undefined,
                    address: customerInfo.address.trim() || undefined,
                    notes: customerInfo.notes.trim() || undefined,
                    image_uri: imageUri || undefined,
                });

                // Update account credit limit if account exists
                const account = customer?.accounts?.[0];
                if (account?.id) {
                    const creditLimitValue = accountInfo.creditLimit.trim();
                    await accountService.updateAccount(account.id, {
                        credit_limit: creditLimitValue
                            ? toInteger(parseFloat(creditLimitValue))
                            : 0 as any,
                    });
                }

                invalidate(); // Trigger global refresh

                // Navigate back to customer transactions screen
                router.back();
            } else {
                // Create new customer
                const newCustomerId = await createCustomer(
                    {
                        name: customerInfo.name.trim(),
                        phone: customerInfo.phone.trim(),
                        email: customerInfo.email.trim() || undefined,
                        address: customerInfo.address.trim() || undefined,
                        notes: customerInfo.notes.trim() || undefined,
                        image_uri: imageUri || undefined,
                    },
                    {
                        creditLimit: accountInfo.creditLimit.trim()
                            ? toInteger(parseFloat(accountInfo.creditLimit.trim()))
                            : 0,
                        initialBalance: accountInfo.initialBalance.trim()
                            ? toInteger(parseFloat(accountInfo.initialBalance.trim()))
                            : 0,
                    }
                );

                if (newCustomerId) {
                    // Navigate to customers screen
                    router.push("/" as any);
                }
            }
        } catch {
            Alert.alert(
                "Error",
                isEditMode
                    ? "Failed to update customer. Please try again."
                    : "Failed to create customer. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (
            customerInfo.name ||
            customerInfo.phone ||
            customerInfo.email ||
            customerInfo.address
        ) {
            Alert.alert(
                "Discard Changes?",
                "You have unsaved changes. Are you sure you want to go back?",
                [
                    { text: "Stay", style: "cancel" },
                    {
                        text: "Discard",
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
                "Permission Required",
                "Camera permission is needed to take photos.",
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
                "Permission Required",
                "Gallery permission is needed to select photos.",
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
        Alert.alert("Select Photo", "Choose an option", [
            { text: "Cancel", style: "cancel" },
            { text: "Camera", onPress: pickFromCamera },
            { text: "Gallery", onPress: pickFromGallery },
        ]);
    };

    const removeImage = () => {
        setImageUri(null);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { paddingTop: insets.top }]}
        >
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleCancel} style={styles.backButton}>
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={Colors.text.primary}
                    />
                </Pressable>
                <Typography variant="heading-large" color="primary">
                    {isEditMode ? "Edit Customer" : "Add Customer"}
                </Typography>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Customer Information Section */}
                <Card style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons
                            name="person-outline"
                            size={20}
                            color={Colors.primary}
                        />
                        <Typography variant="heading-small" color="primary">
                            Customer Information
                        </Typography>
                    </View>

                    {/* Profile Image */}
                    <View style={styles.imageContainer}>
                        {imageUri ? (
                            <View style={styles.imageWrapper}>
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.profileImage}
                                />
                                <Pressable
                                    onPress={removeImage}
                                    style={styles.removeImageButton}
                                >
                                    <Ionicons
                                        name="close-circle"
                                        size={24}
                                        color={Colors.danger}
                                    />
                                </Pressable>
                            </View>
                        ) : (
                            <Pressable
                                onPress={showImagePickerOptions}
                                style={styles.imagePlaceholder}
                            >
                                <Ionicons
                                    name="camera"
                                    size={32}
                                    color={Colors.text.muted}
                                />
                                <Typography
                                    variant="body-small"
                                    color="muted"
                                    style={styles.imagePlaceholderText}
                                >
                                    Add Photo
                                </Typography>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.inputContainer}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons
                                name="person"
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Full Name *
                            </Typography>
                        </View>
                        <Input
                            placeholder="Enter customer name"
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
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Phone Number *
                            </Typography>
                        </View>
                        <Input
                            placeholder="Enter phone number"
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
                                name="mail"
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Email
                            </Typography>
                        </View>
                        <Input
                            placeholder="Enter email address (optional)"
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
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Address
                            </Typography>
                        </View>
                        <Input
                            placeholder="Enter address (optional)"
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
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Notes
                            </Typography>
                        </View>
                        <Input
                            placeholder="Additional notes (optional)"
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

                {/* Account Information Section */}
                <Card style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons
                            name="card-outline"
                            size={20}
                            color={Colors.success}
                        />
                        <Typography variant="heading-small" color="primary">
                            Account Information
                        </Typography>
                    </View>

                    <View style={styles.inputContainer}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons
                                name="card"
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Account Number *
                            </Typography>
                        </View>
                        <Input
                            placeholder="Auto-generated account number"
                            value={accountInfo.accountNumber}
                            onChangeText={(text) => {
                                setAccountInfo({
                                    ...accountInfo,
                                    accountNumber: text,
                                });
                                if (errors.accountNumber)
                                    setErrors({ ...errors, accountNumber: "" });
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
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Credit Limit
                            </Typography>
                        </View>
                        <Input
                            placeholder="Enter credit limit (optional)"
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
                                size={18}
                                color={Colors.text.muted}
                            />
                            <Typography variant="body-small" color="secondary">
                                Opening Balance
                            </Typography>
                        </View>
                        <Input
                            placeholder="Enter opening balance (optional)"
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

                    <View style={styles.accountInfo}>
                        <Ionicons
                            name="information-circle"
                            size={16}
                            color={Colors.text.muted}
                        />
                        <Typography
                            variant="small-small"
                            color="muted"
                            style={styles.accountInfoText}
                        >
                            Account will be created automatically with ACTIVE
                            status.
                        </Typography>
                    </View>
                </Card>
            </ScrollView>

            {/* Footer Actions */}
            <View
                style={[
                    styles.footer,
                    {
                        paddingBottom: isKeyboardVisible
                            ? Spacing.sm
                            : Math.max(insets.bottom + Spacing.md),
                    },
                ]}
            >
                <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={handleCancel}
                    style={styles.footerButton}
                />
                <Button
                    title={
                        isEditMode && isSubmitting
                            ? "Updating..."
                            : isEditMode
                              ? "Update Customer"
                              : "Create Customer"
                    }
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    style={styles.footerButton}
                />
            </View>
        </KeyboardAvoidingView>
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
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    sectionCard: {
        padding: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
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
        gap: Spacing.xs,
        marginTop: Spacing.sm,
        padding: Spacing.sm,
        backgroundColor: `${Colors.primary}10`,
        borderRadius: 8,
    },
    accountInfoText: {
        flex: 1,
    },
    footer: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        gap: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
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
        backgroundColor: Colors.surface,
    },
    removeImageButton: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: Colors.background,
        borderRadius: 12,
    },
    imagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: Colors.border,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
    },
    imagePlaceholderText: {
        marginTop: Spacing.xs,
    },
});
