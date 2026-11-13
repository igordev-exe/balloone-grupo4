// Balloone — câmera (frente B · Câmera). Contrato: não mude nomes nem parâmetros sem avisar.
#pragma once

bool camera_iniciar();           // liga o sensor; false = deu problema
void camera_servidor_iniciar();  // vídeo na porta 81 e /control na 80 (depois do Wi-Fi)
float camera_fps();              // quadros enviados no último segundo
