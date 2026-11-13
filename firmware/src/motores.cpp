// Balloone — motores (frente C · Motores)
// A conta das rodas já está pronta e testada em lib/logica/mistura.h:
//   misturar(x, y, v, ajuste) → alvo de cada roda
//   rampa(atual, alvo)        → um passo de 10%
//   ajuste_seguro(vmax, ke, kd)
// Aqui fica só o que mexe nos pinos (PWM nos canais 2 a 5). Veja o guia, seção C.
#include <Arduino.h>

#include "config.h"
#include "mistura.h"
#include "motores.h"

void motores_iniciar() {
  // TODO (C): pinos em LOW, PWM nos canais 2 a 5, ler ajustes salvos (Preferences).
}

void motores_comando(float x, float y, float v) {
  // TODO (C): guardar o alvo de cada roda com misturar().
}

void motores_parar() {
  // TODO (C): zerar alvo e atual e escrever 0 nos quatro canais.
}

void motores_tick() {
  // TODO (C): a cada 20 ms, rampa() em cada roda e escrever o PWM.
}

void motores_config(float vmax, float ke, float kd) {
  // TODO (C): ajuste_seguro() e salvar com Preferences.
}
