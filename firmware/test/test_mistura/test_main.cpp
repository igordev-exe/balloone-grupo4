// Testes da conta das rodas. Rodam no computador: pio test -e native
#include <math.h>
#include <unity.h>

#include "mistura.h"

void setUp() {}
void tearDown() {}

static const AjusteMotores CHEIO = {1.0f, 1.0f, 1.0f};  // vmax, ke, kd = 1
static const float TOL = 0.0001f;

static void confere(float esq, float dir, Rodas r) {
  TEST_ASSERT_FLOAT_WITHIN(TOL, esq, r.esq);
  TEST_ASSERT_FLOAT_WITHIN(TOL, dir, r.dir);
}

// --- a tabela do guia: o que cada tecla faz ---------------------------------
void test_frente_gira_as_duas_para_frente() { confere(1, 1, misturar(0, 1, 1, CHEIO)); }
void test_re_gira_as_duas_para_tras() { confere(-1, -1, misturar(0, -1, 1, CHEIO)); }
void test_girar_direita_gira_no_lugar() { confere(1, -1, misturar(1, 0, 1, CHEIO)); }
void test_girar_esquerda_gira_no_lugar() { confere(-1, 1, misturar(-1, 0, 1, CHEIO)); }
void test_frente_mais_direita_faz_curva() { confere(1, 0, misturar(1, 1, 1, CHEIO)); }
void test_sem_comando_fica_parado() { confere(0, 0, misturar(0, 0, 1, CHEIO)); }

// --- autoteste "Girar" da interface (protocolo 3.1) --------------------------
void test_autoteste_so_roda_esquerda() { confere(1, 0, misturar(0.5f, 0.5f, 1, CHEIO)); }
void test_autoteste_so_roda_direita() { confere(0, 1, misturar(-0.5f, 0.5f, 1, CHEIO)); }

// --- velocidade e ajustes ----------------------------------------------------
void test_modo_normal_com_vmax() {
  AjusteMotores a;  // vmax 0,8 por padrão
  confere(0.48f, 0.48f, misturar(0, 1, 0.6f, a));  // 1 x 0,6 x 0,8
}

void test_v_zero_para_tudo() { confere(0, 0, misturar(1, 1, 0, CHEIO)); }

void test_ke_e_kd_compensam_cada_lado() {
  AjusteMotores a = {1.0f, 0.95f, 1.1f};
  confere(0.95f, 1.1f, misturar(0, 1, 1, a));
}

// --- entradas ruins nunca viram movimento estranho ---------------------------
void test_zona_morta_ignora_tremidinha() { confere(0, 0, misturar(0.05f, -0.07f, 1, CHEIO)); }

void test_valores_fora_da_faixa_sao_presos() {
  confere(1, -1, misturar(5, 0, 1, CHEIO));      // x = 5 vale como x = 1
  confere(0, 0, misturar(0, 1, -2, CHEIO));      // v negativo vale como 0
  confere(1, 1, misturar(0, 1, 9, CHEIO));       // v = 9 vale como 1
}

void test_nan_vira_parado() { confere(0, 0, misturar(NAN, NAN, 1, CHEIO)); }

// --- rampa: no máximo 10% por passo ------------------------------------------
void test_rampa_sobe_de_10_em_10() {
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.1f, rampa(0, 1));
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.5f, rampa(0.6f, 0));
  TEST_ASSERT_FLOAT_WITHIN(TOL, -0.1f, rampa(0, -1));
}

void test_rampa_chega_ao_alvo_em_10_passos() {
  float atual = 0;
  for (int i = 0; i < 10; i++) atual = rampa(atual, 1);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 1.0f, atual);  // 10 passos de 20 ms = 0,2 s
}

void test_rampa_nao_passa_do_alvo() {
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.0f, rampa(0.05f, 0));
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.3f, rampa(0.25f, 0.3f));
}

// --- cfg ---------------------------------------------------------------------
void test_ajuste_seguro_prende_nas_faixas() {
  AjusteMotores a = ajuste_seguro(2.0f, 0.5f, 1.5f);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 1.0f, a.vmax);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.8f, a.ke);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 1.2f, a.kd);

  a = ajuste_seguro(0.1f, 1.0f, 0.95f);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.3f, a.vmax);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.95f, a.kd);
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_frente_gira_as_duas_para_frente);
  RUN_TEST(test_re_gira_as_duas_para_tras);
  RUN_TEST(test_girar_direita_gira_no_lugar);
  RUN_TEST(test_girar_esquerda_gira_no_lugar);
  RUN_TEST(test_frente_mais_direita_faz_curva);
  RUN_TEST(test_sem_comando_fica_parado);
  RUN_TEST(test_autoteste_so_roda_esquerda);
  RUN_TEST(test_autoteste_so_roda_direita);
  RUN_TEST(test_modo_normal_com_vmax);
  RUN_TEST(test_v_zero_para_tudo);
  RUN_TEST(test_ke_e_kd_compensam_cada_lado);
  RUN_TEST(test_zona_morta_ignora_tremidinha);
  RUN_TEST(test_valores_fora_da_faixa_sao_presos);
  RUN_TEST(test_nan_vira_parado);
  RUN_TEST(test_rampa_sobe_de_10_em_10);
  RUN_TEST(test_rampa_chega_ao_alvo_em_10_passos);
  RUN_TEST(test_rampa_nao_passa_do_alvo);
  RUN_TEST(test_ajuste_seguro_prende_nas_faixas);
  return UNITY_END();
}
