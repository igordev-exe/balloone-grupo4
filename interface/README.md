# Interface do operador · Balloone · Grupo 4

Estação de controle do robô: vídeo da ESP32-CAM, comandos por WebSocket, autoteste antes do round e telemetria com exportação em CSV. Feita em React, Vite e TypeScript.

## Como rodar

No Windows, o jeito mais fácil: dois cliques em `INICIAR.bat`. Ele instala o Node.js (se faltar) e as dependências, liga o servidor e abre a interface numa janela própria em tela cheia (Edge ou Chrome em modo app). Na primeira vez cria o atalho "Balloone G4" na Área de Trabalho. `ROBO-FALSO.bat` sobe o robô falso.

Pelo terminal:

```bash
pnpm install
pnpm dev                  # http://localhost:5173
```

No dia da prova, sirva o build pelo próprio notebook:

```bash
pnpm build
python -m http.server 8000 -d dist     # abra http://localhost:8000
```

Precisa ser `localhost`. O Chrome só libera a Gamepad API e o Wake Lock (tela sem apagar) em contexto seguro, e `http://192.168.4.1` não conta como seguro.

**Funciona sem internet.** Quando o notebook está na rede do robô, não tem internet. Por isso as fontes e as bibliotecas vão dentro do build. A versão anterior puxava as fontes do Google Fonts e o fundo do vídeo do Unsplash, e as duas coisas falhariam na Praça Solar.

## Link para o grupo (GitHub Pages)

O workflow `.github/workflows/interface-pages.yml` (na raiz do repositório) publica a interface a cada push na `main` que mexa em `interface/`. Para ativar, vá em **Settings → Pages → Source: GitHub Actions**. O link fica `https://igordev-exe.github.io/balloone-grupo4/`.

Pelo link, só o **Simulador** funciona. O Pages usa HTTPS, o robô usa HTTP, e o navegador bloqueia essa mistura. Para pilotar o robô, rode a interface no notebook (seção acima). A própria interface avisa isso quando aberta pelo link.

## Três jeitos de testar

| Modo | Para quê | Como |
|---|---|---|
| Simulador | Treinar o operador e mexer na interface sem hardware | Botão "Simulador" no autoteste. Usa o mesmo protocolo e o mesmo failsafe do robô e tem atraso de vídeo ajustável. A arena tem balões em suportes, um robô adversário rodando com o balão vermelho dele (+4) e a mureta da Praça |
| Robô falso | Testar o WebSocket de verdade, pela rede | `pip install websockets pillow`, depois `python tools/robo_falso.py`. Na interface, escolha "Robô real", endereço `127.0.0.1` e, em Ajustes, porta do WebSocket `8080` e porta do vídeo `8081` |
| Robô real | ESP32 | Endereço `192.168.4.1`. Vídeo em `:81/stream` (CameraWebServer) e comandos em `ws://192.168.4.1/ws` |

O robô falso mostra as rodas no terminal, conta os comandos perdidos pelo número de sequência e avisa quando o failsafe atua. Os parâmetros `--perda 0.05` e `--atraso 40` simulam uma rede ruim.

## Controles

| Ação | Teclado | Controle de videogame |
|---|---|---|
| Mover | WASD ou setas | Analógico esquerdo (com curva exponencial) |
| Turbo (v = 1,0) | Shift segurado | RT ou RB |
| Precisão (v = 0,3, curva pela metade) | Q segurado | LT ou LB |
| Parar | Espaço | B ou círculo |
| Tela cheia | F | — |

O robô só se move na tela de **Pilotagem** com a gaveta de Ajustes fechada. Nas outras telas, o laço de comando continua mandando zero.

## Como ler a mira

- **Cruz com ponto no centro:** é o ponto de estouro, onde o balão fica no quadro no instante em que a ponta do mecanismo encosta nele. Calibre em Ajustes → Mira com o robô real: encoste um balão na ponta e arraste a mira até o centro dele.
- **Colchetes nos cantos (triângulos do kit):** têm o tamanho de um balão a 1 m. Se o balão preenche os colchetes, ele está a cerca de 1 m; se cabe com folga, está mais longe. O cálculo usa `BALLOON_DIAMETER_M` (0,22 m) e `CAMERA_FOV_DEG` (62°) em `src/config.ts`. O edital não dá o diâmetro, então meçam o balão real e ajustem.
- **Linhas tracejadas:** a trajetória com a direção atual. Ficam âmbar em ré.
- **Chevrons:** aparecem acima da mira quando o robô anda para a frente (vermelhos no turbo) e abaixo dela em ré.

## Segurança (lado da interface)

