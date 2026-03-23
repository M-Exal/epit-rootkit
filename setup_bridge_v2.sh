#!/bin/bash

set -e

BRIDGE=br0
TAP0=tap0
TAP1=tap1
BRIDGE_IP=192.168.100.1/24
INTERNET_IF=wlp0s20f3

echo "[+] Création du bridge $BRIDGE s’il n’existe pas..."
if ! ip link show $BRIDGE &>/dev/null; then
    sudo ip link add name $BRIDGE type bridge
fi

echo "[+] Configuration IP sur $BRIDGE..."
sudo ip addr flush dev $BRIDGE
sudo ip addr add $BRIDGE_IP dev $BRIDGE
sudo ip link set $BRIDGE up

for TAP in $TAP0 $TAP1; do
    echo "[+] Création de l’interface $TAP..."
    sudo ip tuntap add dev $TAP mode tap || true
    sudo ip link set $TAP master $BRIDGE
    sudo ip link set $TAP up
done

echo "[+] Activation du forwarding IP..."
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
sudo sed -i 's/^#*net.ipv4.ip_forward=.*/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sudo sysctl -p

echo "[+] Configuration NAT (iptables)..."
sudo iptables -t nat -C POSTROUTING -s 192.168.100.0/24 -o $INTERNET_IF -j MASQUERADE 2>/dev/null \
    || sudo iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -o $INTERNET_IF -j MASQUERADE

sudo iptables -C FORWARD -i $BRIDGE -j ACCEPT 2>/dev/null || sudo iptables -A FORWARD -i $BRIDGE -j ACCEPT
sudo iptables -C FORWARD -o $BRIDGE -m state --state RELATED,ESTABLISHED -j ACCEPT 2>/dev/null \
    || sudo iptables -A FORWARD -o $BRIDGE -m state --state RELATED,ESTABLISHED -j ACCEPT

echo "[✓] Bridge $BRIDGE + NAT prêts !"
ip addr show $BRIDGE

