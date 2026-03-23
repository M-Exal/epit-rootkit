#!/bin/bash
set -e

pkill -f "qemu-system-x86_64.*diskA.qcow2" || true
pkill -f "qemu-system-x86_64.*diskV.qcow2" || true

#rm -f diskA.qcow2 diskV.qcow2
#made by <3 by Alexis
#rm -f iso-A-cloudinit.iso iso-V-cloudinit.iso
