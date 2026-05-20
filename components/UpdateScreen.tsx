import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Download, Smartphone } from 'lucide-react-native';
import { getCurrentVersion } from '../lib/version';

interface Props {
  downloadUrl: string;
}

export function UpdateScreen({ downloadUrl }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Smartphone size={36} color="#f97316" />
      </View>

      <Text style={styles.title}>Atualização necessária</Text>
      <Text style={styles.message}>
        Uma nova versão do Unecondo está disponível. Atualize o aplicativo para continuar.
      </Text>
      <Text style={styles.version}>Versão atual: {getCurrentVersion()}</Text>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => Linking.openURL(downloadUrl)}
        activeOpacity={0.8}
      >
        <Download size={16} color="white" />
        <Text style={styles.btnText}>Baixar atualização</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    color: '#475569',
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
  },
  btnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
