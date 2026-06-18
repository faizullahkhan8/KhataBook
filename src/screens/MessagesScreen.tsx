import { Ionicons } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, Input, LoadingScreen, Typography } from "../components";
import { Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { useDeleteAuthentication } from "../hooks/useDeleteAuthentication";
import { CustomerId, CustomerWithAccounts, MessageTemplate } from "../models";
import { MessageTemplateService } from "../services/MessageTemplateService";
import { logger } from "../services/LogService";
import { useDatabaseContext, usePasscode, useTheme } from "../store";
import {
    getUnsupportedPlaceholders,
    hasValidSmsPhone,
    MESSAGE_TEMPLATE_PLACEHOLDERS,
    renderMessageTemplate,
} from "../utils/messageTemplates";

type Section = "send" | "templates";
type SendStep = "recipients" | "message" | "send";
type SendMode = "individual" | "group";
type MessageRecipient = CustomerWithAccounts & { id: CustomerId };

const MESSAGE_PLACEHOLDER_PATTERN = /{{\s*[^{}]+?\s*}}/;

export const MessagesScreen: React.FC = () => {
    const { db } = useDatabaseContext();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { customers, loading, hasMore, nextPage } = useCustomersWithAccounts(db);
    const { setAutoLockSuspended } = usePasscode();
    const { requestDeleteAuthentication, deleteAuthenticationPrompt } =
        useDeleteAuthentication();
    const service = useMemo(
        () => (db ? new MessageTemplateService(db) : null),
        [db],
    );
    const [section, setSection] = useState<Section>("send");
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<CustomerId>>(new Set());
    const [recipientSearch, setRecipientSearch] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<number>();
    const [message, setMessage] = useState("");
    const [sendMode, setSendMode] = useState<SendMode>("individual");
    const [sendStep, setSendStep] = useState<SendStep>("recipients");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [openedRecipientIds, setOpenedRecipientIds] = useState<
        Set<CustomerId>
    >(new Set());
    const [sendError, setSendError] = useState("");
    const [isOpening, setIsOpening] = useState(false);
    const [editing, setEditing] = useState<MessageTemplate | null>(null);
    const [templateName, setTemplateName] = useState("");
    const [templateBody, setTemplateBody] = useState("");
    const [templateError, setTemplateError] = useState("");

    const sectionAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!editing) return;
        setAutoLockSuspended(true);
        return () => setAutoLockSuspended(false);
    }, [editing, setAutoLockSuspended]);

    const loadTemplates = useCallback(async () => {
        if (!service) return;
        const items = await service.getAll();
        setTemplates(items);
    }, [service]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const selectedCustomers = useMemo<MessageRecipient[]>(
        () =>
            customers.filter(
                (customer): customer is MessageRecipient =>
                    customer.id !== undefined && selectedIds.has(customer.id),
            ),
        [customers, selectedIds],
    );
    const filteredCustomers = useMemo(() => {
        const query = recipientSearch.trim().toLowerCase();
        if (!query) return customers;

        return customers.filter((customer) =>
            [
                customer.name,
                customer.phone,
                customer.cnic,
                ...(customer.accounts?.map(
                    (account) => account.account_number,
                ) || []),
            ].some((value) => value?.toLowerCase().includes(query)),
        );
    }, [customers, recipientSearch]);
    const validCustomers = useMemo<MessageRecipient[]>(
        () =>
            selectedCustomers.filter((customer) =>
                hasValidSmsPhone(customer.phone),
            ),
        [selectedCustomers],
    );
    const skippedCustomers = useMemo(
        () =>
            selectedCustomers.filter(
                (customer) => !hasValidSmsPhone(customer.phone),
            ),
        [selectedCustomers],
    );
    const hasPlaceholders = useMemo(
        () => MESSAGE_PLACEHOLDER_PATTERN.test(message),
        [message],
    );

    const openedCount = useMemo(
        () =>
            validCustomers.filter((customer) =>
                openedRecipientIds.has(customer.id),
            ).length,
        [openedRecipientIds, validCustomers],
    );
    const isSendComplete =
        validCustomers.length > 0 && openedCount >= validCustomers.length;

    const resetSendProgress = useCallback(() => {
        setCurrentIndex(0);
        setOpenedRecipientIds(new Set());
        setSendError("");
        setIsOpening(false);
    }, []);

    const toggleCustomer = (id: CustomerId) => {
        resetSendProgress();
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        resetSendProgress();
        const ids = filteredCustomers
            .map((customer) => customer.id)
            .filter((id): id is CustomerId => id !== undefined);
        setSelectedIds((previous) => new Set([...previous, ...ids]));
    };

    const chooseTemplate = (template: MessageTemplate) => {
        resetSendProgress();
        setSelectedTemplateId(template.id);
        setMessage(template.body);
        setSendError("");
    };

    const chooseOwnMessage = () => {
        resetSendProgress();
        setSelectedTemplateId(undefined);
        setMessage("");
        setSendError("");
    };

    const prepareAnotherMessage = () => {
        resetSendProgress();
        setSendStep("recipients");
    };

    const toggleSection = () => {
        const toSection = section === "send" ? "templates" : "send";
        Animated.timing(sectionAnim, {
            toValue: toSection === "templates" ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
        setSection(toSection);
    };

    const validateMessage = async () => {
        if (!message.trim()) {
            setSendError(t("customerMessages.messageRequired"));
            return false;
        }
        const unsupported = getUnsupportedPlaceholders(message);
        if (unsupported.length > 0) {
            setSendError(
                t("messageTemplates.unsupported", {
                    placeholders: unsupported.join(", "),
                }),
            );
            return false;
        }
        if (sendMode === "group" && hasPlaceholders) {
            setSendError(t("customerMessages.groupPlaceholdersUnsupported"));
            return false;
        }
        if (validCustomers.length === 0) {
            setSendError(t("customerMessages.noValidPhones"));
            return false;
        }
        let isAvailable = false;
        try {
            isAvailable = await SMS.isAvailableAsync();
        } catch (error) {
            void logger.error("messages", "Failed to check SMS availability", error);
        }
        if (!isAvailable) {
            setSendError(t("customerMessages.unavailable"));
            return false;
        }
        return true;
    };

    const goToSendStep = async () => {
        if (!(await validateMessage())) return;

        resetSendProgress();
        setSendStep("send");
    };

    const openGroupMessage = async () => {
        setIsOpening(true);
        try {
            await SMS.sendSMSAsync(
                validCustomers.map((customer) => customer.phone.trim()),
                message.trim(),
            );
            setOpenedRecipientIds(
                new Set(validCustomers.map((customer) => customer.id)),
            );
            setSendError("");
        } catch (error) {
            void logger.error("messages", "SMS group composer open failed", error);
            setSendError(t("customerMessages.openError"));
        } finally {
            setIsOpening(false);
        }
    };

    const openNextMessage = async () => {
        const customer = validCustomers[currentIndex];
        if (!customer) return;

        setIsOpening(true);
        try {
            await SMS.sendSMSAsync(
                customer.phone.trim(),
                renderMessageTemplate(message, customer),
            );
            const nextIndex = currentIndex + 1;
            setOpenedRecipientIds((previous) => {
                const next = new Set(previous);
                next.add(customer.id);
                return next;
            });
            setCurrentIndex(nextIndex);
            setSendError("");
        } catch (error) {
            void logger.error(
                "messages",
                "SMS individual composer open failed",
                error,
            );
            setSendError(t("customerMessages.openError"));
        } finally {
            setIsOpening(false);
        }
    };

    const openTemplateEditor = (template?: MessageTemplate) => {
        setEditing(template || { name: "", body: "" });
        setTemplateName(template?.name || "");
        setTemplateBody(template?.body || "");
        setTemplateError("");
    };

    const closeTemplateEditor = () => {
        setEditing(null);
        setTemplateName("");
        setTemplateBody("");
        setTemplateError("");
    };

    const saveTemplate = async () => {
        if (!service) return;
        if (!templateName.trim() || !templateBody.trim()) {
            setTemplateError(t("messageTemplates.required"));
            return;
        }
        const unsupported = getUnsupportedPlaceholders(templateBody);
        if (unsupported.length > 0) {
            setTemplateError(
                t("messageTemplates.unsupported", {
                    placeholders: unsupported.join(", "),
                }),
            );
            return;
        }
        if (editing?.id) {
            await service.update(editing.id, {
                name: templateName.trim(),
                body: templateBody.trim(),
            });
        } else {
            await service.create({
                name: templateName.trim(),
                body: templateBody.trim(),
            });
        }
        closeTemplateEditor();
        await loadTemplates();
    };

    const deleteTemplate = (template: MessageTemplate) => {
        if (!service || !template.id) return;
        setAutoLockSuspended(true);
        Alert.alert(
            t("messageTemplates.deleteTitle"),
            template.name,
            [
                {
                    text: t("messageTemplates.cancel"),
                    style: "cancel",
                    onPress: () => setAutoLockSuspended(false),
                },
                {
                    text: t("messageTemplates.delete"),
                    style: "destructive",
                    onPress: () => {
                        void requestDeleteAuthentication(async () => {
                            await service.delete(template.id!);
                            if (selectedTemplateId === template.id) {
                                setSelectedTemplateId(undefined);
                                setMessage("");
                            }
                            await loadTemplates();
                        });
                    },
                },
            ],
            {
                onDismiss: () => setAutoLockSuspended(false),
            },
        );
    };

    const renderSkipped = () =>
        skippedCustomers.length > 0 ? (
            <Card
                style={[
                    styles.notice,
                    { backgroundColor: `${colors.warning}15` },
                ]}
            >
                <Typography variant="body-small" color="warning">
                    {t("customerMessages.skipped", {
                        count: skippedCustomers.length,
                        names: skippedCustomers
                            .map((customer) => customer.name)
                            .join(", "),
                    })}
                </Typography>
            </Card>
        ) : null;

    const renderRecipientsStep = () => (
        <View style={styles.recipientsStep}>
            <View style={styles.recipientsHeader}>
                <View style={[styles.sectionTitleRow, false && styles.rowRTL]}>
                    <Typography variant="heading-small" color="primary">
                        {t("customerMessages.recipients")}
                    </Typography>
                    <Pressable onPress={selectAll}>
                        <Typography variant="body-small" color="primary">
                            {t("customerMessages.selectAll")}
                        </Typography>
                    </Pressable>
                </View>
                <Input
                    value={recipientSearch}
                    onChangeText={setRecipientSearch}
                    placeholder={t("customerMessages.recipientSearchPlaceholder")}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    containerStyle={styles.recipientSearch}
                />
            </View>
            <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id?.toString() || item.name}
                style={styles.recipientList}
                contentContainerStyle={[
                    styles.recipientListContent,
                    filteredCustomers.length === 0 && styles.recipientListEmptyContent,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                onEndReached={hasMore ? nextPage : undefined}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loading && filteredCustomers.length > 0 ? (
                        <Typography variant="small-small" color="muted" style={styles.footer}>
                            Loading more...
                        </Typography>
                    ) : null
                }
                renderItem={({ item }) => {
                    const isSelected = item.id !== undefined && selectedIds.has(item.id);
                    return (
                        <Pressable onPress={() => item.id && toggleCustomer(item.id)}>
                            <Card
                                style={[
                                    styles.customerCard,
                                    ...(isSelected
                                        ? [{ borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]
                                        : []),
                                ]}
                            >
                                <View style={[styles.customerRow, false && styles.rowRTL]}>
                                    <Ionicons
                                        name={isSelected ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={isSelected ? colors.primary : colors.text.muted}
                                    />
                                    <View style={styles.customerText}>
                                        <Typography variant="body-medium" color="primary">
                                            {item.name}
                                        </Typography>
                                        <Typography variant="body-small" color="muted">
                                            {item.phone || t("customerMessages.noPhone")}
                                        </Typography>
                                    </View>
                                </View>
                            </Card>
                        </Pressable>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        {customers.length > 0 && (
                            <Ionicons name="search-outline" size={36} color={colors.text.muted} />
                        )}
                        <Typography variant="body-small" color="muted">
                            {customers.length === 0 ? t("customers.emptyTitle") : t("customerMessages.noRecipientsFound")}
                        </Typography>
                    </View>
                }
            />
            <View style={[styles.recipientSummary, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <Typography variant="body-small" color="muted">
                    {t("customerMessages.selectedCount", { count: selectedCustomers.length })}
                </Typography>
            </View>
        </View>
    );

    const renderMessageStep = () => (
        <>
            {renderSkipped()}
            <Typography variant="heading-small" color="primary">
                {t("customerMessages.sendMode")}
            </Typography>
            <View style={[styles.modeRow, false && styles.rowRTL]}>
                {(["individual", "group"] as const).map((mode) => (
                    <Pressable
                        key={mode}
                        onPress={() => { resetSendProgress(); setSendMode(mode); }}
                        style={[
                            styles.modeOption,
                            { borderColor: colors.border },
                            sendMode === mode && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                        ]}
                    >
                        <Ionicons
                            name={mode === "individual" ? "person-outline" : "people-outline"}
                            size={20}
                            color={sendMode === mode ? colors.primary : colors.text.muted}
                        />
                        <View style={styles.modeText}>
                            <Typography variant="body-medium" color={sendMode === mode ? "primary" : "secondary"}>
                                {t(`customerMessages.${mode}Mode`)}
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                {t(`customerMessages.${mode}ModeHint`)}
                            </Typography>
                        </View>
                    </Pressable>
                ))}
            </View>
            {sendMode === "group" && (
                <Card style={[styles.notice, { backgroundColor: `${colors.primary}10` }]}>
                    <Typography variant="body-small" color="muted">
                        {t("customerMessages.groupModeNotice")}
                    </Typography>
                </Card>
            )}
            <Typography variant="heading-small" color="primary">
                {t("customerMessages.chooseTemplate")}
            </Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.templateRow, false && styles.rowRTL]}>
                    <Pressable
                        onPress={chooseOwnMessage}
                        style={[
                            styles.templateChip,
                            { borderColor: colors.border },
                            selectedTemplateId === undefined && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                        ]}
                    >
                        <Typography variant="body-small" color="secondary">
                            {t("customerMessages.ownMessage")}
                        </Typography>
                    </Pressable>
                    {templates.map((template) => (
                        <Pressable
                            key={template.id}
                            onPress={() => chooseTemplate(template)}
                            style={[
                                styles.templateChip,
                                { borderColor: colors.border },
                                selectedTemplateId === template.id && { borderColor: colors.primary, backgroundColor: `${colors.primary}15` },
                            ]}
                        >
                            <Typography variant="body-small" color="secondary">
                                {template.name}
                            </Typography>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
            {templates.length === 0 && (
                <Typography variant="body-small" color="muted">
                    {t("customerMessages.noTemplatesTab")}
                </Typography>
            )}
            <Input
                value={message}
                onChangeText={(text) => { resetSendProgress(); setMessage(text); }}
                placeholder={t("customerMessages.messagePlaceholder")}
                multiline
                inputStyle={styles.messageInput}
            />
        </>
    );

    const renderSendStep = () => (
        <>
            {renderSkipped()}
            <Card style={styles.progressCard}>
                <Typography variant="heading-small" color="primary">
                    {t("customerMessages.reviewRecipients")}
                </Typography>
                <Typography variant="body-small" color="muted">
                    {t("customerMessages.sendProgress", { current: openedCount, total: validCustomers.length })}
                </Typography>
                <Typography variant="body-small" color="muted">
                    {t("customerMessages.composerOpenedNote")}
                </Typography>
            </Card>
            <View>
                {validCustomers.map((customer) => {
                    const isOpened = openedRecipientIds.has(customer.id);
                    return (
                        <Card
                            key={customer.id.toString()}
                            style={[
                                styles.reviewRecipientCard,
                                ...(isOpened ? [{ borderColor: colors.success, backgroundColor: `${colors.success}12` }] : []),
                            ]}
                        >
                            <View style={[styles.customerRow, false && styles.rowRTL]}>
                                <Ionicons
                                    name={isOpened ? "checkmark-circle" : "ellipse-outline"}
                                    size={22}
                                    color={isOpened ? colors.success : colors.text.muted}
                                />
                                <View style={styles.customerText}>
                                    <Typography variant="body-medium" color="primary">
                                        {customer.name}
                                    </Typography>
                                    <Typography variant="body-small" color="muted">
                                        {customer.phone}
                                    </Typography>
                                </View>
                                <Typography variant="body-small" color={isOpened ? "success" : "muted"}>
                                    {isOpened ? t("customerMessages.opened") : t("customerMessages.pending")}
                                </Typography>
                            </View>
                        </Card>
                    );
                })}
            </View>
        </>
    );

    const renderSendActions = () => {
        if (section !== "send") return null;

        return (
            <View
                style={[
                    styles.stickyActions,
                    {
                        paddingBottom: sendStep === "recipients" ? Spacing.sm : insets.bottom + Spacing.md,
                        backgroundColor: colors.surface,
                        borderTopColor: colors.border,
                    },
                ]}
            >
                {!!sendError && sendStep !== "recipients" && (
                    <Typography variant="body-small" color="danger">
                        {sendError}
                    </Typography>
                )}
                {sendStep === "recipients" && (
                    <Button
                        title={t("customerMessages.next")}
                        onPress={() => { resetSendProgress(); setSendStep("message"); }}
                        disabled={selectedCustomers.length === 0}
                    />
                )}
                {sendStep === "message" && (
                    <View style={[styles.stepActions, false && styles.rowRTL]}>
                        <Button title={t("customerMessages.back")} variant="secondary" onPress={() => { resetSendProgress(); setSendStep("recipients"); }} style={styles.actionButton} />
                        <Button title={t("customerMessages.next")} onPress={goToSendStep} style={styles.actionButton} />
                    </View>
                )}
                {sendStep === "send" && (
                    <>
                        {!isSendComplete && (
                            <View style={[styles.stepActions, false && styles.rowRTL]}>
                                <Button
                                    title={openedCount === 0 ? t("customerMessages.back") : t("customerMessages.cancelRemaining")}
                                    variant="secondary"
                                    onPress={() => { resetSendProgress(); setSendStep("message"); }}
                                    style={styles.actionButton}
                                />
                                {sendMode === "individual" && (
                                    <Button
                                        title={currentIndex === 0 ? t("customerMessages.openFirstMessage") : t("customerMessages.openNextMessage")}
                                        onPress={openNextMessage}
                                        disabled={isOpening || currentIndex >= validCustomers.length}
                                        style={styles.actionButton}
                                    />
                                )}
                                {sendMode === "group" && (
                                    <Button
                                        title={t("customerMessages.openGroupMessage", { count: validCustomers.length })}
                                        onPress={openGroupMessage}
                                        disabled={isOpening || openedCount > 0}
                                        style={styles.actionButton}
                                    />
                                )}
                            </View>
                        )}
                        {isSendComplete && (
                            <Button title={t("customerMessages.newMessage")} onPress={prepareAnotherMessage} />
                        )}
                    </>
                )}
            </View>
        );
    };

    const sendOpacity = sectionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const templatesOpacity = sectionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    const renderSection = () => (
        <View style={{ flex: 1 }}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: sendOpacity }]} pointerEvents={section === "send" ? "auto" : "none"}>
                {renderSendSection()}
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: templatesOpacity }]} pointerEvents={section === "templates" ? "auto" : "none"}>
                <View style={{ flex: 1 }}>
                    {renderTemplatesSection()}
                </View>
            </Animated.View>
        </View>
    );

    const renderSendSection = () => (
        <View style={{ flex: 1 }}>
            {sendStep === "recipients" ? (
                renderRecipientsStep()
            ) : (
                <ScrollView
                    style={styles.sendContent}
                    contentContainerStyle={[styles.content, { paddingBottom: Spacing.lg }]}
                    refreshControl={undefined}
                >
                    {sendStep === "message" && renderMessageStep()}
                    {sendStep === "send" && renderSendStep()}
                </ScrollView>
            )}
        </View>
    );

    const renderTemplatesSection = () => (
        <View style={{ flex: 1 }}>
            <FlatList
            data={templates}
            keyExtractor={(item) => item.id?.toString() || item.name}
            contentContainerStyle={[styles.templateList, { paddingBottom: insets.bottom + 100 }]}
            renderItem={({ item }) => (
                <Pressable onPress={() => openTemplateEditor(item)}>
                    <Card style={styles.templateCard}>
                        <View style={[styles.sectionTitleRow, false && styles.rowRTL]}>
                            <Typography variant="heading-small" color="primary">
                                {item.name}
                            </Typography>
                            <Pressable onPress={() => deleteTemplate(item)}>
                                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            </Pressable>
                        </View>
                        <Typography variant="body-small" color="muted" numberOfLines={3}>
                            {item.body}
                        </Typography>
                    </Card>
                </Pressable>
            )}
            ListEmptyComponent={
                <View style={styles.empty}>
                    <Ionicons name="chatbox-ellipses-outline" size={48} color={colors.text.muted} />
                    <Typography variant="heading-small" color="secondary">
                        {t("messageTemplates.emptyTitle")}
                    </Typography>
                    <Typography variant="body-small" color="muted" style={styles.centerText}>
                        {t("messageTemplates.emptyMessage")}
                    </Typography>
                </View>
            }
        />
    </View>
    );

    if (!db || loading) {
        return <LoadingScreen />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <View style={[styles.headerTopRow, false && styles.rowRTL]}>
                    <View style={[styles.headerTitleRow, false && styles.rowRTL]}>
                        <View style={[styles.headerIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                            <Ionicons name="chatbubble-ellipses" size={28} color={colors.primary} />
                        </View>
                        <View style={styles.headerText}>
                            <Typography variant="heading-large" color="primary">
                                {t("customerMessages.tabTitle")}
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                {t("customerMessages.subtitle")}
                            </Typography>
                        </View>
                    </View>
                    <Pressable
                        onPress={toggleSection}
                        accessibilityRole="button"
                        accessibilityLabel={section === "send" ? t("customerMessages.templatesTab") : t("customerMessages.sendTab")}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.sectionSwitchButton,
                            { backgroundColor: `${colors.primary}15`, borderColor: colors.border },
                            pressed && styles.sectionSwitchButtonPressed,
                        ]}
                    >
                        <Ionicons name={section === "send" ? "document-text-outline" : "send-outline"} size={23} color={colors.primary} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.sectionContainer}>
                {renderSection()}
            </View>

            {renderSendActions()}

            {section === "templates" && (
                <Pressable
                    onPress={() => openTemplateEditor()}
                    accessibilityRole="button"
                    accessibilityLabel={t("messageTemplates.create")}
                    hitSlop={8}
                    style={({ pressed }) => [
                        styles.templateFab,
                        { bottom: insets.bottom + Spacing.lg, backgroundColor: colors.primary, shadowColor: colors.primary },
                        pressed && styles.templateFabPressed,
                    ]}
                >
                    <Ionicons name="add" size={30} color="#FFFFFF" />
                </Pressable>
            )}

            <Modal visible={!!editing} transparent animationType="fade" onRequestClose={closeTemplateEditor}>
                <View style={styles.backdrop}>
                    <Card style={[styles.editor, { backgroundColor: colors.surface }]}>
                        <Typography variant="heading-large" color="primary">
                            {editing?.id ? t("messageTemplates.edit") : t("messageTemplates.create")}
                        </Typography>
                        <Input placeholder={t("messageTemplates.namePlaceholder")} value={templateName} onChangeText={setTemplateName} />
                        <Input placeholder={t("messageTemplates.bodyPlaceholder")} value={templateBody} onChangeText={setTemplateBody} multiline inputStyle={styles.templateBodyInput} />
                        <Typography variant="small-small" color="muted">
                            {t("messageTemplates.placeholders", { placeholders: MESSAGE_TEMPLATE_PLACEHOLDERS.map((item) => `{{${item}}}`).join(", ") })}
                        </Typography>
                        {!!templateError && (
                            <Typography variant="body-small" color="danger">
                                {templateError}
                            </Typography>
                        )}
                        <View style={[styles.editorActions, false && styles.rowRTL]}>
                            <Button title={t("messageTemplates.cancel")} variant="secondary" onPress={closeTemplateEditor} style={styles.actionButton} />
                            <Button title={t("messageTemplates.save")} onPress={saveTemplate} style={styles.actionButton} />
                        </View>
                    </Card>
                </View>
            </Modal>
            {deleteAuthenticationPrompt}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitleRow: {
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    headerText: { flex: 1, minWidth: 0 },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    sectionSwitchButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: Spacing.sm,
    },
    sectionSwitchButtonPressed: { opacity: 0.65 },
    sectionContainer: { flex: 1 },
    sectionPanel: { ...StyleSheet.absoluteFillObject },
    sectionPanelHidden: { opacity: 0 },
    rowRTL: { flexDirection: "row-reverse" },
    sendContent: { flex: 1 },
    content: { padding: Spacing.md, gap: Spacing.md },
    recipientsStep: { flex: 1 },
    recipientsHeader: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.md },
    recipientList: { flex: 1 },
    recipientListContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md, flexGrow: 1 },
    recipientListEmptyContent: { flexGrow: 1 },
    recipientSummary: { minHeight: 48, borderTopWidth: 1, paddingHorizontal: Spacing.md, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    recipientSearch: { marginBottom: 0 },
    customerCard: { padding: Spacing.md, marginBottom: Spacing.sm },
    customerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    customerText: { flex: 1 },
    notice: { padding: Spacing.md },
    modeRow: { flexDirection: "row", gap: Spacing.sm },
    modeOption: { flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderWidth: 1, borderRadius: 12, padding: Spacing.md },
    modeText: { flex: 1 },
    templateRow: { flexDirection: "row", gap: Spacing.sm },
    templateChip: { borderWidth: 1, borderRadius: 18, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    messageInput: { minHeight: 150, textAlignVertical: "top" },
    progressCard: { padding: Spacing.lg, gap: Spacing.sm },
    reviewRecipientCard: { padding: Spacing.md, marginBottom: Spacing.sm },
    completeIcon: { alignItems: "center", marginTop: Spacing.xxl },
    centerText: { textAlign: "center" },
    templateList: { flexGrow: 1, padding: Spacing.md, gap: Spacing.sm },
    templateCard: { padding: Spacing.md },
    templateFab: {
        position: "absolute",
        right: Spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    templateFabPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm, padding: Spacing.xxl },
    backdrop: { flex: 1, justifyContent: "center", padding: Spacing.lg, backgroundColor: "#00000080" },
    editor: { padding: Spacing.lg, gap: Spacing.sm },
    templateBodyInput: { minHeight: 130, textAlignVertical: "top" },
    stepActions: { flexDirection: "row", gap: Spacing.sm },
    stickyActions: { borderTopWidth: 1, gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
    editorActions: { flexDirection: "row", gap: Spacing.sm },
    actionButton: { flex: 1 },
    footer: { padding: Spacing.md, alignItems: "center" },
});
