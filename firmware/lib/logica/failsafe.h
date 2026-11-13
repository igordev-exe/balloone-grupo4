// Balloone — failsafe (frente A · Rede)
//
// Camadas 2 e 3 do failsafe (docs/protocolo.md, seção 5).
// O tempo vem de fora: no robô é millis(); nos testes é um número qualquer.
// Assim dá para testar "passaram 600 ms" sem esperar 600 ms.
#pragma once
#include <stdint.h>

constexpr uint32_t FAILSAFE_PADRAO_MS = 500;

class Failsafe {
 public:
  explicit Failsafe(uint32_t limite_ms = FAILSAFE_PADRAO_MS) : limite_(limite_ms) {}

  // Chegou um comando "c". Chame com millis().
  void comando_recebido(uint32_t agora_ms) {
    ultimo_ = agora_ms;
    ativo_ = true;
  }

  // O WebSocket fechou (camada 2): para na hora, até chegar um comando novo.
  void conexao_caiu() { ativo_ = false; }

  // true = os motores têm que estar parados.
  // Começa em true: ao ligar, nada se mexe até o primeiro comando (camada 1).
  // A conta com unsigned continua certa quando o millis() volta a zero (49 dias).
  bool deve_parar(uint32_t agora_ms) const {
    return !ativo_ || (agora_ms - ultimo_) > limite_;
  }

 private:
  uint32_t limite_;
  uint32_t ultimo_ = 0;
  bool ativo_ = false;
};
