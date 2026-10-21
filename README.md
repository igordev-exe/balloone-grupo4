# Balloone — Grupo 4 · Processo Trainee Titans 2026/2

Robô teleoperado com ESP32-CAM que estoura balões na Praça Solar da UnB FCTE.

**Competição:** 05/12/2026, 10h · **Relatório:** 04/12/2026 · **PC1:** 26/10 · **PC2:** 23/11

## Onde cada coisa mora

| Pasta | Conteúdo | Subequipe |
|---|---|---|
| `firmware/` | Código da ESP32-CAM (PlatformIO) | Firmware |
| `interface/` | Painel do operador (HTML/CSS/JS) | Interface |
| `visao/` | Scripts de visão computacional (opcional) | Interface |
| `eletronica/` | Projeto do Altium e PDFs dos esquemáticos | Eletrônica |
| `cad/` | Peças editáveis e STLs para imprimir | Mecânica |
| `testes/` | Scripts e dados de medição | Documentação |
| `docs/decisoes/` | Um arquivo por decisão (`D-001.md`, `D-002.md`...) | Quem propôs |
| `docs/imagens/` | Imagens usadas na documentação | Todos |

Fora do repositório:

- **Drive** (fotos, vídeos, atas, compras): [link]
- **Relatório** (ABNT, Overleaf): [link]
- **Conversa do dia a dia:** Discord do grupo

## Como contribuir

1. Crie uma branch: `area/o-que-faz` (ex.: `firmware/failsafe`, `cad/suporte-balao`).
2. Commits curtos, no imperativo: "adiciona failsafe de 500 ms".
3. Abra um Pull Request e peça revisão de alguém de outra área.
4. A `main` sempre compila e roda no robô.

## Como rodar o firmware

1. Instale o VS Code e a extensão **PlatformIO IDE**.
2. Abra a pasta `firmware/` no VS Code (File → Open Folder).
3. Conecte a placa por USB e clique em **Upload** (seta → na barra inferior).
4. Abra o **Serial Monitor** (ícone de tomada) a 115200 baud.

## Grupo

Melissa de Sousa Santos · Rafael Rodrigues Alencar · André Luís Livio Alvaro dos Santos ·
Pedro Henrique Galdino de Andrade Wollmann · Karen de Oliveira Ribeiro · Heitor Mendes Fernandes ·
Igor Alves Rodrigues · Italo Araújo Silva · Pedro Falcão Moura · Lucas Emanuel de Sousa Araújo