- O laço manda comandos a 20 Hz, inclusive zero. Assim, a janela de 500 ms do failsafe do robô tem margem para 10 reenvios.
- Quando a janela perde o foco (Alt+Tab, notificação, aba escondida), a interface solta todas as teclas e manda parar.
- A reconexão do WebSocket é automática a cada 1 s. Se um IP fora do ar não responder em 2,5 s, a tentativa é abortada.
- Se o Wi-Fi engasgar, a interface descarta comandos em vez de enfileirar. Comando atrasado é pior que comando perdido.
- Quando a conexão cai, aparece o alerta grande "SEM CONEXÃO" com bipe. Bateria baixa e sinal instável geram faixa âmbar e bipe triplo.
- O botão "Testar queda de conexão (3 s)", em Ajustes, executa o T-05 com um clique.

## Protocolo usado

Segue o Guia, seção 5.4.

```jsonc
// interface → robô, a cada 50 ms
{"t":"c","x":0.4,"y":1,"v":0.6,"n":1532}
// interface → robô, a cada 1 s. O robô devolve igual, na hora.
{"t":"p","n":88,"ts":1730912345678}
// robô → interface, a cada ~500 ms
{"t":"s","rssi":-58,"bat":7.62,"fps":17,"ok":1,"n":1532}
```

**Pendências para o `docs/protocolo.md` e o firmware:**

1. **Caminho e porta do WebSocket.** A interface assume `/ws` na porta 80, que é o padrão do ESPAsyncWebServer. Os dois podem ser trocados em Ajustes.
2. **Mensagem `cfg` (proposta).** Fica fora do protocolo até o grupo aprovar. Formato: `{"t":"cfg","ch":6,"vmax":0.8,"ke":1.0,"kd":0.95}` (canal, PWM máximo e fator de cada motor). O firmware salvaria esses valores na memória da placa.
3. **Câmera.** A interface usa o endpoint `/control?var=…&val=…` do próprio CameraWebServer (`framesize`, `quality`, `brightness`, `ae_level`). Os valores de `framesize` (QVGA = 5, HVGA = 7, VGA = 8) devem ser conferidos com a versão da biblioteca `esp32-camera`.
4. **Autoteste dos motores.** Não precisa de mensagem nova: `x = 0,5` e `y = 0,5` giram só a roda esquerda (esquerdo = y + x, direito = y − x), e `x = −0,5` gira só a direita.

## O que foi corrigido em relação ao protótipo inicial

| Problema | Efeito | Correção |
|---|---|---|
| O comando só era enviado quando uma tecla mudava | Segurando W, o robô pararia em 500 ms pelo failsafe de silêncio | Laço fixo de 20 Hz |
| O controle de videogame era detectado, mas nunca lido | O analógico não fazia nada | Leitura dos eixos a cada envio, com zona morta e curva exponencial |
| `preventDefault` global nas setas e no espaço | Não dava para mover o cursor no campo de endereço | Campos de formulário recebem as teclas normalmente |
| Auto-repetição do teclado | Dezenas de renderizações por segundo | As repetições são ignoradas |
| `Range` declarado dentro da gaveta | Os ajustes voltavam ao valor inicial a cada 1,5 s | Componente movido para fora da gaveta, com estado controlado |
| `setHistory` chamado dentro de `setRobot` | Pontos duplicados no gráfico durante o `pnpm dev` (o StrictMode executa a função duas vezes) | Atualizações de estado separadas |
| A mira ficava num SVG com `preserveAspectRatio="none"` | O círculo virava elipse e a mira saía do lugar ao redimensionar a janela | A mira e as linhas de trajetória ficam dentro de um quadro com a proporção real do vídeo, e a mira é calibrável em Ajustes |
| Autoteste fictício (tudo "ok" ao conectar) | Não testava nada | Vídeo, comandos, bateria e RTT medidos de verdade; motores girados um por vez e confirmados pelo operador |
| Botão invisível "TESTE" no rodapé (opacidade 0,025) | Um clique sem querer derrubava a conexão | Substituído pelo teste de queda em Ajustes |
| Navegação por cima do canto do vídeo | Cobria a etiqueta da câmera | Navegação movida para a barra de status |
| Etiqueta fixa "VGA" | Não batia com o QVGA do plano | Mostra a resolução escolhida |
| Gráfico rotulado "60 segundos" com 30 amostras a cada 1,5 s | Mostrava 45 s | 120 amostras de status a 2 por segundo = 60 s |
| CameraWebServer aceita um cliente por vez | Trocar de tela podia deixar o vídeo preso | A conexão do stream é fechada ao desmontar o vídeo |
| Valores da barra de status sem indicação de queda | RTT e bateria antigos pareciam ao vivo | Os valores ficam esmaecidos quando a conexão cai |
| Título e idioma da página vazios | A aba do navegador ficava sem nome | `site.json` com título e `pt-BR` |

