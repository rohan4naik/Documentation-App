import { Pressable, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';

interface ButtonProps {
  onPress?: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export function Button({ onPress, title, variant = 'primary', style, textStyle, disabled }: ButtonProps) {
  const getContainerStyle = (pressed: boolean) => [
    styles.base,
    styles[variant],
    pressed && styles[`${variant}Pressed`],
    disabled && styles.disabled,
    style,
  ];

  const getTextStyle = () => [
    styles.textBase,
    styles[`${variant}Text`],
    textStyle,
  ];

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }: { pressed: boolean }) => getContainerStyle(pressed)}>
      <Text style={getTextStyle()}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  textBase: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  // Primary
  primary: {
    backgroundColor: '#2563eb', // blue-600
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPressed: {
    backgroundColor: '#1d4ed8', // blue-700
    transform: [{ scale: 0.98 }],
  },
  primaryText: {
    color: '#ffffff',
  },
  // Secondary
  secondary: {
    backgroundColor: '#1e293b', // slate-800
  },
  secondaryPressed: {
    backgroundColor: '#334155', // slate-700
    transform: [{ scale: 0.98 }],
  },
  secondaryText: {
    color: '#f1f5f9', // slate-100
  },
  // Outline
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
  },
  outlinePressed: {
    backgroundColor: '#1e293b',
    transform: [{ scale: 0.98 }],
  },
  outlineText: {
    color: '#cbd5e1', // slate-300
  },
  // Ghost
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    transform: [{ scale: 0.98 }],
  },
  ghostText: {
    color: '#94a3b8', // slate-400
  },
});
