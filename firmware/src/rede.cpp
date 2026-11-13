// Balloone — Wi-Fi, WebSocket e failsafe (frente A · Rede). Veja o guia, seção A.
// Já prontos e testados em lib/logica:
//   ler_mensagem() e montar_status()  (mensagens.h)
//   Failsafe: comando_recebido(), conexao_caiu(), deve_parar()  (failsafe.h)
#include <Arduino.h>
#include <WiFi.h>

#include "config.h"
#include "failsafe.h"
#include "mensagens.h"
#include "rede.h"

#ifndef SIMULACAO
#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Falta firmware/include/secrets.h: copie secrets.h.exemplo para secrets.h e troque a senha."
#endif
#endif

static Failsafe failsafe(FAILSAFE_MS);

void rede_iniciar() {
#ifdef SIMULACAO
  // O Wokwi não simula o modo AP: o robô entra na rede virtual do simulador.
  WiFi.begin("Wokwi-GUEST", "", 6);
  Serial.print("Conectando no Wi-Fi do simulador");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.print(" IP: ");
  Serial.println(WiFi.localIP());
#else
  WiFi.softAP("BALLOONE-G4", WIFI_SENHA, 6);  // nome, senha, canal
  Serial.print("Wi-Fi BALLOONE-G4 no ar. IP: ");
  Serial.println(WiFi.softAPIP());  // 192.168.4.1
#endif
  // TODO (A): servidor WebSocket em /ws (D-002) chamando ler_mensagem().
}

void rede_tick() {
  // TODO (A): status a cada 500 ms com montar_status(), e
  //           if (failsafe.deve_parar(millis())) motores_parar();
}
