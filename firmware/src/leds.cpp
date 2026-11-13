// Balloone — LED de conexão e bateria (frente B · Câmera). Veja o guia, seção B.
#include <Arduino.h>

#include "config.h"
#include "leds.h"

void leds_iniciar() {
  // TODO (B): pinMode(PINO_LED_CONEXAO, OUTPUT) depois da decisão D-001.
}

void leds_conectado(bool sim) {
  // TODO (B): guardar o estado.
}

void leds_tick() {
  // TODO (B): aceso fixo se conectado, piscando 2x por segundo se não.
}

float bateria_volts() {
  return 0;  // TODO (B): só na Opção B — média de analogReadMilliVolts × fator do divisor.
}
