# Cronograma — Software (13/11 → competição)

**Datas fixas:** PC2 seg **23/11** · Code freeze dom **29/11** · Relatório sex **04/12** · Competição sáb **05/12, 10h**

**No Google Agenda:** importe o [`cronograma-software.ics`](cronograma-software.ics) (Configurações → Importar e exportar → escolha a agenda "Titans"). Ele traz os marcos do Software. O PC2, o relatório e a competição já estão na agenda da Titans e não se repetem.

## Onde estamos (13/11)

| Parte | Estado |
|---|---|
| Interface (`interface/`) | Pronta: simulador, robô falso, autoteste, telemetria e CSV. Falta testar com o robô real |
| Protocolo (`docs/protocolo.md`) | v0.1 escrita, ainda não aprovada |
| Firmware (`firmware/`) | Só o esqueleto (imprime "vivo"). **É o gargalo**: câmera, Wi-Fi, WebSocket, motores, failsafe e LED estão todos por fazer |
| Testes de vídeo | **T-01 (FPS) e T-02 (latência) feitos.** A resolução e a qualidade já saem deles. Falta subir os CSVs em `testes/` |
| Decisões em aberto | Pinagem A ou B · onde roda o WebSocket · mensagem `cfg` · qual placa vamos usar |

Regra do plano: **semana 1 = robô andando pela interface com vídeo (para o PC2)**, **semana 2 = robustez e testes**, **semana 3 = só correção de bug, treino e relatório**.

## Divisão em 4 pessoas

| Pessoa | Frente | Entrega | Arquivos |
|---|---|---|---|
| **A · Rede** | Wi-Fi AP, WebSocket `/ws`, mensagens `c`, `p` e `s`, um operador por vez, failsafe das camadas 2 e 3, `rssi` | A interface conecta, o RTT aparece e o robô para quando a conexão cai | `firmware/src/rede.*`, `controle.*` |
| **B · Câmera** | Inicializar a câmera, stream na porta 81 com `Content-Length` e CORS, endpoint `/control`, `fps` no status, ajuste para sol, **LED de conexão e leitura de bateria** (se for a Opção B) | Vídeo na interface com os valores do T-01/T-02; LED e bateria aparecendo na interface | `firmware/src/camera.*`, `leds.*`, `bateria.*` |
| **C · Motores** | PWM LEDC (em canal diferente do da câmera), mistura diferencial, zona morta, rampa, `ke`/`kd`, failsafe da camada 1, `cfg` com `Preferences` | Robô anda reto, gira para os dois lados e não se mexe ao ligar | `firmware/src/motores.*`, `include/config.h` |
| **D · Integração e testes** (sugestão: Igor, que fez a interface) | Esqueleto dos módulos, revisão dos PRs, dias de integração, ajustes na interface e no robô falso, T-03/04/05/07/08, decisões D-xxx, protocolo v1.0, seção de software do relatório | `main` sempre funcionando, CSVs em `testes/` e o texto do relatório | `interface/`, `testes/`, `docs/` |

A e C não precisam da câmera: dá para desenvolver numa ESP32 comum, sem câmera. **Se o grupo só tem uma ESP32-CAM, ela fica com B** até a Integração 1, e A e C usam uma ESP32 simples (ou o robô falso).

## Calendário

### Sáb 14 – dom 15/11 · Arranque

- **Todos (reunião online de 1 h):** aprovar o protocolo (v0.1 → v0.2), fechar a pinagem com a Eletrônica (D-001), confirmar a placa e quem fica com qual hardware.
- **Todos:** PlatformIO instalado e cada um grava o esqueleto numa placa.
- **Já feito:** esqueleto dos módulos (`camera`, `rede`, `motores`, `leds`) com `motores_iniciar()` **primeiro** no `setup()`, `secrets.h.exemplo`, e a lógica testável sem hardware em `firmware/lib/logica/` (mistura, rampa, failsafe, mensagens) com 42 testes (`pio test -e native`).

### Semana 1 · Fazer o robô andar (16 – 22/11)

| Dia | A · Rede | B · Câmera | C · Motores | D · Integração |
|---|---|---|---|---|
| **Seg 16** | Teste rápido do WebSocket no servidor da porta 80 (opção A) | CameraWebServer adaptado, stream abrindo no navegador | PWM nos pinos escolhidos, 1 motor gira na bancada | Esqueleto na `main`, `config.h` com a pinagem |
| **Ter 17** | **D-002**: se a opção A não funcionou, passar para ESPAsyncWebServer na porta 82. `/ws` devolve o `p` → RTT aparece na interface | `Content-Length` e CORS conferidos com o `testes/medidor-latencia.html` | Mistura diferencial, zona morta e limite de `v`, testados pelo serial | Revisar PRs, atualizar o robô falso se o protocolo mudou |
| **Qua 18** | Ler o `c` (limites, até 256 bytes, JSON inválido descartado) e enviar o `s` a cada 500 ms | `/control` (`framesize`, `quality`, `brightness`, `ae_level`), conferir os números no `sensor.h` | Rampa de 10% a cada 20 ms, failsafe da camada 1 | Primeira integração parcial: interface ↔ rede + câmera |
| **Qui 19** | **Integração 1 (todos juntos):** merge na `main`, robô anda pela interface com vídeo, "Girar" esquerda/direita no autoteste | ← | ← | Conduz o dia e anota o que quebrou |
| **Sex 20** | Failsafe da camada 2 (WebSocket fechou) e da camada 3 (500 ms → `ok:0`), "o mais novo derruba o anterior", `rssi` | Reteste rápido: o firmware próprio mantém o FPS do T-01? LED de conexão; bateria no ADC (Opção B) | Medir e ajustar `ke`/`kd` para andar reto | **T-03** (RTT) e **T-05** (queda de conexão) |
| **Sáb 21 – dom 22** | Correções e preparação do PC2: demonstração ensaiada, vídeo de backup da demo, números do T-01, T-02, T-03 e T-05 nos slides | ← | ← | ← |

