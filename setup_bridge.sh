#!/bin/bash

BRIDGE_NAME="br0"
BRIDGE_IP="192.168.100.1/24"

echo "[+] Désactivation temporaire du firewall..."
if command -v ufw &>/dev/null; then
  sudo ufw disable
else
  echo "ufw non trouvé, flush iptables..."
  sudo iptables -F
  sudo iptables -X
  sudo iptables -t nat -F
  sudo iptables -t nat -X
fi

echo "Création de l'interface bridge $BRIDGE_NAME..."
sudo ip link add name $BRIDGE_NAME type bridge

echo "Configuration IP sur $BRIDGE_NAME..."
sudo ip addr add $BRIDGE_IP dev $BRIDGE_NAME

echo "Activation de l'interface $BRIDGE_NAME..."
sudo ip link set dev $BRIDGE_NAME up

# === Résumé ===
echo "Bridge $BRIDGE_NAME configuré avec l'adresse $BRIDGE_IP"
ip addr show $BRIDGE_NAME
