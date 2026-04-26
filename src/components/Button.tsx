import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../constants';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = React.memo(({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}) => {
  const backgroundColor = useMemo(() => {
    if (disabled) return Colors.border;
    switch (variant) {
      case 'primary': return Colors.button.primary;
      case 'secondary': return Colors.button.secondary;
      case 'danger': return Colors.button.danger;
      default: return Colors.button.primary;
    }
  }, [variant, disabled]);

  const borderColor = useMemo(() => {
    if (variant === 'secondary') return Colors.primary;
    return 'transparent';
  }, [variant]);

  const textColor = useMemo(() => {
    if (disabled) return Colors.text.muted;
    if (variant === 'secondary') return Colors.primary;
    return Colors.text.primary;
  }, [variant, disabled]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontSize: Typography.body.medium,
    fontWeight: Typography.weight.semibold,
  },
});
