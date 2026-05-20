#!/bin/bash
# Deploy APK para o servidor
# Uso: ./scripts/deploy-apk.sh <versao>
# Exemplo: ./scripts/deploy-apk.sh 1.1.0

KEY=~/.ssh/id_rsa_server_laptop
SERVER=ubuntu@104.234.41.71

NEW_VERSION="${1:-}"

if [ -z "$NEW_VERSION" ]; then
  echo "Erro: informe a versão. Uso: ./scripts/deploy-apk.sh 1.1.0"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APK=$(ls -t "$SCRIPT_DIR"/../build-*.apk 2>/dev/null | head -1)

if [ -z "$APK" ]; then
  echo "Erro: nenhum APK encontrado em $(dirname $SCRIPT_DIR)"
  exit 1
fi

echo "Subindo: $(basename "$APK") (v$NEW_VERSION)"
scp -i "$KEY" "$APK" "$SERVER":~ && \
ssh -i "$KEY" "$SERVER" "
  sudo mv ~/$(basename "$APK") /var/www/html/unecondo.apk &&
  echo '{\"minVersion\":\"$NEW_VERSION\",\"downloadUrl\":\"https://unecondo.online/download/unecondo.apk\"}' | sudo tee /var/www/html/app-version.json > /dev/null &&
  echo 'APK e versão atualizados'
" && \
echo "" && \
echo "✓ APK v$NEW_VERSION disponível em: https://unecondo.online/download/unecondo.apk" && \
echo "✓ Versão mínima atualizada para $NEW_VERSION — apps antigos serão bloqueados"
