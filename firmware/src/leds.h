// Balloone — LED de conexão e bateria (frente B · Câmera). Contrato: não mude sem avisar.
#pragma once

void leds_iniciar();
void leds_conectado(bool sim);  // a Rede avisa: operador conectou ou caiu
void leds_tick();               // no loop: aceso = conectado, piscando = esperando
float bateria_volts();          // 0 quando não tem sensor (Opção A da pinagem)
