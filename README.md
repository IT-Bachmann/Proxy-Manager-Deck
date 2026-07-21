# ProxyDeck

> Das Projekt hieß in der frühen Entwicklungsphase „Relaydeck“. Hinweise für bestehende Testinstallationen stehen in [`MIGRATION_TO_PROXYDECK.md`](MIGRATION_TO_PROXYDECK.md).

> **Early preview:** ProxyDeck is under active development and has not yet received an independent security audit. Test backups and provider integrations before production use.

ProxyDeck ist eine eigenständige Reverse-Proxy-Verwaltung mit mehreren IPv4-/IPv6-Upstreams pro Domain. Das Repository enthält ein ausführbares Docker-MVP, nicht nur ein Design-Mockup.

## Funktionen

- SQLite-Datenbank mit WAL-Modus und Fremdschlüsseln
- Login über sichere HttpOnly-Sitzungscookies und CSRF-Schutz
- PBKDF2-SHA256-Passwort-Hashes mit 310.000 Iterationen
- Rollen `admin`, `operator` und `viewer`
- Leere Erstinstallation ohne automatisch angelegte Proxy Hosts oder Beispieldaten
- Passwortänderung mit Prüfung des bisherigen Passworts und Widerruf aller Sitzungen
- Mehrere IPv4-, IPv6- und Hostname-Upstreams pro Proxy Host
- Gewichtung, Backup-Ziele, Round Robin, Least Connections und IP Hash
- Aktive HTTP(S)-Healthchecks alle 30 Sekunden
- Atomar geschriebene Nginx-Konfiguration mit Prüfung vor dem Reload
- ACME/Let's Encrypt über HTTP-01 und DNS-01
- DNS-Plugins für Cloudflare, DigitalOcean, AWS Route 53, IONOS, Hetzner DNS, IPv64.net, STRATO und PowerDNS
- HTTP-Weiterleitungen sowie TCP-/UDP-Streams
- Audit-Log und eigenständige responsive Oberfläche
- Verschlüsselte Benachrichtigungskanäle für SMTP/E-Mail, Telegram Bot und WhatsApp Cloud API
- Ereignisse für Upstream-Ausfall, Erholung und ACME-/Zertifikatsfehler
- Separater Demo-Webserver

## Schnellstart

### Von GitHub auf den Server laden

