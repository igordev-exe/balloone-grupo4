// Balloone — configuração central do firmware
// Tudo que é pino, canal ou tempo fica aqui, para ninguém procurar número
// mágico espalhado pelo código.
#pragma once

// ---------------------------------------------------------------------------
// PINAGEM — A DEFINIR (decisão de grupo; registrar em docs/decisoes/)
// ---------------------------------------------------------------------------
// Placa ESP32-WROVER-DEV: a câmera ocupa 4, 5, 18, 19, 21, 22, 23, 25, 26,
// 27, 34, 35, 36 e 39. Conferir os pinos livres no pinout da placa.
//
// Opção A: motores em 13, 14, 32, 33; LED de conexão no 2; sem leitura de bateria.
// Opção B: motores em 12, 13, 14, 15 (pull-down de 10 kΩ, são pinos de boot);
//          bateria no 32 (ADC1, funciona com Wi-Fi); LED de conexão no 33.
//
// #define PINO_MOTOR_ESQ_A   ?
// #define PINO_MOTOR_ESQ_B   ?
// #define PINO_MOTOR_DIR_A   ?
// #define PINO_MOTOR_DIR_B   ?
// #define PINO_LED_CONEXAO   ?
// #define PINO_BATERIA       ?

// ---------------------------------------------------------------------------
// PWM DOS MOTORES
// ---------------------------------------------------------------------------
// A câmera usa um canal LEDC para gerar o clock dela. Os motores precisam usar
// canais diferentes, senão a câmera para de funcionar.

// ---------------------------------------------------------------------------
// SEGURANÇA
// ---------------------------------------------------------------------------
// Failsafe: se nenhum comando chegar nesse intervalo, os motores param.
#define FAILSAFE_MS 500
