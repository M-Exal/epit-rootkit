#!/bin/bash
###############################################################################
#CE SCRIPT REINITIALISE TOUTES LES VM NE LE LANCER QUE SI VOUS ETES CERTAIN DE
#CE QUE VOUS FAITES
###############################################################################
set -e

BASE_IMG="debian-11-generic-amd64.qcow2"

# Nettoyage des anciennes VMs
pkill -f "qemu-system-x86_64.*diskA.qcow2" || true
pkill -f "qemu-system-x86_64.*diskV.qcow2" || true

# Suppression anciens disques
rm -f diskA.qcow2 diskV.qcow2

# Clonage disques
qemu-img create -f qcow2 -b "$BASE_IMG" -F qcow2 diskA.qcow2 10G
qemu-img create -f qcow2 -b "$BASE_IMG" -F qcow2 diskV.qcow2

# Génération ISO cloud-init
cloud-localds -N cloudinit-V/network-config iso-V-cloudinit.iso cloudinit-V/user-data cloudinit-V/meta-data
cloud-localds -N cloudinit-A/network-config iso-A-cloudinit.iso cloudinit-A/user-data cloudinit-A/meta-data

# Création du bridge réseau br0 (si pas déjà fait)
if ! ip link show br0 &>/dev/null; then
  sudo ip link add br0 type bridge
  sudo ip addr add 192.168.100.1/24 dev br0
  sudo ip link set br0 up
fi

# Lancement VM A (Debian Desktop avec GUI) avec MAC unique
qemu-system-x86_64 \
  -m 2048 -smp 2 \
  -drive file=diskA.qcow2,if=virtio \
  -cdrom iso-A-cloudinit.iso \
  -netdev bridge,id=net0,br=br0 \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:12:34:aa \
  -netdev user,id=netA \
  -device virtio-net-pci,netdev=netA,mac=52:54:00:12:34:ab \
  -display gtk \
  -boot c \
  -enable-kvm \
  -name vmA &

# Lancement VM V (Debian Server, console texte) avec MAC unique différente
qemu-system-x86_64 \
  -m 1024 -smp 1 \
  -drive file=diskV.qcow2,if=virtio \
  -cdrom iso-V-cloudinit.iso \
  -netdev bridge,id=net1,br=br0 \
  -device virtio-net-pci,netdev=net1,mac=52:54:00:12:34:bb \
  -netdev user,id=netV \
  -device virtio-net-pci,netdev=netV,mac=52:54:00:12:34:bc \
  -display gtk \
  -boot c \
  -enable-kvm \
  -name vmV &

###############################################################################
#made by <3 by Alexis
###############################################################################