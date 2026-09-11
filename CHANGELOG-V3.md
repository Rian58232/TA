# Tatu Piscinas — V3

## O que mudou

- Reposicionamento visual da marca para apresentar a Tatu como solução de **área de lazer completa**, mantendo piscinas como protagonista e incorporando pisos e revestimentos.
- Hero reconstruído com fotografia real em alta resolução no desktop, vídeo vertical em painel cinematográfico e efeito aquático discreto em Canvas 2D.
- Removido o uso do vídeo vertical como background fullscreen de desktop para evitar perda de nitidez.
- Corrigida a lógica de movimento do hero: não existe mais uso da propriedade inválida `style.marginTransform`.
- Nova direção de arte com alternância entre oceano profundo, aqua, branco mineral, areia e pedra.
- CSS totalmente reorganizado e legível, separado por áreas do site.
- JavaScript refatorado em funções menores, com um loop principal para movimentos contínuos e efeitos de scroll.

## Novas seções

- **Muito além da piscina**: storytelling de pisos e revestimentos com imagens reais enviadas pelo cliente.
- **O espaço completo**: composição editorial explicando a integração entre piscina, piso e revestimento.
- **Projeto em destaque**: cena fullscreen com fotografia real e parallax suave.
- **Portfólio V3**: filtros para Piscinas, Pisos & Revestimentos e Bastidores.
- **Configurador de orçamento**: monta uma mensagem personalizada e abre diretamente no WhatsApp, sem backend.
- Novo fechamento comercial com CTA fullscreen.

## Interações e animações

- Loader curto, exibido apenas uma vez por sessão.
- Header transparente que recebe efeito de vidro após o scroll.
- Indicador de navegação por seção.
- Efeito de água em Canvas 2D de baixa opacidade, pausado fora da viewport.
- Parallax leve no hero, projeto em destaque, colagens e seção Sobre.
- Botões magnéticos em desktop.
- Cursor contextual sobre imagens clicáveis.
- Máscaras e transições de imagem na seção de materiais.
- Portfólio com lightbox fullscreen, teclado, navegação anterior/próxima e swipe em touch.
- CTA flutuante de WhatsApp que expande depois que o usuário sai do hero.

## Performance

- Todas as fotografias possuem versão WebP e JPEG de fallback.
- Hero/LCP pré-carregado e sem lazy loading.
- Demais imagens usam `loading="lazy"` e `decoding="async"`.
- Vídeo recomprimido de aproximadamente 5,9 MB para aproximadamente 2,5 MB, sem áudio, com `faststart` e 24 fps.
- Vídeos usam `preload="none"`, poster e são pausados fora da viewport.
- `Save-Data` impede o autoplay e desliga o efeito contínuo de água.
- `prefers-reduced-motion` reduz animações e desliga efeitos contínuos.

## Conversão e SEO

- WhatsApp confirmado no projeto: **556796078271**.
- CTAs receberam atributos `data-cta` para futura integração com analytics.
- Title, meta description, Open Graph e Schema.org LocalBusiness atualizados.
- Não foi criado canonical porque a URL final do GitHub Pages não foi definida dentro do projeto.
- Nenhum formulário envia dados para servidor; o configurador apenas monta uma URL do WhatsApp.

## Informações que ainda dependem de confirmação

- As imagens de cascos/estruturas aparecem somente como **Bastidores**. O site não afirma "fabricação própria" porque isso ainda não foi confirmado explicitamente.
- Os novos revestimentos foram descritos com nomenclaturas comerciais genéricas e seguras. O site não afirma materiais específicos como pedra natural, porcelanato, cimentício ou concreto sem confirmação.
- Não foram inventados avaliações, quantidade de clientes, número de projetos, garantias, preços, parcelamento, certificações, horário, endereço completo ou CNPJ.
