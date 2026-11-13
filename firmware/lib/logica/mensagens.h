// Balloone — mensagens entre interface e robô (frente A · Rede)
//
// Lê e monta as mensagens de docs/protocolo.md, seção 3.
// C++ puro + ArduinoJson: roda igual na placa e nos testes do computador.
#pragma once
#include <stddef.h>
#include <stdint.h>

constexpr size_t TAMANHO_MAX_MENSAGEM = 256;  // protocolo seção 3

enum class TipoMensagem {
  Invalida,     // grande demais, JSON estragado ou não é um objeto: ignore
  Comando,      // "c": movimento
  Ping,         // "p": devolva o texto original, igualzinho, na hora
  Config,       // "cfg": ajustes (proposta, protocolo 3.4)
  Desconhecida  // JSON válido, mas de um tipo que o robô não conhece: ignore
};

struct Comando {
  float x = 0, y = 0, v = 0;  // campo que não veio vira 0 (robô parado)
  uint32_t n = 0;
};

struct Config {
  bool tem_canal = false;
  int canal = 6;  // já preso entre 1 e 13
  bool tem_vmax = false;
  float vmax = 0.8f;
  bool tem_ke = false;
  float ke = 1.0f;
  bool tem_kd = false;
  float kd = 1.0f;
};

struct Status {
  int rssi = 0;      // dBm
  float bat = 0;     // volts; 0 = sem sensor
  float fps = 0;
  bool ok = false;   // false = parado pelo failsafe
  uint32_t n = 0;    // último número de comando recebido
};

// Nunca trava e nunca lê além de `tamanho`. Só preenche `comando` quando o
// tipo é Comando, e `config` quando o tipo é Config.
TipoMensagem ler_mensagem(const char* texto, size_t tamanho, Comando& comando, Config& config);

// Escreve {"t":"s",...} em `saida`. Devolve quantos caracteres escreveu,
// ou 0 se não coube.
size_t montar_status(const Status& status, char* saida, size_t capacidade);
