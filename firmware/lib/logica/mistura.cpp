#include "mistura.h"

float limita(float valor, float minimo, float maximo) {
  if (valor != valor) {  // NaN: nunca deixar chegar no motor
    return (minimo <= 0.0f && 0.0f <= maximo) ? 0.0f : minimo;
  }
  if (valor < minimo) return minimo;
  if (valor > maximo) return maximo;
  return valor;
}

float zona_morta(float valor) {
  return (valor > -ZONA_MORTA && valor < ZONA_MORTA) ? 0.0f : valor;
}

Rodas misturar(float x, float y, float v, const AjusteMotores& ajuste) {
  x = zona_morta(limita(x, -1.0f, 1.0f));
  y = zona_morta(limita(y, -1.0f, 1.0f));
  v = limita(v, 0.0f, 1.0f);

  const float escala = v * ajuste.vmax;
  Rodas r;
  r.esq = limita(y + x, -1.0f, 1.0f) * escala * ajuste.ke;
  r.dir = limita(y - x, -1.0f, 1.0f) * escala * ajuste.kd;
  return r;
}

float rampa(float atual, float alvo, float passo) {
  if (alvo > atual + passo) return atual + passo;
  if (alvo < atual - passo) return atual - passo;
  return alvo;
}

AjusteMotores ajuste_seguro(float vmax, float ke, float kd) {
  AjusteMotores a;
  a.vmax = limita(vmax, 0.3f, 1.0f);
  a.ke = limita(ke, 0.8f, 1.2f);
  a.kd = limita(kd, 0.8f, 1.2f);
  return a;
}
