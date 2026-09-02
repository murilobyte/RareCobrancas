# Rare Cobranças — Landing Page

HTML, CSS e JavaScript puros. **Não há build**: nenhum bundler, nenhum passo de
compilação, nenhuma dependência para instalar. Você edita um arquivo, dá
refresh, e vê o resultado.

## Rodando

```bash
npm run dev          # http://localhost:4173
```

O script sobe apenas um servidor estático (`python3 -m http.server`). Qualquer
servidor serve. Alternativas equivalentes:

```bash
npx serve .
php -S localhost:4173
```

Abrir o `index.html` direto no navegador (duplo clique) também funciona, porque
todos os scripts são clássicos e os caminhos são relativos.

## Estrutura

```
index.html            Página inteira: marcação + TODO o texto
css/tokens.css        Cores, tipografia, espaçamentos, curvas de animação
css/style.css         Estilo de cada seção, na mesma ordem do HTML
js/main.js            Preloader, header, reveals, seção pinada, FAQ, parallax
vendor/               GSAP + ScrollTrigger + CustomEase + Lenis (cópias locais)
src/img/              Fotos (originais + variantes redimensionadas)
src/svg/              Logos
refs/LandingPage.jpg  Referência visual que a página replica
```

## Onde trocar os textos

**Todo o texto está no `index.html`**, dentro da seção correspondente. Cada
seção é delimitada por um comentário grande:

```html
<!-- ==================================================================
     4 — Método (pinned)
=================================================================== -->
```

As seções, na ordem: Header · 1 Hero · 2 O problema · 3 A virada · 4 Método ·
5 Diferenciais · 6 FAQ · 7 CTA final · 8 Footer.

Dois cuidados ao editar:

- **Títulos principais** são quebrados linha a linha de propósito, porque cada
  linha tem a sua própria máscara de animação. Mantenha o padrão ao mexer:

  ```html
  <h2 class="t-display">
    <span class="mask-line"><span>Primeira linha</span></span>
    <span class="mask-line"><span>Segunda linha</span></span>
  </h2>
  ```

  Para acrescentar uma linha, acrescente outro `<span class="mask-line">`.

- **FAQ**: cada item liga o botão ao painel por `id`. Ao duplicar um item,
  troque os três valores juntos (`id="faq-b7"`, `aria-controls="faq-p7"`,
  `id="faq-p7"` e `aria-labelledby="faq-b7"`), senão o acordeão abre o painel
  errado e o leitor de tela anuncia errado.

## WhatsApp: número e mensagens

Todos os CTAs abrem uma conversa no **+55 47 99152-1735** já com a mensagem
escrita, variando conforme onde a pessoa clicou:

| CTA                                    | Mensagem que chega                                                          |
| -------------------------------------- | --------------------------------------------------------------------------- |
| "Fale conosco" (header e menu)         | …gostaria de falar com o time.                                              |
| "Quero um diagnóstico" (seções 1, 2, 5)| …quero solicitar o diagnóstico gratuito da minha carteira.                  |
| "Tenho mais dúvidas" e o link do FAQ   | …fiquei com uma dúvida sobre como vocês trabalham.                          |
| "Analisar carteira" e o link do CTA    | …gostaria de enviar minha carteira para análise.                            |

Toda mensagem começa com "Olá! Vim pelo site da Rare Cobranças e ", o que
identifica a origem do lead já na primeira linha da conversa.

Os links estão escritos direto no `index.html` (e não montados por JavaScript),
para funcionarem mesmo com script desligado. O formato é:

```
https://wa.me/5547991521735?text=<mensagem codificada para URL>
```

Para trocar número ou texto, gere os links novos e substitua no `index.html`:

```bash
python3 - <<'PY'
from urllib.parse import quote
telefone = "5547991521735"          # país + DDD + número, só dígitos
mensagem = "Olá! Vim pelo site da Rare Cobranças e ..."
print(f"https://wa.me/{telefone}?text={quote(mensagem)}")
PY
```

A mensagem **precisa** ir codificada: acento e espaço crus quebram o link em
parte dos clientes de WhatsApp.

Dois links continuam sendo âncoras internas, de propósito: "Ver como
trabalhamos" (rola até o Método) e o item "Contato" do menu (rola até o CTA
final). Nenhum dos dois é um botão de conversão.

