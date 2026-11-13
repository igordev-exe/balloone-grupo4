// Balloone — câmera (frente B · Câmera). Veja o guia, seção B.
#include <Arduino.h>

#include "camera.h"
#include "config.h"

bool camera_iniciar() {
#ifdef SEM_CAMERA
  return false;  // o Wokwi e a ESP32 comum não têm câmera
#else
  // TODO (B): camera_config_t com os valores do T-01/T-02 e esp_camera_init().
  return false;
#endif
}

void camera_servidor_iniciar() {
#ifndef SEM_CAMERA
  // TODO (B): startCameraServer() do app_httpd.cpp (portas 80 e 81).
#endif
}

float camera_fps() {
  // TODO (B): contar os quadros enviados por segundo.
  return 0;
}