Offizielles Repository: [IT-Bachmann/Proxy-Manager-Deck](https://github.com/IT-Bachmann/Proxy-Manager-Deck)

Mit Git:

```bash
git clone https://github.com/IT-Bachmann/Proxy-Manager-Deck.git
cd Proxy-Manager-Deck
chmod +x install.sh
sudo ./install.sh
```

Ohne Git mit `curl`:

```bash
curl -fsSL https://github.com/IT-Bachmann/Proxy-Manager-Deck/archive/refs/heads/main.tar.gz -o proxydeck.tar.gz
tar -xzf proxydeck.tar.gz
cd Proxy-Manager-Deck-main
chmod +x install.sh
sudo ./install.sh
```

Oder mit `wget`:

```bash
wget -O proxydeck.tar.gz https://github.com/IT-Bachmann/Proxy-Manager-Deck/archive/refs/heads/main.tar.gz
tar -xzf proxydeck.tar.gz
cd Proxy-Manager-Deck-main
chmod +x install.sh
sudo ./install.sh
```

Die Zugangsdaten erscheinen bei der ersten Installation einmal im Terminal und werden zusätzlich mit Dateirechten `0600` in `proxydeck-login.txt` gespeichert. Anzeigen:

```bash
sudo cat proxydeck-login.txt
```

Die vollständige interne Konfiguration liegt in `.env`. Beide Dateien dürfen niemals auf GitHub hochgeladen oder weitergegeben werden.

### Automatische Linux-Installation

Auf einem unterstützten Linux-System kann ProxyDeck inklusive Docker-Vorbereitung installiert werden:

```bash
chmod +x install.sh
sudo ./install.sh
```

Unterstützt werden Paketmanager-basierte Installationen auf:

- Debian und Ubuntu
- Fedora, RHEL, Rocky Linux und AlmaLinux
- openSUSE und SUSE Linux Enterprise
- Arch Linux und Derivate
- Alpine Linux

Das Skript verwendet ausschließlich den vorhandenen Paketmanager, erzeugt `.env` mit sicheren Zufallswerten, validiert Docker Compose und startet die Container. Wenn Docker bereits separat verwaltet wird:

Vor dem Start prüft es außerdem Architektur, freien Speicherplatz, Docker-Daemon, Compose-Version, die Ports 80/443/8181, IPv6 sowie aktive UFW-/firewalld-Konfigurationen. Nach dem Start wartet es bis zu 60 Sekunden auf eine echte HTTP-Antwort des Dashboards und zeigt bei Fehlern die letzten Container-Logs.

```bash
./install.sh --skip-docker-install
```

Nur vorbereiten, aber noch nicht starten:

```bash
sudo ./install.sh --no-start
```

Nicht jede exotische Distribution kann automatisch unterstützt werden. Auf anderen Linux-Systemen Docker Engine 24+ und Docker Compose v2 installieren und anschließend das Skript mit `--skip-docker-install` ausführen.

### Manuelle Installation

1. Umgebung anlegen:

   ```bash
   cp .env.example .env
   ```

2. In `.env` unbedingt ein langes, zufälliges Administratorpasswort setzen.

3. Container bauen und starten:

   ```bash
   docker compose up -d --build
   ```

4. Dashboard über `http://127.0.0.1:8181` öffnen und als `admin` anmelden.

Das Dashboard bindet absichtlich nur an Loopback. Für einen entfernten Server empfiehlt sich zunächst ein SSH-Tunnel:

```bash
ssh -L 8181:127.0.0.1:8181 user@server
```

## Vollständige Demo testen

Die Demo ist unabhängig vom Dashboard über die IP-Adresse des Docker-Servers und Port `45130` erreichbar:

```text
http://SERVER-IP:45130
```

Beispiel: `http://192.168.178.20:45130`

Beim ersten Start wird `demo.localhost` mit dem Upstream `demo:80` angelegt. Der Gateway-Container veröffentlicht Port 80. Auf demselben Rechner funktioniert daher:

```bash
curl http://demo.localhost
```

Die ausgelieferte Seite ist eine eigenständige interaktive Produktdemo. Sie funktioniert auch direkt als lokale Datei und umfasst Dashboard, Proxy Hosts mit mehreren IPv4-/IPv6-Zielen, Weiterleitungen, Streams, Zertifikate, Healthchecks, Benutzer und Audit-Log.

Demo-Zugang:

```text
Benutzer: admin
Passwort: proxydeck-demo
```

Änderungen der Demo werden nur im lokalen Browser gespeichert. Über die Schaltfläche oben rechts lassen sich alle Beispieldaten zurücksetzen. Die Dateien liegen unter [`demo/`](demo/).

## Let's Encrypt

Vor der Anforderung müssen der A- und/oder AAAA-Record der Domain auf den ProxyDeck-Server zeigen und TCP-Port 80 von außen erreichbar sein. Danach in der Zertifikatsverwaltung Domain und E-Mail eintragen. Erst nach erfolgreicher Ausstellung beim Proxy Host „SSL aktivieren“.

Certbot speichert Zertifikate im gemeinsamen Docker-Volume `letsencrypt`. Die Gateway-Konfiguration referenziert `/etc/letsencrypt/live/<domain>/fullchain.pem` und `privkey.pem`.

Für Wildcard-Zertifikate und Server ohne öffentlich erreichbaren Port 80 kann DNS-01 verwendet werden. DNS-Zugangsdaten werden mit `PROXYDECK_SECRET_KEY` verschlüsselt in SQLite gespeichert und über die API nie wieder ausgegeben. Anlegen oder Rotieren eines Schlüssels erfordert zusätzlich zur aktiven Admin-Sitzung die erneute Eingabe des aktuellen Passworts.

Die Fernet-Schlüsselvariable wird beispielsweise so erzeugt:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Hinweis zu Hetzner: Der in acme.sh 3.1.2 enthaltene Hook verwendet je nach Kontomigration noch die ältere Hetzner-DNS-API. Für bereits auf die neue Hetzner DNS Console migrierte Zonen muss der Adapter vor Produktion gegen die aktuelle API geprüft werden.

## Streams

Docker muss veröffentlichte Stream-Ports bereits beim Containerstart kennen. `compose.yml` enthält TCP und UDP 9000 als Beispiel. Für weitere Ports entsprechende `ports`-Einträge ergänzen und den Gateway-Container neu erstellen.

## Produktionshinweise

Dieses MVP besitzt bereits echte Persistenz und Nginx-Aktivierung, benötigt vor öffentlichem Produktionseinsatz aber zusätzlich Härtung: Dashboard über HTTPS, Firewall, regelmäßige Volume-Backups, Rate-Limits am Login, automatisierte Integrationstests und eine unprivilegierte ACME-Sidecar-Ausführung. `PROXYDECK_SECURE_COOKIE=1` erst aktivieren, wenn das Dashboard ausschließlich per HTTPS erreichbar ist.

Die Verwaltungsoberfläche und die Offline-Demo besitzen Breakpoints für Desktop, Tablet und Smartphone. Tabellen bleiben mobil scrollbar, Formulare werden einspaltig und die Navigation wird als mobiles Menü geöffnet.

## Wichtige Dateien

- `server.py` – API, SQLite, Login, ACME, Healthchecks und Generator
- `public/` – Verwaltungsoberfläche
- `gateway/` – Nginx-Gateway mit geprüftem Auto-Reload
- `compose.yml` – Control Plane, Gateway und Demo-Dienst
- `demo/index.html` – Test-Webseite

## Lizenz

ProxyDeck wird unter der [MIT License](LICENSE) veröffentlicht.
