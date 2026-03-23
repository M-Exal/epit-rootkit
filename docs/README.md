# EpiRootkit

---

## 🎯 Contexte et Objectifs

Ce projet a été réalisé dans le cadre de notre formation en cybersécurité à **EPITA**.  
L'objectif était de concevoir un **rootkit minimaliste et pédagogique** tournant dans l’espace noyau sous **Linux**.

### 🔒 Fonctionnalités principales

- Masquer des processus spécifiques
- 📁 Cacher des fichiers ou dossiers
- 🔊 Camoufler l’écoute de ports réseau
- 🧩 Dissimuler la présence du module lui-même

### 🧠 Compétences mobilisées

- Interaction entre **userland et kernel**
- Compréhension des **hooks système**
- Identification des **failles exploitées par les rootkits**
- Mise en œuvre des **contre-mesures pour durcir un système Linux**

> ⚠️ Ce projet est **strictement à usage éducatif**.  
> Il ne doit en aucun cas être utilisé dans un but **malveillant**.

---

## ⚙️ Utilisation

Placez-vous à la racine du projet.

## Recuperation des images disques des machines virtuelles

Afin de lancer les machines virtuelles, vous aurez besoin de leur image disque. Pour ce faire,
veuillez recuperer les images comme suit:

```bash
https://drive.google.com/file/d/1St1WXg85JAPqEj3G54tlEJg1lKv4UPEr/view?usp=sharing
https://drive.google.com/file/d/1tBMkor8zMGHZTSHNaf0rdITsTRLEqiCf/view?usp=sharing
https://drive.google.com/file/d/1dqkIasMaqb32fg1kF0qfOfWO0tknfA5R/view?usp=sharing
```

Enfin, placez les images telechargees dans le dossier "machines"

---

## Setup de votre interface reaeau

Pour que les machines virtuelles fonctionnent et puissent se reconnaitre entre elles,
il est necessaire de creer sur sa machine un bridge reseau. Si vous lancez le projet pour la premiere fois, merci de lancer le script ci-dessous a la racine du projet:

```bash
avec arch linux : sudo ./setup_bridge.sh
avec ubuntu : ./setup_bridge_v2.sh
```

## 🖥️ Lancement des machines

```bash
./machines/start_attack.sh
./machines/start_victim.sh
```

---

## 🚚 Insertion du frontend + backend sur la machine d’attaque

👉 Insérez le mot de passe `debian` lorsque demandé.

```bash
sudo ./machines/utils/fill_attack.sh
```

---

## 🧬 Insertion du module kernel sur la machine victime

👉 Insérez le mot de passe `debian` lorsque demandé.

```bash
sudo ./machines/utils/fill_victim.sh
```

---

## 🔐 Login de connexion

- **login** : `debian`
- **password** : `debian`

---

## 🧪 Sur la machine d'attaque

### Lancement du Backend

```bash
cd backend && source ./setup.sh && cd -
```

### Lancement du Frontend

```bash
cd frontend && ./setup_frontend.sh
```

### Mot de Passe du Rootkit

rootkit

---

## 🧨 Sur la machine victime

### Insertion du rootkit

```bash
cd rootkit && make
sudo insmod rootkit.ko
```

---

## Troubleshouting

Si au lancement de vos vm vous avez une erreur kvm veuillez entrer cette commande et activer la virtualisation dans le BIOS de votre machine hôte

```bash
sudo modprobe kvm
```