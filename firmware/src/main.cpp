// Balloone — Grupo 4 · Processo Trainee Titans 2026/2
// Esqueleto inicial: só confirma que a placa grava e roda.
// Próximos módulos (um arquivo cada): camera, motores, rede, leds.

#include <Arduino.h>
#include "config.h"

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("Balloone · Grupo 4 — firmware rodando");
  Serial.printf("PSRAM encontrada: %s\n", psramFound() ? "sim" : "nao");
}

void loop() {
  Serial.println("vivo");
  delay(2000);
}
