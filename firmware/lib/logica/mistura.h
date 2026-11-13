// Balloone — conta das rodas (frente C · Motores)
//
// C++ puro: nada de Arduino aqui dentro. Por isso estas funções rodam nos
// testes do computador (pio test -e native), sem placa e sem robô.
// Quem mexe nos pinos é o motores.cpp; ele só chama estas funções.
#pragma once

struct Rodas {
  float esq;  // -1 (ré total) a 1 (frente total)
  float dir;
};

struct AjusteMotores {
  float vmax = 0.8f;  // PWM máximo. Bateria de 7,4 V em motor de 6 V: até 0,8
  float ke = 1.0f;    // compensação do motor esquerdo, para andar reto
  float kd = 1.0f;    // compensação do motor direito
};

constexpr float ZONA_MORTA = 0.08f;   // protocolo 3.1, passo 2
constexpr float PASSO_RAMPA = 0.10f;  // protocolo 3.1, passo 5: 10% a cada 20 ms

// Prende `valor` entre `minimo` e `maximo`. NaN vira o valor mais perto de zero.
float limita(float valor, float minimo, float maximo);

// |valor| < 0,08 vira 0. Ignora a tremidinha do analógico.
float zona_morta(float valor);

// Protocolo 3.1, passos 1 a 4: comando (x, y, v) → quanto cada roda deve girar.
//   esquerda = y + x, direita = y - x, cada uma limitada a ±1,
//   vezes v, vezes vmax, vezes ke (ou kd).
Rodas misturar(float x, float y, float v, const AjusteMotores& ajuste);

// Um passo da rampa: anda de `atual` em direção a `alvo`, no máximo `passo`.
float rampa(float atual, float alvo, float passo = PASSO_RAMPA);

// Ajustes vindos da mensagem cfg, presos nas faixas do protocolo 3.4.
AjusteMotores ajuste_seguro(float vmax, float ke, float kd);
