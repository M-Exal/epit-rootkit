import socket
import select
from flask import Flask, request, jsonify, make_response
import threading
import queue
import os

DOWNLOAD_DIR = os.path.expanduser('~/Download')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
app = Flask(__name__)
tcp_clients = []
tcp_server_socket = None

TCP_HOST = '0.0.0.0'
TCP_PORT = 4242

# Queue pour stocker les données reçues du TCP
tcp_data_queue = queue.Queue()

# === Partie TCP ===
def start_tcp_server():
    global tcp_server_socket

    tcp_server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp_server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    tcp_server_socket.bind((TCP_HOST, TCP_PORT))
    tcp_server_socket.listen()
    print(f"🚀 Serveur TCP prêt sur le port {TCP_PORT}")

    current_download = {}

    while True:
        read_sockets, _, _ = select.select([tcp_server_socket] + tcp_clients, [], [])

        for s in read_sockets:
            if s is tcp_server_socket:
                client_socket, addr = tcp_server_socket.accept()
                tcp_clients.append(client_socket)
                print(f"✅ Client connecté depuis {addr}")
            else:
                try:
                    data = s.recv(1024)
                    if not data:
                        print(f"❌ Client déconnecté")
                        tcp_clients.remove(s)
                        s.close()
                        continue
                    decoded = data.decode().strip()
                    print(f"📥 Reçu du client: {decoded}")
                    tcp_data_queue.put(decoded)
                except Exception as e:
                    print(f"🔥 Erreur sur le client: {e}")
                    if s in current_download:
                        current_download[s].close()
                        del current_download[s]
                    tcp_clients.remove(s)
                    s.close()

# === Partie HTTP / Flask ===
@app.route('/api/send', methods=['POST', 'OPTIONS'])
def send_command():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    json_data = request.get_json()
    command = json_data.get('command')

    if not command:
        return jsonify(success=False, message="Commande manquante"), 400

    print(f"📤 Commande reçue depuis l'API : {command}")

    to_remove = []

    for client in tcp_clients:
        try:
            client.sendall(command.encode())
        except Exception as e:
            print(f"🔥 Erreur lors de l'envoi au client: {e}")
            to_remove.append(client)

    for client in to_remove:
        tcp_clients.remove(client)

    tcp_data = ""
    try:
        while True:
            tcp_data += tcp_data_queue.get(timeout=1)
    except queue.Empty:
        print("❗ Timeout : Aucune donnée TCP reçue dans les délais")

    if command.startswith("download "):
        try:
            path = command.split(" ", 1)[1]
            filename = os.path.basename(path)
            download_path = os.path.expanduser(f"~/Download/{filename}")
            with open(download_path, "w") as f:
                f.write(tcp_data)
            print(f"💾 Données enregistrées dans : {download_path}")
        except Exception as e:
            print(f"⚠️ Erreur lors de l'enregistrement du fichier : {e}")

    response_data = {
        "success": True,
        "message": "Commande envoyée",
        "tcp_data": tcp_data if tcp_data else "Aucune donnée reçue"
    }
    response = jsonify(response_data)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

#made by <3 Alexis, Antoine
@app.route('/api/status', methods=['GET'])
def get_status():
    response = jsonify({
        "connected": len(tcp_clients) > 0
    })
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


if __name__ == '__main__':
    tcp_thread = threading.Thread(target=start_tcp_server, daemon=True)
    tcp_thread.start()

    # Lancer Flask
    app.run(port=3001, debug=False)
