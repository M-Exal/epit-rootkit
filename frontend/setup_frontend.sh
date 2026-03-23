#!/bin/bash

# Installation des dépendances
echo "Installation des dépendances..."
npm install crypto-js
npm install

# Lancer le front en arrière-plan
echo "Lancement de 'npm run dev'..."
nohup npm run dev > out.log 2>&1 &

echo "Front lancé (logs dans ~/frontend/out.log)"
echo "Lancement de firefox..."
startx
#made by <3 by Alexis