import React, { useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useStoreContext, useTheme } from '../store';
import { Typography, Input, Button, ErrorScreen } from '../components';
import { Spacing, Colors } from '../constants';
import { StoreId } from '../models/types';

export const StoresScreen = () => {
    const { activeStore, stores, switchStore, createStore, updateStore } = useStoreContext();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingStoreId, setEditingStoreId] = useState<StoreId | null>(null);
    const [storeName, setStoreName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const handleOpenModal = (storeId?: StoreId, currentName?: string) => {
        if (storeId && currentName) {
            setEditingStoreId(storeId);
            setStoreName(currentName);
        } else {
            setEditingStoreId(null);
            setStoreName('');
        }
        setModalVisible(true);
    };

    const handleCloseModal = () => {
        setModalVisible(false);
        setStoreName('');
        setEditingStoreId(null);
        setError(null);
    };

    const handleSave = async () => {
        if (!storeName.trim()) return;

        setLoading(true);
        setError(null);
        try {
            if (editingStoreId) {
                await updateStore(editingStoreId, { name: storeName.trim() });
            } else {
                await createStore({ name: storeName.trim() });
            }
            handleCloseModal();
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isActive = activeStore?.id === item.id;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.storeRow,
                    {
                        backgroundColor: isActive ? `${colors.primary}12` : colors.surface,
                        borderColor: isActive ? colors.primary : colors.border,
                        borderWidth: 1,
                        opacity: pressed ? 0.8 : 1,
                    }
                ]}
                onPress={() => switchStore(item.id)}
            >
                <View style={[styles.iconBox, { backgroundColor: isActive ? `${colors.primary}20` : `${colors.primary}10` }]}>
                    <Ionicons name="storefront" size={20} color={isActive ? colors.primary : colors.text.muted} />
                </View>
                <View style={styles.storeInfo}>
                    <Typography variant="body-large" color={isActive ? "primary" : "primary"}>
                        {item.name}
                    </Typography>
                    {item.is_default === 1 && (
                        <Typography variant="small-small" color="muted">
                            Default Store
                        </Typography>
                    )}
                </View>

                {isActive && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} style={styles.checkIcon} />
                )}

                <Pressable
                    hitSlop={10}
                    onPress={() => handleOpenModal(item.id, item.name)}
                    style={styles.editButton}
                >
                    <Ionicons name="pencil" size={20} color={colors.text.muted} />
                </Pressable>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, {
                marginTop: insets.top + Spacing.sm,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: "#000",
            }]}>
                <View style={styles.headerTopRow}>
                    <View style={styles.headerTitleRow}>
                        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: `${colors.primary}18` }]}>
                            <Ionicons name="chevron-back" size={20} color={colors.primary} />
                        </Pressable>
                        <View>
                            <Typography variant="heading-large" color="primary">Stores</Typography>
                        </View>
                    </View>
                </View>
            </View>

            <FlatList
                data={stores}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            />

            <Pressable
                style={[styles.fab, { bottom: insets.bottom + 40, backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => handleOpenModal()}
            >
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>

            {/* Modal for adding/editing store */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={handleCloseModal}
            >
                <KeyboardAvoidingView 
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <Typography variant="heading-medium" color="primary" style={styles.modalTitle}>
                            {editingStoreId ? 'Edit Store' : 'Add Store'}
                        </Typography>
                        
                        <Typography variant="body-small" color="muted">Store Name</Typography>
                        <Input
                            value={storeName}
                            onChangeText={setStoreName}
                            placeholder="e.g. Main Branch"
                            autoFocus
                        />

                        {error && (
                            <Typography variant="body-small" color="danger" style={styles.errorText}>
                                {error.message}
                            </Typography>
                        )}

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="secondary"
                                onPress={handleCloseModal}
                                style={styles.modalButton}
                                disabled={loading}
                            />
                            <Button
                                title={loading ? "Saving..." : "Save"}
                                variant="primary"
                                onPress={handleSave}
                                style={styles.modalButton}
                                disabled={!storeName.trim() || loading}
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, flex: 1 },
    backButton: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: 12,
        gap: Spacing.sm,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    storeInfo: { flex: 1 },
    checkIcon: { marginRight: Spacing.xs },
    editButton: {
        padding: Spacing.sm,
    },
    fab: {
        position: 'absolute',
        right: Spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        padding: Spacing.xl,
        borderRadius: 16,
        gap: Spacing.lg,
    },
    modalTitle: { textAlign: 'center' },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    modalButton: { flex: 1 },
    errorText: { marginTop: -Spacing.sm, textAlign: 'center' },
});
