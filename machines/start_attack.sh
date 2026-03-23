#!/bin/bash

qemu-system-x86_64 \
  -m 2048 -smp 2 \
  -drive file=machines/diskA.qcow2,if=virtio \
  -netdev tap,id=net0,ifname=tap0,script=no,downscript=no \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:12:34:aa \
  -serial stdio \
  -boot c \
  -enable-kvm \
  -name vmA &