## Onde trocar as imagens

As fotos ficam em `src/img/`. Cada uma é servida em duas larguras via `srcset`,
para não mandar um arquivo de 2 MB para um espaço de 600 px:

| Seção        | Arquivos usados                                            |
| ------------ | ---------------------------------------------------------- |
| 2 O problema | `portrait-problem-640.webp` · `portrait-problem-1280.webp`  |
| 3 A virada   | `portrait-turn-520.webp` · `portrait-turn-1040.webp`        |

Os originais (`fdanjeifnsjkfanlkndoaaf3.webp` e
`slkjnvliurnvksjneeffjrdd-perdonsl.webp`) continuam na pasta como fonte.

Para trocar uma foto, gere as duas variantes a partir da nova imagem:

```bash
python3 - <<'PY'
from PIL import Image
im = Image.open("src/img/NOVA-FOTO.webp").convert("RGB")
for w in (640, 1280):                      # (520, 1040) para a seção 3
    h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(
        f"src/img/portrait-problem-{w}.webp", "WEBP", quality=82, method=6)
PY
```

Depois atualize, no `index.html`, o `width`/`height` do `<img>` para as
dimensões reais do arquivo 1x — eles reservam o espaço e evitam que a página
"pule" enquanto carrega — e reescreva o `alt`.

O preloader espera essas duas imagens 1x (lista `assets` em `js/main.js`); se
os nomes mudarem, atualize lá também.

## Onde mexer no visual

Quase tudo mora em `css/tokens.css`:

- `--blue`, `--ink`, `--bone` — as cores da marca. Vieram dos próprios SVGs do
  logo e da referência, não são aproximações.
- `--size-display`, `--size-display-dark`, `--size-eyebrow` — a escala
  tipográfica. Os `clamp()` foram calibrados para bater com a referência num
  viewport de 1440 px.
- `--shell` (1200 px), `--measure` (490 px) — largura do container e da coluna
  estreita de texto centralizado.
- `--ease-apple`, `--ease-out-soft` — as curvas de animação. Estão duplicadas em
  `js/main.js` via `CustomEase`; se mudar uma, mude a outra.

### Duas famílias, uma regra

Serifada (PT Serif) nos títulos de fundo claro; sans bold (Inter) nos títulos de
fundo escuro. É o que dá à página dois registros de voz — reflexivo e assertivo.
As classes são `.t-display` e `.t-display-dark`; não misture.

## A seção Método (a interação principal)

No desktop a seção prende a tela e as quatro etapas passam conforme o scroll. A
distância do pin é a constante `PIN_DISTANCE` em `js/main.js`:

```js
var PIN_DISTANCE = '+=400%';
```

400% dá a cada etapa uma tela inteira de rolagem. Se as etapas parecerem
apressadas, aumente; o erro comum aqui é a sequência passar rápido demais.

No mobile o pin é desligado e as quatro etapas viram uma lista empilhada.

## Acessibilidade

- Sob `prefers-reduced-motion: reduce` a página não pina, não faz parallax, não
  usa máscaras e não usa scroll suave — todo o conteúdo aparece estático.
- Se o JavaScript não carregar, nada some: os estilos que escondem elementos
  dependem da classe `js-ready`, aplicada por um script inline no `<head>`.
- A tagline gigante do rodapé é decorativa (contraste baixíssimo de propósito) e
  por isso está marcada como `aria-hidden="true"`.

## Pendências de conteúdo

Três pontos que vieram da referência e que valem confirmação antes de publicar:

1. **Domínio do e-mail.** O rodapé usa `contato@rarecobranca.com.br`
   (singular), enquanto a marca é Cobranças (plural). Confirme qual domínio foi
   registrado — divergência aqui gera e-mail perdido.
2. **Ouvidoria e encarregado de dados (DPO).** Não constam no rodapé. Para uma
   empresa cujo posicionamento é conduta e conformidade, a ausência enfraquece
   justamente o argumento central.
3. **Página do devedor ("Porta 2").** Não existe na referência. Um link discreto
   no rodapé já resolveria.

O copyright foi corrigido de "Rare Tech" para a razão social correta, Rare
Cobranças.
