import { Ionicons } from "@expo/vector-icons";
import * as SMS from "expo-sms";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button, Card, Input, Typography } from "../components";
import { Spacing } from "../constants";
import { useCustomersWithAccounts } from "../hooks/useCustomersWithAccounts";
import { CustomerId, CustomerWithAccounts, MessageTemplate } from "../models";
import { MessageTemplateService } from "../services/MessageTemplateService";
import { useDatabaseContext, useTheme } from "../store";
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
    const { colors } = useTheme();    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { customers, loading } = useCustomersWithAccounts(db);
    const service = useMemo(() => (db ? new MessageTemplateService(db) : null), [db]);
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
                ...(customer.accounts?.map((account) => account.account_number) || []),
            ].some((value) => value?.toLowerCase().includes(query)),
        );
    }, [customers, recipientSearch]);
    const validCustomers = useMemo<MessageRecipient[]>(
        () => selectedCustomers.filter((customer) => hasValidSmsPhone(customer.phone)),
        [selectedCustomers],
    );
    const skippedCustomers = useMemo(
        () => selectedCustomers.filter((customer) => !hasValidSmsPhone(customer.phone)),
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

    const validateMessage = async () => {
        if (!message.trim()) {
            setSendError(t("customerMessages.messageRequired"));
            return false;
        }
        const unsupported = getUnsupportedPlaceholders(message);
        if (unsupported.length > 0) {
            setSendError(t("messageTemplates.unsupported", { placeholders: unsupported.join(", ") }));
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
        } catch {}
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
            setOpenedRecipientIds(new Set(validCustomers.map((customer) => customer.id)));
            setSendError("");
        } catch {
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
        } catch {
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
            setTemplateError(t("messageTemplates.unsupported", { placeholders: unsupported.join(", ") }));
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
        Alert.alert(t("messageTemplates.deleteTitle"), template.name, [
            { text: t("messageTemplates.cancel"), style: "cancel" },
            {
                text: t("messageTemplates.delete"),
                style: "destructive",
                onPress: async () => {
                    await service.delete(template.id!);
                    if (selectedTemplateId === template.id) {
                        setSelectedTemplateId(undefined);
                        setMessage("");
                    }
                    await loadTemplates();
                },
            },
        ]);
    };

    const renderSkipped = () =>
        skippedCustomers.length > 0 ? (
            <Card style={[styles.notice, { backgroundColor: `${colors.warning}15` }]}>
                <Typography variant="body-small" color="warning">
                    {t("customerMessages.skipped", {
                        count: skippedCustomers.length,
                        names: skippedCustomers.map((customer) => customer.name).join(", "),
                    })}
                </Typography>
            </Card>
        ) : null;

    const renderStepIndicator = () => {
        const steps: SendStep[] = ["recipients", "message", "send"];
        const activeIndex = steps.indexOf(sendStep);

        return (
            <View style={[styles.stepIndicator, false && styles.rowRTL]}>
                {steps.map((step, index) => {
                    const isActive = step === sendStep;
                    const isDone = index < activeIndex;

                    return (
                        <React.Fragment key={step}>
                            <View style={styles.stepItem}>
                                <View
                                    style={[
                                        styles.stepCircle,
                                        {
                                            backgroundColor:
                                                isActive || isDone
                                                    ? colors.primary
                                                    : colors.surface,
                                            borderColor:
                                                isActive || isDone
                                                    ? colors.primary
                                                    : colors.border,
                                        },
                                    ]}
                                >
                                    <Typography
                                        variant="small-small"
                                        color={isActive || isDone ? "primary" : "muted"}
                                        style={[
                                            isActive || isDone
                                                ? { color: "#FFFFFF" }
                                                : null,
                                        ]}
                                    >
                                        {index + 1}
                                    </Typography>
                                </View>
                                <Typography
                                    variant="small-small"
                                    color={isActive ? "primary" : "muted"}
                                    style={styles.centerText}
                                >
                                    {t(`customerMessages.step${step[0].toUpperCase()}${step.slice(1)}`)}
                                </Typography>
                            </View>
                            {index < steps.length - 1 && (
                                <View
                                    style={[
                                        styles.stepDivider,
                                        {
                                            backgroundColor:
                                                index < activeIndex
                                                    ? colors.primary
                                                    : colors.border,
                                        },
                                    ]}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>
        );
    };

    const renderRecipientsStep = () => (
        <>
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
            <View>
                {filteredCustomers.map((item) => {
                    const isSelected =
                        item.id !== undefined && selectedIds.has(item.id);
                    return (
                        <Pressable
                            key={item.id?.toString() || item.name}
                            onPress={() => item.id && toggleCustomer(item.id)}
                        >
                            <Card
                                style={[
                                    styles.customerCard,
                                    ...(isSelected
                                        ? [
                                              {
                                                  borderColor: colors.primary,
                                                  backgroundColor: `${colors.primary}12`,
                                              },
                                          ]
                                        : []),
                                ]}
                            >
                                <View style={[styles.customerRow, false && styles.rowRTL]}>
                                    <Ionicons
                                        name={isSelected ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={
                                            isSelected
                                                ? colors.primary
                                                : colors.text.muted
                                        }
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
                })}
                {!loading && customers.length === 0 && (
                    <View style={styles.empty}>
                        <Typography variant="body-small" color="muted">
                            {t("customers.emptyTitle")}
                        </Typography>
                    </View>
                )}
                {!loading &&
                    customers.length > 0 &&
                    filteredCustomers.length === 0 && (
                        <View style={styles.empty}>
                            <Ionicons
                                name="search-outline"
                                size={36}
                                color={colors.text.muted}
                            />
                            <Typography variant="body-small" color="muted">
                                {t("customerMessages.noRecipientsFound")}
                            </Typography>
                        </View>
                    )}
            </View>
            <Typography variant="body-small" color="muted">
                {t("customerMessages.selectedCount", {
                    count: selectedCustomers.length,
                })}
            </Typography>
            {renderSkipped()}
        </>
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
                        onPress={() => {
                            resetSendProgress();
                            setSendMode(mode);
                        }}
                        style={[
                            styles.modeOption,
                            { borderColor: colors.border },
                            sendMode === mode && {
                                borderColor: colors.primary,
                                backgroundColor: `${colors.primary}15`,
                            },
                        ]}
                    >
                        <Ionicons
                            name={
                                mode === "individual"
                                    ? "person-outline"
                                    : "people-outline"
                            }
                            size={20}
                            color={
                                sendMode === mode
                                    ? colors.primary
                                    : colors.text.muted
                            }
                        />
                        <View style={styles.modeText}>
                            <Typography
                                variant="body-medium"
                                color={sendMode === mode ? "primary" : "secondary"}
                            >
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
                <Card
                    style={[
                        styles.notice,
                        { backgroundColor: `${colors.primary}10` },
                    ]}
                >
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
                            selectedTemplateId === undefined && {
                                borderColor: colors.primary,
                                backgroundColor: `${colors.primary}15`,
                            },
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
                                selectedTemplateId === template.id && {
                                    borderColor: colors.primary,
                                    backgroundColor: `${colors.primary}15`,
                                },
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
                onChangeText={(text) => {
                    resetSendProgress();
                    setMessage(text);
                }}
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
                    {t("customerMessages.sendProgress", {
                        current: openedCount,
                        total: validCustomers.length,
                    })}
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
                                ...(isOpened
                                    ? [
                                          {
                                              borderColor: colors.success,
                                              backgroundColor: `${colors.success}12`,
                                          },
                                      ]
                                    : []),
                            ]}
                        >
                            <View style={[styles.customerRow, false && styles.rowRTL]}>
                                <Ionicons
                                    name={
                                        isOpened
                                            ? "checkmark-circle"
                                            : "ellipse-outline"
                                    }
                                    size={22}
                                    color={
                                        isOpened
                                            ? colors.success
                                            : colors.text.muted
                                    }
                                />
                                <View style={styles.customerText}>
                                    <Typography variant="body-medium" color="primary">
                                        {customer.name}
                                    </Typography>
                                    <Typography variant="body-small" color="muted">
                                        {customer.phone}
                                    </Typography>
                                </View>
                                <Typography
                                    variant="body-small"
                                    color={isOpened ? "success" : "muted"}
                                >
                                    {isOpened
                                        ? t("customerMessages.opened")
                                        : t("customerMessages.pending")}
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
                        paddingBottom: insets.bottom + Spacing.md,
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
                        onPress={() => {
                            resetSendProgress();
                            setSendStep("message");
                        }}
                        disabled={selectedCustomers.length === 0}
                    />
                )}
                {sendStep === "message" && (
                    <View style={[styles.stepActions, false && styles.rowRTL]}>
                        <Button
                            title={t("customerMessages.back")}
                            variant="secondary"
                            onPress={() => {
                                resetSendProgress();
                                setSendStep("recipients");
                            }}
                            style={styles.actionButton}
                        />
                        <Button
                            title={t("customerMessages.next")}
                            onPress={goToSendStep}
                            style={styles.actionButton}
                        />
                    </View>
                )}
                {sendStep === "send" && (
                    <>
                        {!isSendComplete && (
                            <View style={[styles.stepActions, false && styles.rowRTL]}>
                                <Button
                                    title={
                                        openedCount === 0
                                            ? t("customerMessages.back")
                                            : t("customerMessages.cancelRemaining")
                                    }
                                    variant="secondary"
                                    onPress={() => {
                                        resetSendProgress();
                                        setSendStep("message");
                                    }}
                                    style={styles.actionButton}
                                />
                                {sendMode === "individual" && (
                                    <Button
                                        title={
                                            currentIndex === 0
                                                ? t("customerMessages.openFirstMessage")
                                                : t("customerMessages.openNextMessage")
                                        }
                                        onPress={openNextMessage}
                                        disabled={
                                            isOpening ||
                                            currentIndex >= validCustomers.length
                                        }
                                        style={styles.actionButton}
                                    />
                                )}
                                {sendMode === "group" && (
                                    <Button
                                        title={t("customerMessages.openGroupMessage", {
                                            count: validCustomers.length,
                                        })}
                                        onPress={openGroupMessage}
                                        disabled={isOpening || openedCount > 0}
                                        style={styles.actionButton}
                                    />
                                )}
                            </View>
                        )}
                        {isSendComplete && (
                            <Button
                                title={t("customerMessages.newMessage")}
                                onPress={prepareAnotherMessage}
                            />
                        )}
                    </>
                )}
            </View>
        );
    };

    const renderSendSection = () => (
        <ScrollView
            style={styles.sendContent}
            contentContainerStyle={[
                styles.content,
                { paddingBottom: Spacing.lg },
            ]}
            refreshControl={undefined}
        >
            {sendStep === "recipients" && renderRecipientsStep()}
            {sendStep === "message" && renderMessageStep()}
            {sendStep === "send" && renderSendStep()}
        </ScrollView>
    );

    const renderTemplatesSection = () => (
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
            ListHeaderComponent={
                <Button title={t("messageTemplates.create")} onPress={() => openTemplateEditor()} />
            }
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
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + Spacing.md,
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <View
                    style={[
                        styles.headerTopRow,
                        false && styles.rowRTL,
                    ]}
                >
                    <View
                        style={[
                            styles.headerTitleRow,
                            false && styles.rowRTL,
                        ]}
                    >
                        <View
                            style={[
                                styles.headerIconContainer,
                                { backgroundColor: `${colors.primary}20` },
                            ]}
                        >
                            <Ionicons
                                name="chatbubble-ellipses"
                                size={28}
                                color={colors.primary}
                            />
                        </View>
                        <View>
                            <Typography variant="heading-large" color="primary">
                                {t("customerMessages.tabTitle")}
                            </Typography>
                            <Typography variant="body-small" color="muted">
                                {t("customerMessages.subtitle")}
                            </Typography>
                        </View>
                    </View>
                </View>
            </View>
            <View
                style={[
                    styles.tabBar,
                    {
                        backgroundColor: colors.background,
                    },
                ]}
            >
                <View style={[styles.tabs, false && styles.rowRTL]}>
                    {(["send", "templates"] as const).map((item) => (
                        <Pressable
                            key={item}
                            onPress={() => setSection(item)}
                            style={[
                                styles.tab,
                                section === item && {
                                    backgroundColor: `${colors.primary}15`,
                                    borderColor: colors.primary,
                                },
                                { borderColor: section === item ? colors.primary : colors.border },
                            ]}
                        >
                            <Typography variant="body-small" color={section === item ? "primary" : "muted"}>
                                {t(`customerMessages.${item}Tab`)}
                            </Typography>
                        </Pressable>
                    ))}
                </View>
            </View>
            {section === "send" && renderStepIndicator()}
            {section === "send" ? renderSendSection() : renderTemplatesSection()}
            {renderSendActions()}

            <Modal visible={!!editing} transparent animationType="fade" onRequestClose={closeTemplateEditor}>
                <View style={styles.backdrop}>
                    <Card style={[styles.editor, { backgroundColor: colors.surface }]}>
                        <Typography variant="heading-large" color="primary">
                            {editing?.id ? t("messageTemplates.edit") : t("messageTemplates.create")}
                        </Typography>
                        <Input placeholder={t("messageTemplates.namePlaceholder")} value={templateName} onChangeText={setTemplateName} />
                        <Input
                            placeholder={t("messageTemplates.bodyPlaceholder")}
                            value={templateBody}
                            onChangeText={setTemplateBody}
                            multiline
                            inputStyle={styles.templateBodyInput}
                        />
                        <Typography variant="small-small" color="muted">
                            {t("messageTemplates.placeholders", {
                                placeholders: MESSAGE_TEMPLATE_PLACEHOLDERS.map((item) => `{{${item}}}`).join(", "),
                            })}
                        </Typography>
                        {!!templateError && <Typography variant="body-small" color="danger">{templateError}</Typography>}
                        <View style={[styles.editorActions, false && styles.rowRTL]}>
                            <Button title={t("messageTemplates.cancel")} variant="secondary" onPress={closeTemplateEditor} style={styles.actionButton} />
                            <Button title={t("messageTemplates.save")} onPress={saveTemplate} style={styles.actionButton} />
                        </View>
                    </Card>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1 },
    headerTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitleRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    headerIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    tabBar: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
    },
    tabs: { flexDirection: "row", gap: Spacing.sm },
    tab: { flex: 1, alignItems: "center", padding: Spacing.sm, borderWidth: 1, borderRadius: 8 },
    stepIndicator: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.sm,
        gap: Spacing.xs,
    },
    stepItem: {
        alignItems: "center",
        flex: 1,
        gap: Spacing.xs,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    stepDivider: {
        height: 2,
        flex: 0.45,
        marginBottom: 18,
    },
    rowRTL: { flexDirection: "row-reverse" },
    sendContent: { flex: 1 },
    content: { padding: Spacing.md, gap: Spacing.md },
    sectionTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    recipientSearch: { marginBottom: 0 },
    customerCard: { padding: Spacing.md, marginBottom: Spacing.sm },
    customerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    customerText: { flex: 1 },
    notice: { padding: Spacing.md },
    modeRow: { flexDirection: "row", gap: Spacing.sm },
    modeOption: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
    },
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
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.sm, padding: Spacing.xxl },
    backdrop: { flex: 1, justifyContent: "center", padding: Spacing.lg, backgroundColor: "#00000080" },
    editor: { padding: Spacing.lg, gap: Spacing.sm },
    templateBodyInput: { minHeight: 130, textAlignVertical: "top" },
    stepActions: { flexDirection: "row", gap: Spacing.sm },
    stickyActions: {
        borderTopWidth: 1,
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
    },
    editorActions: { flexDirection: "row", gap: Spacing.sm },
    actionButton: { flex: 1 },
});
