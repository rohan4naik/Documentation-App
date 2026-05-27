import { View, TextInput, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native';
import { Search } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
  icon?: boolean;
}

export function Input({ containerStyle, icon, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {icon && (
        <View style={styles.iconContainer}>
          <Search color="#94a3b8" size={18} />
        </View>
      )}
      <TextInput
        style={[styles.input, icon && styles.inputWithIcon, style]}
        placeholderTextColor="#64748b"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#ffffff', // white
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b', // slate-800
  },
  inputWithIcon: {
    paddingLeft: 40,
  },
});
