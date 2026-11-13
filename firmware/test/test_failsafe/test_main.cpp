// Testes do failsafe. Rodam no computador: pio test -e native
// O "tempo" aqui é só um número: dá para testar 500 ms sem esperar.
#include <unity.h>

#include "failsafe.h"

void setUp() {}
void tearDown() {}

void test_ao_ligar_fica_parado() {
  Failsafe f;
  TEST_ASSERT_TRUE(f.deve_parar(0));
  TEST_ASSERT_TRUE(f.deve_parar(10000));
}

void test_com_comando_recente_pode_andar() {
  Failsafe f;
  f.comando_recebido(1000);
  TEST_ASSERT_FALSE(f.deve_parar(1000));
  TEST_ASSERT_FALSE(f.deve_parar(1050));   // ritmo normal: 50 ms
  TEST_ASSERT_FALSE(f.deve_parar(1500));   // exatamente 500 ms ainda vale
}

void test_500ms_sem_comando_para() {
  Failsafe f;
  f.comando_recebido(1000);
  TEST_ASSERT_TRUE(f.deve_parar(1501));
  TEST_ASSERT_TRUE(f.deve_parar(5000));
}

void test_comando_novo_volta_a_andar() {
  Failsafe f;
  f.comando_recebido(1000);
  TEST_ASSERT_TRUE(f.deve_parar(2000));
  f.comando_recebido(2000);
  TEST_ASSERT_FALSE(f.deve_parar(2010));
}

void test_conexao_caiu_para_na_hora() {
  Failsafe f;
  f.comando_recebido(1000);
  f.conexao_caiu();
  TEST_ASSERT_TRUE(f.deve_parar(1001));  // mesmo com comando de 1 ms atrás
  f.comando_recebido(1100);              // reconectou e mandou comando
  TEST_ASSERT_FALSE(f.deve_parar(1110));
}

void test_limite_configuravel() {
  Failsafe f(200);
  f.comando_recebido(0);
  TEST_ASSERT_FALSE(f.deve_parar(200));
  TEST_ASSERT_TRUE(f.deve_parar(201));
}

void test_millis_voltando_a_zero() {
  // millis() volta a zero depois de ~49 dias. A conta tem que continuar certa.
  Failsafe f;
  f.comando_recebido(0xFFFFFF00u);
  TEST_ASSERT_FALSE(f.deve_parar(0x00000064u));  // passaram 356 ms
  TEST_ASSERT_TRUE(f.deve_parar(0x00000200u));   // passaram 768 ms
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_ao_ligar_fica_parado);
  RUN_TEST(test_com_comando_recente_pode_andar);
  RUN_TEST(test_500ms_sem_comando_para);
  RUN_TEST(test_comando_novo_volta_a_andar);
  RUN_TEST(test_conexao_caiu_para_na_hora);
  RUN_TEST(test_limite_configuravel);
  RUN_TEST(test_millis_voltando_a_zero);
  return UNITY_END();
}