## Visual

A interface usa a linguagem do **Sci-fi UI Kit (Free) (Community)** do Figma, e boa parte dos elementos saiu do próprio kit:

| Do kit | Onde aparece |
|---|---|
| Tela MECH - SCREEN (tela vermelha, quadro [DANGER], triângulo CAUTION, traços nos cantos, contadores -03) | Tela de queda de conexão. O cronômetro do quadro conta há quanto tempo o robô está sem sinal |
| Button Pack 01 (colchetes nos cantos e pontilhado à direita) | Todos os botões e as teclas WASD |
| Button Pack 02 e 03 (`<DANGER>` com faixas de risco, `WARRNING` com triângulos) | Títulos de seção e avisos de bateria baixa e sinal instável |
| HUD Pack v1 (barra "Charging 84") | Bateria na barra de status |
| Contadores -03 e rótulo `[DMR] :ODST` | Cronômetro do round, modo de velocidade e etiquetas do HUD |
| Navigation Bar, Tag, Toast message, Checkbox, Toggle, Slider, Content Switcher | Barra de status, estado da conexão, avisos, autoteste e ajustes |
| Ícones do kit (engrenagem, volume, alerta, relógio, sinal, ✓, ✕) | Botões e status |
| Pacote de elementos HUD brancos (alvo, chevrons, código de barras, cubo, triângulos, espiral, painel) | Mira, setas de avanço, decoração do autoteste e indicador de carregamento |

Os PNGs estão em `src/assets/kit/`, recortados do kit com fundo transparente e tingidos por CSS (`mask-image`). O quadro [DANGER] e os contadores foram redesenhados em SVG para receber texto e números ao vivo.

**Cores.** As cores seguem a paleta do kit:

- **Vermelho (Primary):** estrutura do HUD.
- **Ciano (Info):** dados ao vivo e o que está ativo (tecla apertada, verificação ok, mira).
- **Âmbar (Warning):** atenção.

A queda de conexão continua inconfundível mesmo com o vermelho na estrutura: ela é a única coisa que pinta **a tela inteira**, com pulsação, faixas, bipe e o quadro [DANGER] no centro.

**Fontes:**

- **Russo One:** títulos.
- **Montserrat** com espaçamento largo: rótulos do HUD, como no kit.
- **Oxanium:** números. Os dígitos têm largura fixa, então os valores não "pulam".

O **modo sol** (em Ajustes) tira o brilho, a varredura e a aberração cromática, e deixa os textos em branco puro.

| Biblioteca | Licença | Por quê |
|---|---|---|
| [augmented-ui](https://augmented-ui.com) 2.0 | BSD-2 | Cantos cortados com borda de verdade no vídeo e nos gráficos |
| [@fontsource](https://fontsource.org) Russo One, Montserrat, Oxanium | OFL | Fontes empacotadas para funcionar sem internet |
| [lucide-react](https://lucide.dev) | ISC | Só os ícones que o kit não tem (controle, gravar, tela cheia, exportar) |

Também foram avaliadas e ficaram de fora:

- **Arwes:** ainda em versão alfa.
- **NyxUI:** a maior parte é paga e voltada para Next.js.
- **Assets do Magnific/Freepik:** a licença muda de asset para asset.

Os arquivos da Comunidade do Figma costumam sair sob CC BY 4.0. Antes de publicar, confira a licença na página do kit e dê crédito ao autor no relatório.

## Estrutura

```
src/
  config.ts              ritmos, limites e velocidades (um lugar só)
  lib/protocol.ts        tipos e validação das mensagens
  lib/link.ts            WsLink (WebSocket real) e SimLink, com a mesma interface
  lib/sim.ts             física do robô simulado e failsafe
  lib/input.ts           teclado + controle → x, y, v
  lib/audio.ts           bipes gerados na hora
  hooks/useRobot.ts      conexão, ping/RTT, perda, histórico, sessão para o CSV
  hooks/useInput.ts      teclas, perda de foco, controle conectado
  components/            StatusBar, Preflight, Cockpit, Video, SimCanvas, SettingsDrawer, Telemetry, Toasts
  components/Kit.tsx     peças do Sci-fi UI Kit (ícones, [DANGER], contadores, rótulos de risco)
  assets/kit/            PNGs recortados do kit
tools/robo_falso.py      robô falso em Python
```
