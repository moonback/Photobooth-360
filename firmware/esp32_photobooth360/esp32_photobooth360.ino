/**
 * Photobooth 360 — Firmware ESP32
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Contrôle un moteur pas-à-pas (stepper) ou un moteur DC via un driver
 * (A4988 / DRV8825 / TB6600 pour stepper, ou L298N / BTS7960 pour DC).
 *
 * Communication : USB-Serial (115200 baud) — protocole ASCII newline-terminated
 *
 * ── Commandes reçues ────────────────────────────────────────────────────────
 *   MOTOR:SPEED:<0-100>      vitesse en % du max
 *   MOTOR:DIR:<CW|CCW>       sens de rotation
 *   MOTOR:TURNS:<n>          nombre de tours (0 = continu jusqu'à STOP)
 *   MOTOR:START              démarrer la rotation
 *   MOTOR:STOP               arrêt immédiat
 *   MOTOR:RESET              retour position home (0°)
 *   MOTOR:STATUS             demande d'état
 *
 * ── Réponses envoyées ───────────────────────────────────────────────────────
 *   READY                    plateau à vitesse cible (après rampe d'accélération)
 *   RUNNING                  moteur en rotation
 *   STOPPED                  moteur arrêté
 *   {"running":true,"speed":50,"dir":"CW","turns_remaining":1.0}
 *   ERROR:<message>
 *
 * ── Câblage (voir WIRING.md) ────────────────────────────────────────────────
 *   Stepper A4988/DRV8825 :
 *     PIN_STEP  → STEP
 *     PIN_DIR   → DIR
 *     PIN_EN    → EN  (actif LOW)
 *     3.3V/GND  → VDD/GND du driver (logique)
 *     12-24V    → VMOT/GND du driver (puissance)
 *
 *   Moteur DC (L298N) :
 *     PIN_PWM   → ENA (vitesse)
 *     PIN_IN1   → IN1 (direction A)
 *     PIN_IN2   → IN2 (direction B)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// ─── Configuration matérielle ─────────────────────────────────────────────────

// Choisir le type de moteur : STEPPER ou DC
#define MOTOR_TYPE_STEPPER   // commenter cette ligne pour utiliser DC

// ── Pins stepper (A4988 / DRV8825) ──────────────────────────────────────────
#ifdef MOTOR_TYPE_STEPPER
  #define PIN_STEP   18   // GPIO18 → STEP
  #define PIN_DIR    19   // GPIO19 → DIR
  #define PIN_EN     21   // GPIO21 → EN (actif LOW)

  // Résolution du driver (jumpers MS1/MS2/MS3)
  // 200 pas/tour moteur × microstep = pas effectifs par tour
  #define STEPS_PER_REV    200    // pas/tour (moteur 1.8°)
  #define MICROSTEP          8    // 1, 2, 4, 8, 16 selon jumpers driver

  // Vitesse max en pas/seconde (à 100%)
  // DRV8825 peut aller jusqu'à ~250 000 pas/s, mais mécanique limite à ~2000
  #define MAX_STEPS_PER_SEC 1600  // = ~1 tour/s à 8 microsteps
  #define MIN_STEPS_PER_SEC   50  // vitesse mini (5%)

  // Rampe d'accélération : durée pour atteindre la vitesse cible (ms)
  #define RAMP_TIME_MS      600

#else
  // ── Pins moteur DC (L298N / BTS7960) ─────────────────────────────────────
  #define PIN_PWM   25   // GPIO25 → ENA (canal LEDC)
  #define PIN_IN1   26   // GPIO26 → IN1
  #define PIN_IN2   27   // GPIO27 → IN2

  #define PWM_CHANNEL   0
  #define PWM_FREQ   5000   // Hz
  #define PWM_RES       8   // bits (0-255)

  // Délai de montée en vitesse avant READY (ms) — DC n'a pas de position
  #define RAMP_TIME_MS  400
#endif

// ─── Variables d'état ────────────────────────────────────────────────────────

struct MotorState {
  bool     running      = false;
  uint8_t  speed        = 50;     // 0-100 %
  bool     dirCW        = true;   // true = CW
  float    turnsTarget  = 0.0f;   // 0 = continu
  float    turnsCount   = 0.0f;   // tours effectués
  bool     readySent    = false;  // READY envoyé ?
};

static MotorState mot;

#ifdef MOTOR_TYPE_STEPPER
  static volatile long stepsToGo    = 0;   // pas restants (0 = continu)
  static volatile long totalSteps   = 0;   // compteur total
  static hw_timer_t*   stepTimer    = nullptr;
  static portMUX_TYPE  timerMux     = portMUX_INITIALIZER_UNLOCKED;

  // Vitesse courante pour la rampe
  static volatile uint32_t currentStepInterval = 0; // µs entre 2 STEP
  static uint32_t targetStepInterval           = 0;
  static uint32_t rampStartInterval            = 0;
  static uint32_t rampStartMs                  = 0;
#endif

// ─── Prototypes ──────────────────────────────────────────────────────────────

void parseCommand(const String& cmd);
void motorStart();
void motorStop();
void motorReset();
void sendStatus();
void applySpeed();

// ─── ISR stepper ──────────────────────────────────────────────────────────────

#ifdef MOTOR_TYPE_STEPPER
void IRAM_ATTR onStepTimer() {
  portENTER_CRITICAL_ISR(&timerMux);

  // Générer impulsion STEP
  digitalWrite(PIN_STEP, HIGH);
  delayMicroseconds(2);
  digitalWrite(PIN_STEP, LOW);

  totalSteps++;

  if (stepsToGo > 0) {
    stepsToGo--;
    if (stepsToGo == 0) {
      // Tours terminés — arrêt dans la loop principale via flag
      mot.running = false;
    }
  }

  portEXIT_CRITICAL_ISR(&timerMux);
}
#endif

// ─── Setup ───────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial.println("PHOTOBOOTH360_READY");

#ifdef MOTOR_TYPE_STEPPER
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR,  OUTPUT);
  pinMode(PIN_EN,   OUTPUT);
  digitalWrite(PIN_EN,   HIGH); // désactivé au démarrage
  digitalWrite(PIN_STEP, LOW);
  digitalWrite(PIN_DIR,  HIGH); // CW par défaut

  // Timer hardware pour générer les impulsions STEP
  stepTimer = timerBegin(0, 80, true); // timer 0, prescaler 80 → 1 tick = 1 µs
  timerAttachInterrupt(stepTimer, &onStepTimer, true);
  timerAlarmDisable(stepTimer);

#else
  pinMode(PIN_IN1, OUTPUT);
  pinMode(PIN_IN2, OUTPUT);
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES);
  ledcAttachPin(PIN_PWM, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0);
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, LOW);
#endif

  Serial.println("INFO:ESP32 Photobooth360 firmware v1.0");
}

// ─── Loop ────────────────────────────────────────────────────────────────────

void loop() {
  // ── Lecture commandes série ───────────────────────────────────────────────
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      parseCommand(line);
    }
  }

  // ── Rampe d'accélération (stepper) ───────────────────────────────────────
#ifdef MOTOR_TYPE_STEPPER
  if (mot.running && !mot.readySent) {
    uint32_t elapsed = millis() - rampStartMs;
    if (elapsed >= RAMP_TIME_MS) {
      // Vitesse cible atteinte
      timerAlarmWrite(stepTimer, targetStepInterval, true);
      mot.readySent = true;
      Serial.println("READY");
    } else {
      // Interpolation linéaire de l'intervalle (grand→petit = accélération)
      float t = (float)elapsed / RAMP_TIME_MS;
      uint32_t interval = (uint32_t)(rampStartInterval + t * (long)(targetStepInterval - rampStartInterval));
      timerAlarmWrite(stepTimer, interval, true);
    }
  }

  // ── Arrêt automatique fin de tours ───────────────────────────────────────
  if (!mot.running && stepTimer) {
    bool wasRunning = timerAlarmEnabled(stepTimer);
    if (wasRunning) {
      motorStop();
    }
  }

#else
  // ── Rampe DC ──────────────────────────────────────────────────────────────
  if (mot.running && !mot.readySent) {
    uint32_t elapsed = millis() - rampStartMs;
    if (elapsed >= RAMP_TIME_MS) {
      mot.readySent = true;
      Serial.println("READY");
    }
  }
#endif
}

// ─── Parsing commandes ────────────────────────────────────────────────────────

void parseCommand(const String& cmd) {
  Serial.print("ACK:");
  Serial.println(cmd);

  if (cmd.startsWith("MOTOR:SPEED:")) {
    int val = cmd.substring(12).toInt();
    mot.speed = constrain(val, 0, 100);
    Serial.print("OK:SPEED:");
    Serial.println(mot.speed);

  } else if (cmd.startsWith("MOTOR:DIR:")) {
    String dir = cmd.substring(10);
    dir.trim();
    mot.dirCW = (dir == "CW");
    Serial.print("OK:DIR:");
    Serial.println(mot.dirCW ? "CW" : "CCW");

  } else if (cmd.startsWith("MOTOR:TURNS:")) {
    float t = cmd.substring(12).toFloat();
    mot.turnsTarget = max(0.0f, t);
    Serial.print("OK:TURNS:");
    Serial.println(mot.turnsTarget);

  } else if (cmd == "MOTOR:START") {
    motorStart();

  } else if (cmd == "MOTOR:STOP") {
    motorStop();

  } else if (cmd == "MOTOR:RESET") {
    motorReset();

  } else if (cmd == "MOTOR:STATUS") {
    sendStatus();

  } else {
    Serial.print("ERROR:UNKNOWN_CMD:");
    Serial.println(cmd);
  }
}

// ─── Démarrage moteur ─────────────────────────────────────────────────────────

void motorStart() {
  if (mot.running) {
    Serial.println("INFO:ALREADY_RUNNING");
    return;
  }

  mot.running    = true;
  mot.readySent  = false;
  mot.turnsCount = 0.0f;

#ifdef MOTOR_TYPE_STEPPER
  // Direction
  digitalWrite(PIN_DIR, mot.dirCW ? HIGH : LOW);
  delayMicroseconds(5); // setup time DIR→STEP requis par A4988

  // Activer driver
  digitalWrite(PIN_EN, LOW);

  // Calculer intervalle cible (µs entre deux STEP)
  uint32_t effectiveSteps = STEPS_PER_REV * MICROSTEP;
  float pct = mot.speed / 100.0f;
  uint32_t stepsPerSec = (uint32_t)(MIN_STEPS_PER_SEC + pct * (MAX_STEPS_PER_SEC - MIN_STEPS_PER_SEC));
  targetStepInterval  = 1000000UL / stepsPerSec; // µs

  // Démarrer la rampe depuis une vitesse très lente
  rampStartInterval   = 1000000UL / MIN_STEPS_PER_SEC;
  rampStartMs         = millis();

  // Nombre de pas total si tours limités
  if (mot.turnsTarget > 0.0f) {
    portENTER_CRITICAL(&timerMux);
    stepsToGo  = (long)(mot.turnsTarget * effectiveSteps);
    totalSteps = 0;
    portEXIT_CRITICAL(&timerMux);
  } else {
    portENTER_CRITICAL(&timerMux);
    stepsToGo  = 0; // continu
    totalSteps = 0;
    portEXIT_CRITICAL(&timerMux);
  }

  // Lancer le timer avec l'intervalle de départ (lent)
  timerAlarmWrite(stepTimer, rampStartInterval, true);
  timerAlarmEnable(stepTimer);

#else
  // Direction DC
  if (mot.dirCW) {
    digitalWrite(PIN_IN1, HIGH);
    digitalWrite(PIN_IN2, LOW);
  } else {
    digitalWrite(PIN_IN1, LOW);
    digitalWrite(PIN_IN2, HIGH);
  }
  // PWM proportionnel à la vitesse
  uint8_t duty = (uint8_t)(mot.speed * 255 / 100);
  ledcWrite(PWM_CHANNEL, duty);
  rampStartMs = millis();
#endif

  Serial.println("RUNNING");
}

// ─── Arrêt moteur ─────────────────────────────────────────────────────────────

void motorStop() {
  mot.running   = false;
  mot.readySent = false;

#ifdef MOTOR_TYPE_STEPPER
  timerAlarmDisable(stepTimer);
  delayMicroseconds(100);
  digitalWrite(PIN_EN, HIGH); // désactiver driver → bobines libres (économie énergie)
  portENTER_CRITICAL(&timerMux);
  stepsToGo = 0;
  portEXIT_CRITICAL(&timerMux);
#else
  ledcWrite(PWM_CHANNEL, 0);
  digitalWrite(PIN_IN1, LOW);
  digitalWrite(PIN_IN2, LOW);
#endif

  Serial.println("STOPPED");
}

// ─── Reset position ───────────────────────────────────────────────────────────

void motorReset() {
  motorStop();
  // Ici on pourrait piloter un retour home avec capteur fin de course
  // Pour l'instant : juste arrêt + reset compteur
#ifdef MOTOR_TYPE_STEPPER
  portENTER_CRITICAL(&timerMux);
  totalSteps = 0;
  portEXIT_CRITICAL(&timerMux);
#endif
  mot.turnsCount = 0.0f;
  Serial.println("OK:RESET");
}

// ─── Envoi statut JSON ────────────────────────────────────────────────────────

void sendStatus() {
#ifdef MOTOR_TYPE_STEPPER
  long steps;
  portENTER_CRITICAL(&timerMux);
  steps = totalSteps;
  portEXIT_CRITICAL(&timerMux);
  float turnsElapsed = (float)steps / (STEPS_PER_REV * MICROSTEP);
#else
  float turnsElapsed = 0.0f;
#endif

  Serial.print("{\"running\":");
  Serial.print(mot.running ? "true" : "false");
  Serial.print(",\"speed\":");
  Serial.print(mot.speed);
  Serial.print(",\"dir\":\"");
  Serial.print(mot.dirCW ? "CW" : "CCW");
  Serial.print("\",\"turns_target\":");
  Serial.print(mot.turnsTarget);
  Serial.print(",\"turns_elapsed\":");
  Serial.print(turnsElapsed, 2);
  Serial.println("}");
}
