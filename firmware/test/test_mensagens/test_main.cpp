// Testes das mensagens do protocolo (docs/protocolo.md, seção 3).
// Rodam no computador: pio test -e native
#include <string.h>
#include <unity.h>

#include "mensagens.h"

void setUp() {}
void tearDown() {}

static const float TOL = 0.0001f;
static Comando cmd;
static Config cfg;

static TipoMensagem ler(const char* texto) {
  cmd = Comando();
  cfg = Config();
  return ler_mensagem(texto, strlen(texto), cmd, cfg);
}

// --- comando "c" -------------------------------------------------------------
void test_comando_completo() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"c\",\"x\":0.4,\"y\":1,\"v\":0.6,\"n\":1532}") == TipoMensagem::Comando);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.4f, cmd.x);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 1.0f, cmd.y);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.6f, cmd.v);
  TEST_ASSERT_EQUAL_UINT32(1532, cmd.n);
}

void test_comando_sem_campos_vira_zero() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"c\",\"y\":1}") == TipoMensagem::Comando);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.0f, cmd.x);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 1.0f, cmd.y);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.0f, cmd.v);  // sem v = parado
}

void test_campo_com_texto_vira_zero() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"c\",\"x\":\"muito\",\"y\":1,\"v\":1}") == TipoMensagem::Comando);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.0f, cmd.x);
}

void test_campo_desconhecido_e_ignorado() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"c\",\"x\":0,\"y\":1,\"v\":1,\"novo\":42}") == TipoMensagem::Comando);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 1.0f, cmd.y);
}

// --- ping "p" ----------------------------------------------------------------
void test_ping() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"p\",\"n\":88,\"ts\":1730912345678}") == TipoMensagem::Ping);
}

// --- cfg ---------------------------------------------------------------------
void test_cfg_completo() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"cfg\",\"ch\":6,\"vmax\":0.8,\"ke\":1.0,\"kd\":0.95}") == TipoMensagem::Config);
  TEST_ASSERT_TRUE(cfg.tem_canal && cfg.tem_vmax && cfg.tem_ke && cfg.tem_kd);
  TEST_ASSERT_EQUAL_INT(6, cfg.canal);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.8f, cfg.vmax);
  TEST_ASSERT_FLOAT_WITHIN(TOL, 0.95f, cfg.kd);
}

void test_cfg_parcial_marca_so_o_que_veio() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"cfg\",\"ke\":1}") == TipoMensagem::Config);
  TEST_ASSERT_TRUE(cfg.tem_ke);
  TEST_ASSERT_FALSE(cfg.tem_canal);
  TEST_ASSERT_FALSE(cfg.tem_vmax);
  TEST_ASSERT_FALSE(cfg.tem_kd);
}

void test_cfg_canal_fora_da_faixa_e_preso() {
  ler("{\"t\":\"cfg\",\"ch\":20}");
  TEST_ASSERT_EQUAL_INT(13, cfg.canal);
  ler("{\"t\":\"cfg\",\"ch\":0}");
  TEST_ASSERT_EQUAL_INT(1, cfg.canal);
}

// --- mensagens ruins nunca travam o robô -------------------------------------
void test_json_estragado_e_invalido() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"c\",\"x\":0.4,") == TipoMensagem::Invalida);
  TEST_ASSERT_TRUE(ler("lixo") == TipoMensagem::Invalida);
  TEST_ASSERT_TRUE(ler("") == TipoMensagem::Invalida);
}

void test_json_que_nao_e_objeto_e_invalido() {
  TEST_ASSERT_TRUE(ler("[1,2,3]") == TipoMensagem::Invalida);
  TEST_ASSERT_TRUE(ler("42") == TipoMensagem::Invalida);
}

void test_mensagem_grande_demais_e_invalida() {
  char grande[400];
  memset(grande, ' ', sizeof grande);
  memcpy(grande, "{\"t\":\"p\"}", 9);
  grande[sizeof grande - 1] = '\0';
  TEST_ASSERT_TRUE(ler(grande) == TipoMensagem::Invalida);
}

void test_tipo_desconhecido() {
  TEST_ASSERT_TRUE(ler("{\"t\":\"xyz\"}") == TipoMensagem::Desconhecida);
  TEST_ASSERT_TRUE(ler("{\"x\":1}") == TipoMensagem::Desconhecida);  // sem "t"
}

void test_nao_le_alem_do_tamanho() {
  // Só os 9 primeiros caracteres valem: {"t":"p"}. O resto é lixo de memória.
  const char texto[] = "{\"t\":\"p\"}LIXO_DEPOIS";
  TEST_ASSERT_TRUE(ler_mensagem(texto, 9, cmd, cfg) == TipoMensagem::Ping);
}

// --- status "s" --------------------------------------------------------------
void test_status_igual_ao_protocolo() {
  Status s;
  s.rssi = -58;
  s.bat = 7.62f;
  s.fps = 17.2f;
  s.ok = true;
  s.n = 1532;
  char buf[128];
  size_t tam = montar_status(s, buf, sizeof buf);
  TEST_ASSERT_EQUAL_STRING("{\"t\":\"s\",\"rssi\":-58,\"bat\":7.62,\"fps\":17,\"ok\":1,\"n\":1532}", buf);
  TEST_ASSERT_EQUAL(strlen(buf), tam);
}

void test_status_sem_sensor_e_parado() {
  Status s;  // tudo zero, ok = false
  char buf[128];
  montar_status(s, buf, sizeof buf);
  TEST_ASSERT_EQUAL_STRING("{\"t\":\"s\",\"rssi\":0,\"bat\":0.00,\"fps\":0,\"ok\":0,\"n\":0}", buf);
}

void test_status_que_nao_cabe_devolve_zero() {
  Status s;
  char buf[10];
  TEST_ASSERT_EQUAL(0, montar_status(s, buf, sizeof buf));
  TEST_ASSERT_EQUAL_STRING("", buf);
}

void test_status_cabe_em_256_e_le_de_volta() {
  // O status montado é um JSON válido que o próprio leitor reconhece.
  Status s;
  s.rssi = -90;
  s.n = 4294967295u;
  char buf[TAMANHO_MAX_MENSAGEM];
  size_t tam = montar_status(s, buf, sizeof buf);
  TEST_ASSERT_TRUE(tam > 0);
  TEST_ASSERT_TRUE(ler_mensagem(buf, tam, cmd, cfg) == TipoMensagem::Desconhecida);  // "s" só sai do robô
}

int main(int, char**) {
  UNITY_BEGIN();
  RUN_TEST(test_comando_completo);
  RUN_TEST(test_comando_sem_campos_vira_zero);
  RUN_TEST(test_campo_com_texto_vira_zero);
  RUN_TEST(test_campo_desconhecido_e_ignorado);
  RUN_TEST(test_ping);
  RUN_TEST(test_cfg_completo);
  RUN_TEST(test_cfg_parcial_marca_so_o_que_veio);
  RUN_TEST(test_cfg_canal_fora_da_faixa_e_preso);
  RUN_TEST(test_json_estragado_e_invalido);
  RUN_TEST(test_json_que_nao_e_objeto_e_invalido);
  RUN_TEST(test_mensagem_grande_demais_e_invalida);
  RUN_TEST(test_tipo_desconhecido);
  RUN_TEST(test_nao_le_alem_do_tamanho);
  RUN_TEST(test_status_igual_ao_protocolo);
  RUN_TEST(test_status_sem_sensor_e_parado);
  RUN_TEST(test_status_que_nao_cabe_devolve_zero);
  RUN_TEST(test_status_cabe_em_256_e_le_de_volta);
  return UNITY_END();
}
