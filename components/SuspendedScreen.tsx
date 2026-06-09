import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react-native';

interface Props {
  type: 'suspended' | 'network';
  message: string;
  onRetry?: () => void;
}

export function SuspendedScreen({ type, message, onRetry }: Props) {
  const Icon = type === 'network' ? WifiOff : AlertTriangle;
  const title = type === 'network' ? 'Sem conexão' : 'Acesso bloqueado';
  const iconColor = type === 'network' ? '#64748b' : '#f97316';

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, type === 'network' ? styles.iconGray : styles.iconOrange]}>
        <Icon size={36} color={iconColor} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {onRetry && (
        <TouchableOpacity style={styles.btn} onPress={onRetry} activeOpacity={0.8}>
          <RefreshCw size={16} color="white" />
          <Text style={styles.btnText}>Tentar novamente</Text>
        </TouchableOpacity>
      )}

      {type === 'suspended' && (
        <Text style={styles.hint}>
          Esta tela é exibida quando o plano do condomínio não está ativo.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconOrange: { backgroundColor: '#fff7ed' },
  iconGray:   { backgroundColor: '#ffffff' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 20,
  },
  btnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  hint: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
  },
});
