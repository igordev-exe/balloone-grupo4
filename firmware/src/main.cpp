// Balloone — Grupo 4 · Processo Trainee Titans 2026/2
// O main só chama os módulos na ordem certa. Cada módulo tem um dono:
//   motores (C) · camera e leds (B) · rede (A). Contrato: docs e guia do Software.

#include <Arduino.h>

#include "camera.h"
#include "config.h"
#include "leds.h"
#include "motores.h"
#include "rede.h"

void setup() {
  motores_iniciar();  // SEMPRE a primeira linha: robô parado antes de tudo
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("Balloone · Grupo 4 — firmware rodando");
  Serial.printf("PSRAM encontrada: %s\n", psramFound() ? "sim" : "nao");

  leds_iniciar();
  if (!camera_iniciar()) Serial.println("camera falhou (ou nao existe nesta placa)");
  rede_iniciar();  // o Wi-Fi tem que existir antes dos servidores
  camera_servidor_iniciar();
}

void loop() {
  rede_tick();
  motores_tick();
  leds_tick();
  delay(1);
}
