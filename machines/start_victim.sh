#!/bin/bash

qemu-system-x86_64 \
  -m 1024 -smp 1 \
  -drive file=machines/diskV.qcow2,if=virtio \
  -netdev tap,id=net1,ifname=tap1,script=no,downscript=no \
  -device virtio-net-pci,netdev=net1,mac=52:54:00:12:34:bb \
  -serial stdio \
  -boot c \
  -enable-kvm \
  -name vmV &

