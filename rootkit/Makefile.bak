KERNELDIR ?= /lib/modules/$(shell uname -r)/build

PWD := $(shell pwd)

obj-m := rootkit.o

modules:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) modules

clean:
	$(RM) *.o *~ core .depend .*.cmd *.ko *.mod.c \
		-rf .tmp_versions *.mod *.order *.symvers

.PHONY: modules clean

