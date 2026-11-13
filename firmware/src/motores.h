// Balloone — motores (frente C · Motores). Contrato: não mude nomes nem parâmetros sem avisar.
#pragma once

void motores_iniciar();                               // pinos em LOW: robô parado. SEMPRE a 1ª linha do setup()
void motores_comando(float x, float y, float v);      // a Rede chama a cada comando "c"
void motores_parar();                                 // o failsafe chama: para na hora, sem rampa
void motores_tick();                                  // no loop: aplica a rampa a cada 20 ms
void motores_config(float vmax, float ke, float kd);  // mensagem "cfg"