**Para o PC2 estar bom:** robô anda pela interface com vídeo, as 3 camadas do failsafe são demonstradas ao vivo e FPS e RTT estão medidos.

### Seg 23/11 · PC2

Apresentar. No mesmo dia, cada comentário da banca vira uma issue com um dono.

### Semana 2 · Robustez e testes (24 – 29/11)

| Dia | A · Rede | B · Câmera | C · Motores | D · Integração |
|---|---|---|---|---|
| **Ter 24 – qua 25** | `cfg` + `ack` (se aprovado), canal do Wi-Fi configurável, testar reconexão várias vezes | Ajuste para sol (`ae_level`); refazer o T-02 com os motores ligados, para ver se o ruído piora a latência | `cfg` aplica `vmax`/`ke`/`kd` e salva em `Preferences`; teste de carga (motores + câmera + Wi-Fi juntos: a placa reinicia sozinha?) | Correções do PC2 na interface, **T-04** (perda de mensagens) |
| **Qui 26** | **Integração 2 · teste em campo na Praça Solar:** **T-07** (alcance), vídeo no sol, balão de verdade, calibrar a mira | ← | ← | ← |
| **Sex 27** | **T-08**: 15 min ligado com vídeo e comandos sem travar; quanto tempo a bateria dura | ← | ← | ← |
| **Sáb 28 – dom 29** | Correções. **Code freeze dom 29/11 às 23h**: tag `v1.0` na `main` e protocolo v1.0 | ← | ← | ← |

### Semana 3 · Só correção, treino e relatório (30/11 – 05/12)

| Dia | O quê |
|---|---|
| **Seg 30 – qua 02** | Só correção de bug, sempre com PR revisado. Treino de pilotagem no robô real e no simulador. **Rascunho da seção de software do relatório até qua 02** (arquitetura, protocolo, failsafe, gráficos dos testes): cada um escreve a sua frente e D junta |
| **Qui 03** | **Ensaio geral**: simular o dia (ligar, autoteste, round, troca de bateria, queda de conexão). Escrever o checklist do dia |
| **Sex 04** | **Relatório entregue.** Firmware final gravado na placa e numa reserva; `pnpm build` no notebook do operador; baterias carregadas |
| **Sáb 05, 10h** | **Competição.** Levar: notebook com o build, controle de videogame, cabo USB, placa reserva gravada, `secrets.h` à mão |

## Riscos e o plano B de cada um

| Risco | Plano B |
|---|---|
| WebSocket na porta 80 não funciona no core Arduino | Decidir até ter 17: ESPAsyncWebServer na porta 82 e trocar a porta nos Ajustes da interface |
| Peças ainda não compradas / robô montado atrasar | Programar sem robô: lógica com testes no PC (`pio test -e native`), Wi-Fi e PWM no simulador Wokwi (`-e wokwi`) ou numa ESP32 comum com LEDs (`-e devkit`). Reservar pelo menos 1 semana com o robô pronto para o ajuste fino |
| A placa reinicia quando os motores e a câmera puxam corrente juntos | Testar a alimentação já na Integração 1, não na véspera; avisar a Eletrônica no mesmo dia |
| Pinos de boot (12 e 15 na Opção B) | Pull-down de 10 kΩ, como diz o `config.h` |
| Uma placa só para 4 pessoas | ESP32 comum para A e C; a ESP32-CAM fica com B |
| Alguém some uma semana | Cada frente tem um "par" que revisa os PRs dela (A↔C, B↔D) e consegue assumir |

## Como trabalhar

- Branch por frente: `firmware/rede`, `firmware/camera`, `firmware/motores`, `interface/...`, `testes/...`.
- PR pequeno, revisado pelo par. A `main` sempre compila e roda no robô.
- Check-in de 5 minutos no Discord todo dia: o que fiz, o que vou fazer, o que está travando.
- Cada teste vira um CSV em `testes/` (`2026-11-20_T-03_rtt.csv`) e cada escolha vira um `docs/decisoes/D-xxx.md`. É disso que sai o relatório.
