#include "mensagens.h"

#include <ArduinoJson.h>
#include <stdio.h>
#include <string.h>

TipoMensagem ler_mensagem(const char* texto, size_t tamanho, Comando& comando, Config& config) {
  if (texto == nullptr || tamanho == 0 || tamanho > TAMANHO_MAX_MENSAGEM) {
    return TipoMensagem::Invalida;
  }

  JsonDocument doc;
  if (deserializeJson(doc, texto, tamanho) != DeserializationError::Ok) {
    return TipoMensagem::Invalida;
  }
  if (!doc.is<JsonObject>()) return TipoMensagem::Invalida;

  const char* tipo = doc["t"] | "";

  if (strcmp(tipo, "c") == 0) {
    Comando c;
    c.x = doc["x"] | 0.0f;
    c.y = doc["y"] | 0.0f;
    c.v = doc["v"] | 0.0f;
    c.n = doc["n"] | static_cast<uint32_t>(0);
    comando = c;
    return TipoMensagem::Comando;
  }

  if (strcmp(tipo, "p") == 0) return TipoMensagem::Ping;

  if (strcmp(tipo, "cfg") == 0) {
    Config c;
    if (doc["ch"].is<int>()) {
      int canal = doc["ch"].as<int>();
      c.canal = canal < 1 ? 1 : (canal > 13 ? 13 : canal);
      c.tem_canal = true;
    }
    if (doc["vmax"].is<float>()) { c.vmax = doc["vmax"].as<float>(); c.tem_vmax = true; }
    if (doc["ke"].is<float>())   { c.ke = doc["ke"].as<float>();     c.tem_ke = true; }
    if (doc["kd"].is<float>())   { c.kd = doc["kd"].as<float>();     c.tem_kd = true; }
    config = c;
    return TipoMensagem::Config;
  }

  return TipoMensagem::Desconhecida;
}

size_t montar_status(const Status& s, char* saida, size_t capacidade) {
  if (saida == nullptr || capacidade == 0) return 0;
  int escrito = snprintf(saida, capacidade,
                         "{\"t\":\"s\",\"rssi\":%d,\"bat\":%.2f,\"fps\":%.0f,\"ok\":%d,\"n\":%lu}",
                         s.rssi, static_cast<double>(s.bat), static_cast<double>(s.fps),
                         s.ok ? 1 : 0, static_cast<unsigned long>(s.n));
  if (escrito < 0 || static_cast<size_t>(escrito) >= capacidade) {
    saida[0] = '\0';
    return 0;
  }
  return static_cast<size_t>(escrito);
}
