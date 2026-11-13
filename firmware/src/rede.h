// Balloone — Wi-Fi, WebSocket e failsafe (frente A · Rede). Contrato: não mude sem avisar.
#pragma once

void rede_iniciar();  // cria o Wi-Fi e o WebSocket
void rede_tick();     // no loop: status a cada 500 ms e failsafe de silêncio
