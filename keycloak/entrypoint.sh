#!/bin/bash
set -e

# Start Keycloak in the background (imports realm from /opt/keycloak/data/import/)
/opt/keycloak/bin/kc.sh start-dev --import-realm &
KC_PID=$!

# Wait until Keycloak's admin API responds
echo "[init] Waiting for Keycloak..."
until /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user "${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}" \
  --password "${KC_BOOTSTRAP_ADMIN_PASSWORD:-admin}" > /dev/null 2>&1; do
  sleep 3
done

# Disable HTTPS requirement so admin UI works over plain HTTP in dev
echo "[init] Disabling HTTPS requirement on master and local realms..."
/opt/keycloak/bin/kcadm.sh update realms/master     -s sslRequired=NONE
/opt/keycloak/bin/kcadm.sh update realms/kommuninvanare -s sslRequired=NONE 2>/dev/null || true
/opt/keycloak/bin/kcadm.sh update realms/employees  -s sslRequired=NONE 2>/dev/null || true

# Synka LDAP-grupper till Keycloak så de syns i JWT direkt
echo "[init] Syncing LDAP groups..."
FEDERATION_ID=$(/opt/keycloak/bin/kcadm.sh get components \
  --target-realm employees \
  -q type=org.keycloak.storage.UserStorageProvider 2>/dev/null \
  | grep '"id"' | head -1 | grep -o '"[^"]*"$' | tr -d '"')

if [ -n "$FEDERATION_ID" ]; then
  /opt/keycloak/bin/kcadm.sh create \
    "user-storage/${FEDERATION_ID}/sync?action=triggerFullSync" \
    --target-realm employees 2>/dev/null || true
  echo "[init] LDAP sync done (federation: $FEDERATION_ID)"
else
  echo "[init] No LDAP federation found, skipping sync"
fi

echo "[init] Done — admin UI available at http://localhost:${KC_PORT:-7080}"

wait $KC_PID
