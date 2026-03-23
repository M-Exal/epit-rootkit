# 🖥️ Machines Virtuelles

Le projet repose sur **deux machines virtuelles** distinctes, conçues spécifiquement pour simuler un scénario d’attaque :

## 🧨 Machine Attaquante (A)

Cette machine embarque :

- ✅ Un **frontend** minimaliste s'exécutant dans un Firefox modifié pour une interface épurée (onglets masqués, etc.)
- ✅ Un **backend** Python qui communique avec la machine victime

Un script dédié permet de lancer l’interface utilisateur automatiquement, simplifiant les tests.

## 🛡️ Machine Victime (V)

La machine victime est configurée via un script qui :

- copie le code du **rootkit**
- exécute `make` pour compiler le module
- insère le module kernel via `insmod`

---

## 📀 Images disque préconfigurées

Afin de simplifier le déploiement et éviter les configurations répétitives, nous avons fourni **trois images disque prêtes à l’emploi** :

```bash
https://drive.google.com/file/d/1St1WXg85JAPqEj3G54tlEJg1lKv4UPEr/view?usp=sharing
https://drive.google.com/file/d/1tBMkor8zMGHZTSHNaf0rdITsTRLEqiCf/view?usp=sharing
https://drive.google.com/file/d/1dqkIasMaqb32fg1kF0qfOfWO0tknfA5R/view?usp=sharing
```

Placez-les dans le dossier `machines/` comme indiqué dans la documentation.

---

## 🕸️ Infrastructure réseau

Le **réseau** a été le point le plus délicat à configurer. Afin d'assurer :

- 🌍 un accès internet aux deux machines
- 🔄 une communication directe entre elles

Nous avons mis en place un **bridge réseau** sur la machine hôte.

Un script adapté à votre distribution permet une configuration automatique :

```bash
# Pour Arch Linux
sudo ./setup_bridge.sh

# Pour Ubuntu/Debian
./setup_bridge_v2.sh
```

## 🛠️ Hyperviseur

Les machines virtuelles sont gérées à l’aide de QEMU, contrôlé par les scripts fournis dans le dossier machines/.
Cela nous permet de simuler un environnement fidèle à une architecture réelle, tout en gardant un contrôle total sur les couches système.
