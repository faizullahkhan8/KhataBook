import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStoreContext, useTheme } from '../store';
import { Typography } from './Typography';
import { OptionModal, Option } from './OptionModal';
import { StoreId } from '../models/types';
import { Spacing } from '../constants';

export const StoreSwitcher = () => {
    const { activeStore, stores, switchStore } = useStoreContext();
    const { colors } = useTheme();
    const [modalVisible, setModalVisible] = useState(false);

    const storeOptions = useMemo<Option<StoreId>[]>(() => {
        return stores.map(store => ({
            value: store.id,
            label: store.name,
            icon: 'storefront-outline'
        }));
    }, [stores]);

    const handleSelect = async (id: StoreId) => {
        await switchStore(id);
    };

    if (!activeStore) return null;

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    {
                        backgroundColor: pressed ? `${colors.primary}15` : 'transparent',
                        borderColor: colors.border,
                    }
                ]}
                onPress={() => setModalVisible(true)}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="storefront" size={16} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                    <Typography variant="body-small" color="muted" style={styles.label}>
                        Current Store
                    </Typography>
                    <View style={styles.nameRow}>
                        <Typography variant="body-large" color="primary" numberOfLines={1}>
                            {activeStore.name}
                        </Typography>
                        <Ionicons name="chevron-down" size={14} color={colors.primary} />
                    </View>
                </View>
            </Pressable>

            <OptionModal<StoreId>
                visible={modalVisible}
                title="Switch Store"
                options={storeOptions}
                selected={activeStore.id}
                onSelect={handleSelect}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.md,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.sm,
        borderWidth: 1,
        borderRadius: 12,
        gap: Spacing.sm,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    label: {
        marginBottom: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    }
});
