# Câblage ESP32 — Photobooth 360

## Matériel recommandé

| Composant | Modèle conseillé |
|-----------|-----------------|
| Microcontrôleur | ESP32 DevKit v1 (38 pins) ou WROOM-32 |
| Driver stepper | DRV8825 (meilleur) ou A4988 |
| Moteur | Nema 17 — 1.8°/pas, 200 pas/tour, 12V |
| Alimentation moteur | 12V DC, ≥ 2A |
| Condensateur | 100 µF 25V (entre VMOT et GND du driver) |

---

## Schéma — Stepper + DRV8825 / A4988

```
                    ESP32 DevKit v1
                   ┌──────────────┐
              3.3V │              │ GND
                   │   GPIO18 ───────────► STEP  ┐
                   │   GPIO19 ───────────► DIR   ├── DRV8825
                   │   GPIO21 ───────────► EN    │   / A4988
                   │              │         GND ─┘
                   └──────────────┘
                                              │
                                         VDD (3.3V)
                                              │
                          ┌──── VMOT ──── 12V DC +
                          │
                       DRV8825
                          │
                    1B 1A 2A 2B
                     │  │  │  │
                   ──┴──┴──┴──┴── Nema 17
```

### Connexions détaillées

| ESP32 GPIO | Driver DRV8825/A4988 | Note |
|------------|---------------------|------|
| GPIO18     | STEP                | Impulsions de pas |
| GPIO19     | DIR                 | Sens de rotation |
| GPIO21     | EN                  | Enable actif LOW |
| GND        | GND (logique)       | Masse commune |
| 3.3V       | VDD                 | Alimentation logique |
| —          | VMOT                | 12V externe |
| —          | GND (puissance)     | Masse 12V |

### Jumpers microstep DRV8825 (réglés sur 1/8)

| MS1 | MS2 | MS3 | Résolution |
|-----|-----|-----|-----------|
| HIGH | LOW | LOW | 1/8 — **recommandé** |
| LOW  | LOW | LOW | Full step |
| HIGH | HIGH | LOW | 1/4 |
| HIGH | HIGH | HIGH | 1/32 |

> **Important** — Mettre un condensateur 100 µF entre VMOT et GND
> du driver pour protéger contre les pics de tension.

> **Réglage courant** — Ajuster le potentiomètre VREF sur le driver :
> `VREF = I_max × 0.5` (pour DRV8825)
> Ex. moteur 1.5A → VREF = 0.75V

---

## Alternative — Moteur DC + L298N

Si vous utilisez un moteur DC brushed à la place d'un stepper :

```
                    ESP32 DevKit v1
                   ┌──────────────┐
                   │   GPIO25 ───────────► ENA (PWM vitesse)
                   │   GPIO26 ───────────► IN1 (direction)
                   │   GPIO27 ───────────► IN2 (direction)
                   │   GND    ───────────► GND
                   └──────────────┘
                                         L298N
                                    OUT1 ──┐
                                           ├── Moteur DC
                                    OUT2 ──┘
```

Dans le firmware, commenter `#define MOTOR_TYPE_STEPPER` et
décommenter `#define MOTOR_TYPE_DC` pour passer en mode DC.

---

## Connexion USB → WebSerial

1. Brancher l'ESP32 via USB au PC qui fait tourner l'interface web
2. Dans Chrome/Edge → **Paramètres → Sécurité → Ports série** (ou cliquer
   "Connecter" dans le panneau moteur de l'interface)
3. Sélectionner `CP2102` ou `CH340` selon votre board ESP32
4. Baud rate : **115200** (déjà configuré dans l'interface)

---

## Flash du firmware

### Prérequis Arduino IDE

1. Installer Arduino IDE 2.x
2. Ajouter le support ESP32 :
   - Fichier → Préférences → URL gestionnaire :
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Outils → Gestionnaire de cartes → chercher `esp32` → installer

### Compilation et flash

1. Ouvrir `firmware/esp32_photobooth360/esp32_photobooth360.ino`
2. Sélectionner la carte : **ESP32 Dev Module**
3. Sélectionner le port COM de l'ESP32
4. Upload (Ctrl+U)
5. Ouvrir le Moniteur Série (115200 baud) — vous devez voir :
   ```
   PHOTOBOOTH360_READY
   INFO:ESP32 Photobooth360 firmware v1.0
   ```

---

## Test manuel via Moniteur Série

```
MOTOR:SPEED:50       → ACK:MOTOR:SPEED:50 / OK:SPEED:50
MOTOR:DIR:CW         → ACK:MOTOR:DIR:CW / OK:DIR:CW
MOTOR:TURNS:2        → ACK:MOTOR:TURNS:2 / OK:TURNS:2.00
MOTOR:START          → ACK:MOTOR:START / RUNNING / (après ~600ms) READY
MOTOR:STATUS         → {"running":true,"speed":50,"dir":"CW",...}
MOTOR:STOP           → ACK:MOTOR:STOP / STOPPED
MOTOR:RESET          → ACK:MOTOR:RESET / STOPPED / OK:RESET
```
