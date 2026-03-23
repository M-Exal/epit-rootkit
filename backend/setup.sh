#!/bin/bash

#set la bonne ip

sudo ip route add default via 192.168.100.1

# Supprime l'ancien venv
# rm -rf venv

# Crée un nouveau venv
python3 -m venv venv

# Active le venv dans le shell courant
source venv/bin/activate

# Installe les dépendances
pip install --upgrade pip
pip install flask

# Lance le serveur (avec log)
echo "Lancement de server.py..."
nohup python server.py > out.log 2>&1 &

echo "✅ Environnement activé et server.py lancé (log dans out.log)"
echo "🔁 Pour quitter le venv : 'deactivate'"
