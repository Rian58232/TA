(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const mobileLite = window.matchMedia('(max-width: 980px)').matches || window.matchMedia('(pointer: coarse)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    visible: !document.hidden,
    scrollY: window.scrollY,
    scrollDirty: true,
    pointerX: window.innerWidth / 2,
    pointerY: window.innerHeight / 2,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    heroX: 0,
    heroY: 0,
    heroTargetX: 0,
    heroTargetY: 0,
    waterVisible: true,
    waterLastFrame: 0,
    waterTime: 0
  };

  function initLoader() {
    const loader = $('#loader');
    if (!loader) {
      document.body.classList.add('is-ready');
      return;
    }

    const alreadySeen = sessionStorage.getItem('tatu-v31-loader-seen') === '1';
    const finish = () => {
      loader.classList.add('is-done');
      document.body.classList.add('is-ready');
      sessionStorage.setItem('tatu-v31-loader-seen', '1');
      window.setTimeout(() => loader.remove(), 700);
    };

    if (alreadySeen || reducedMotion || mobileLite) {
      window.setTimeout(finish, mobileLite ? 24 : 90);
      return;
    }

    const start = performance.now();
    const minVisible = 760;
    const maxVisible = 1150;

    const ready = () => {
      const elapsed = performance.now() - start;
      window.setTimeout(finish, Math.max(0, minVisible - elapsed));
    };

    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready, { once: true });

    window.setTimeout(finish, maxVisible);
  }

  function initHeader() {
    const header = $('#siteHeader');
    if (!header) return;

    const syncHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 42);
    };

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  function initMobileNav() {
    const button = $('#menuToggle');
    const nav = $('#mobileNav');
    if (!button || !nav) return;

    const close = () => {
      nav.classList.remove('is-open');
      button.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Abrir menu');
      document.body.classList.remove('menu-open');
    };

    const open = () => {
      nav.classList.add('is-open');
      button.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      button.setAttribute('aria-label', 'Fechar menu');
      document.body.classList.add('menu-open');
    };

    button.addEventListener('click', () => nav.classList.contains('is-open') ? close() : open());
    $$('a', nav).forEach(link => link.addEventListener('click', close));
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100) close();
    }, { passive: true });
  }

  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(item => item.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const parent = entry.target.parentElement;
        const siblings = parent ? $$('.reveal', parent) : [];
        const index = Math.max(0, siblings.indexOf(entry.target));
        entry.target.style.transitionDelay = `${Math.min(index * 55, 220)}ms`;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(item => observer.observe(item));
  }

  function initActiveNav() {
    const links = $$('[data-nav]');
    const sections = $$('[data-section]');
    if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;

    const setActive = id => {
      links.forEach(link => link.classList.toggle('is-active', link.dataset.nav === id));
    };

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.dataset.section);
    }, { rootMargin: '-35% 0px -52% 0px', threshold: [0, .15, .35, .65] });

    sections.forEach(section => observer.observe(section));
  }

  function initMagneticButtons() {
    if (!finePointer || reducedMotion) return;

    $$('.magnetic').forEach(button => {
      button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .11;
        const y = (event.clientY - rect.top - rect.height / 2) * .11;
        button.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
      button.addEventListener('pointerleave', () => {
        button.style.transform = '';
      });
    });
  }

  function initCursorLens() {
    if (!finePointer || reducedMotion) return;
    const lens = $('#cursorLens');
    if (!lens) return;

    window.addEventListener('pointermove', event => {
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
    }, { passive: true });

    $$('.interactive-image, [data-lightbox]').forEach(element => {
      element.addEventListener('pointerenter', () => {
        lens.classList.add('is-image');
        const label = element.dataset.pointerLabel || 'VER';
        const text = $('span', lens);
        if (text) text.textContent = label;
      });
      element.addEventListener('pointerleave', () => lens.classList.remove('is-image'));
    });
  }

  function initHeroMotion() {
    if (!finePointer || reducedMotion) return;
    const hero = $('.hero');
    if (!hero) return;

    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      state.heroTargetX = ((event.clientX - rect.left) / rect.width - .5) * 2;
      state.heroTargetY = ((event.clientY - rect.top) / rect.height - .5) * 2;
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      state.heroTargetX = 0;
      state.heroTargetY = 0;
    });
  }

  function initWaterFX() {
    const canvas = $('#waterCanvas');
    if (!canvas || reducedMotion || saveData || mobileLite) return null;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return null;

    const model = { canvas, context, width: 0, height: 0, dpr: 1 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      model.dpr = Math.min(window.devicePixelRatio || 1, 1.35);
      model.width = Math.max(1, rect.width);
      model.height = Math.max(1, rect.height);
      canvas.width = Math.round(model.width * model.dpr);
      canvas.height = Math.round(model.height * model.dpr);
      context.setTransform(model.dpr, 0, 0, model.dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        state.waterVisible = Boolean(entries[0] && entries[0].isIntersecting);
      }, { threshold: 0.01 });
      observer.observe(canvas);
    }

    return model;
  }

  function drawWater(model, timestamp) {
    if (!model || !state.waterVisible || !state.visible) return;
    if (timestamp - state.waterLastFrame < 42) return;
    state.waterLastFrame = timestamp;
    state.waterTime += 0.022;

    const { context: ctx, width: w, height: h } = model;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'blur(6px)';

    const cursorBiasX = finePointer ? (state.pointerX / Math.max(1, window.innerWidth) - .5) * 22 : 0;
    const cursorBiasY = finePointer ? (state.pointerY / Math.max(1, window.innerHeight) - .5) * 10 : 0;

    for (let layer = 0; layer < 7; layer += 1) {
      const alpha = .025 + layer * .003;
      const vertical = h * (.1 + layer * .12) + cursorBiasY * (layer / 7);
      const amplitude = 18 + layer * 3;
      const wavelength = .0085 + layer * .001;

      ctx.beginPath();
      for (let x = -120; x <= w + 120; x += 24) {
        const waveA = Math.sin((x + cursorBiasX) * wavelength + state.waterTime * (1.25 + layer * .06)) * amplitude;
        const waveB = Math.sin(x * (wavelength * .48) - state.waterTime * .8 + layer * 1.23) * (amplitude * .72);
        const y = vertical + waveA + waveB;
        if (x === -120) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(126, 245, 255, ${alpha})`;
      ctx.lineWidth = 5 + layer * .75;
      ctx.stroke();
    }

    for (let i = 0; i < 9; i += 1) {
      const x = ((i * 173 + state.waterTime * 28) % (w + 240)) - 120;
      const y = h * (.16 + ((i * .17) % .66));
      const rx = 70 + (i % 3) * 22;
      const ry = 18 + (i % 4) * 5;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, Math.sin(state.waterTime + i) * .22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(145,248,255,.032)';
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function initMaterialStory() {
    const chapters = $$('.material-chapter');
    const visuals = $$('.material-visual');
    const stage = $('.materials-stage-frame');
    const stageIndex = $('#materialStageIndex');
    const stageName = $('#materialStageName');
    if (!chapters.length || !visuals.length) return;

    const labels = {
      piso: ['01', 'Pisos externos'],
      cinza: ['02', 'Revestimentos'],
      pedra: ['03', 'Revestimentos decorativos'],
      '3d': ['04', 'Revestimentos em relevo'],
      bege: ['05', 'Acabamentos']
    };

    const activate = key => {
      chapters.forEach(chapter => chapter.classList.toggle('is-active', chapter.dataset.material === key));
      visuals.forEach(visual => visual.classList.toggle('is-active', visual.dataset.materialVisual === key));
      if (labels[key]) {
        if (stageIndex) stageIndex.textContent = labels[key][0];
        if (stageName) stageName.textContent = labels[key][1];
      }
    };

    if ('IntersectionObserver' in window && window.innerWidth > 820) {
      const observer = new IntersectionObserver(entries => {
        const winner = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (winner) activate(winner.target.dataset.material);
      }, { rootMargin: '-32% 0px -33% 0px', threshold: [0, .2, .5, .75] });
      chapters.forEach(chapter => observer.observe(chapter));
    }

    if (stage && finePointer && !reducedMotion) {
      stage.addEventListener('pointermove', event => {
        const rect = stage.getBoundingClientRect();
        stage.style.setProperty('--mouse-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        stage.style.setProperty('--mouse-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }, { passive: true });
    }
  }

  function initPortfolio() {
    const filters = $$('.filter-button');
    const cards = $$('.project-card[data-category]');
    if (!filters.length || !cards.length) return;

    filters.forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        filters.forEach(item => item.classList.toggle('is-active', item === button));
        cards.forEach(card => {
          const visible = filter === 'all' || card.dataset.category === filter;
          card.classList.toggle('is-hidden', !visible);
        });
      });
    });

    initLightbox(cards);
  }

  function initLightbox(allCards) {
    const lightbox = $('#lightbox');
    const image = $('#lightboxImage');
    const title = $('#lightboxTitle');
    const count = $('#lightboxCount');
    const closeButton = $('#lightboxClose');
    const prevButton = $('#lightboxPrev');
    const nextButton = $('#lightboxNext');
    if (!lightbox || !image || !allCards.length) return;

    let visibleCards = allCards.filter(card => !card.classList.contains('is-hidden'));
    let index = 0;
    let lastFocus = null;
    let touchStartX = 0;

    const refreshVisible = () => {
      visibleCards = allCards.filter(card => !card.classList.contains('is-hidden'));
    };

    const render = newIndex => {
      refreshVisible();
      if (!visibleCards.length) return;
      index = (newIndex + visibleCards.length) % visibleCards.length;
      const card = visibleCards[index];
      const cardImage = $('img', card);
      image.src = cardImage ? (cardImage.currentSrc || cardImage.src) : '';
      image.alt = cardImage ? cardImage.alt : '';
      if (title) title.textContent = card.dataset.title || image.alt || 'Projeto da Tatu Piscinas';
      if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(visibleCards.length).padStart(2, '0')}`;
    };

    const open = card => {
      refreshVisible();
      index = Math.max(0, visibleCards.indexOf(card));
      lastFocus = document.activeElement;
      render(index);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      closeButton?.focus();
    };

    const close = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      window.setTimeout(() => {
        image.src = '';
        if (lastFocus instanceof HTMLElement) lastFocus.focus();
      }, 260);
    };

    allCards.forEach(card => card.addEventListener('click', () => open(card)));
    closeButton?.addEventListener('click', close);
    prevButton?.addEventListener('click', () => render(index - 1));
    nextButton?.addEventListener('click', () => render(index + 1));

    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) close();
    });

    lightbox.addEventListener('touchstart', event => {
      touchStartX = event.changedTouches[0]?.clientX || 0;
    }, { passive: true });

    lightbox.addEventListener('touchend', event => {
      const endX = event.changedTouches[0]?.clientX || 0;
      const delta = endX - touchStartX;
      if (Math.abs(delta) > 50) render(index + (delta < 0 ? 1 : -1));
    }, { passive: true });

    document.addEventListener('keydown', event => {
      if (!lightbox.classList.contains('is-open')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') render(index - 1);
      if (event.key === 'ArrowRight') render(index + 1);
      if (event.key === 'Tab') {
        const focusables = [closeButton, prevButton, nextButton].filter(Boolean);
        if (!focusables.length) return;
        const current = focusables.indexOf(document.activeElement);
        if (event.shiftKey && current <= 0) {
          event.preventDefault();
          focusables[focusables.length - 1].focus();
        } else if (!event.shiftKey && current === focusables.length - 1) {
          event.preventDefault();
          focusables[0].focus();
        }
      }
    });
  }

  function initConfigurator() {
    const form = $('#projectBuilder');
    const poolFieldset = $('#poolTypeFieldset');
    if (!form || !poolFieldset) return;

    const interestInputs = $$('input[name="interest"]', form);
    const poolInputs = $$('input[name="poolType"]', form);

    const updatePoolField = () => {
      const interest = $('input[name="interest"]:checked', form)?.value || '';
      const needsPool = interest === 'Piscina' || interest.includes('Piscina +');
      poolFieldset.hidden = !needsPool;
      poolInputs.forEach(input => {
        input.required = needsPool;
        if (!needsPool) input.checked = false;
      });
    };

    interestInputs.forEach(input => input.addEventListener('change', updatePoolField));

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const interest = $('input[name="interest"]:checked', form)?.value || 'Não informado';
      const poolType = $('input[name="poolType"]:checked', form)?.value || '';
      const city = $('#cityInput')?.value.trim() || '';
      const note = $('#noteInput')?.value.trim() || '';

      const lines = [
        'Olá! Vim pelo site da Tatu Piscinas e gostaria de solicitar um orçamento.',
        '',
        `Serviço de interesse: ${interest}`
      ];

      if (poolType) lines.push(`Tipo de piscina: ${poolType}`);
      if (city) lines.push(`Cidade: ${city}`);
      if (note) lines.push('', `Observação: ${note}`);

      const url = `https://wa.me/556796078271?text=${encodeURIComponent(lines.join('\n'))}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }

  function initVideos() {
    const configs = [
      { video: $('#heroVideo'), button: $('#filmToggle'), wrapper: $('#heroFilm') },
      { video: $('#showcaseVideo'), button: $('#showcasePlay'), wrapper: $('.video-device') }
    ].filter(item => item.video && item.button && item.wrapper);

    configs.forEach(({ video, button, wrapper }, index) => {
      let userPaused = false;

      const updateState = () => {
        wrapper.classList.toggle('is-playing', !video.paused);
        button.setAttribute('aria-label', video.paused ? 'Reproduzir vídeo' : 'Pausar vídeo');
      };

      const play = async () => {
        try {
          if (video.preload === 'none') video.preload = 'metadata';
          await video.play();
          updateState();
        } catch (_) {
          updateState();
        }
      };

      const pause = () => {
        video.pause();
        updateState();
      };

      button.addEventListener('click', () => {
        if (video.paused) {
          userPaused = false;
          play();
        } else {
          userPaused = true;
          pause();
        }
      });

      video.addEventListener('play', updateState);
      video.addEventListener('pause', updateState);
      video.addEventListener('click', () => button.click());

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          const visible = entries[0]?.isIntersecting;
          if (!visible) {
            pause();
          } else if (!saveData && !reducedMotion && !mobileLite && !userPaused && index === 0) {
            play();
          }
        }, { threshold: .35 });
        observer.observe(video);
      }
    });
  }

  function initFloatingWhatsApp() {
    const floating = $('#floatingWa');
    const hero = $('.hero');
    if (!floating || !hero || !('IntersectionObserver' in window)) return;

    let expandedOnce = false;
    let collapseTimer = 0;

    const observer = new IntersectionObserver(entries => {
      const heroVisible = entries[0]?.isIntersecting;
      floating.classList.toggle('is-visible', !heroVisible);

      if (!heroVisible && !expandedOnce) {
        expandedOnce = true;
        window.setTimeout(() => {
          floating.classList.add('is-expanded');
          collapseTimer = window.setTimeout(() => floating.classList.remove('is-expanded'), 3600);
        }, 750);
      }
    }, { threshold: .08 });

    observer.observe(hero);
    floating.addEventListener('mouseenter', () => {
      window.clearTimeout(collapseTimer);
      floating.classList.add('is-expanded');
    });
    floating.addEventListener('mouseleave', () => {
      collapseTimer = window.setTimeout(() => floating.classList.remove('is-expanded'), 900);
    });
  }

  function initPointerSpotlights() {
    if (!finePointer || reducedMotion) return;
    $$('.pool-tile, .project-card').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
        element.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }, { passive: true });
    });
  }

  function initCaseMotion() {
    if (!finePointer || reducedMotion) return;
    $$('.project-story-media').forEach(media => {
      const detail = $('.story-detail', media);
      if (!detail) return;
      media.addEventListener('pointermove', event => {
        const rect = media.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
        detail.style.transform = `translate3d(${x * 7}px, ${y * 5}px, 0)`;
      }, { passive: true });
      media.addEventListener('pointerleave', () => {
        detail.style.transform = '';
      });
    });
  }

  function initScrollState() {
    window.addEventListener('scroll', () => {
      state.scrollY = window.scrollY;
      state.scrollDirty = true;
    }, { passive: true });

    window.addEventListener('resize', () => {
      state.scrollDirty = true;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      state.visible = !document.hidden;
    });
  }

  function updateScrollEffects() {
    if (!state.scrollDirty || reducedMotion) return;
    state.scrollDirty = false;

    const spotlight = $('.project-spotlight');
    const spotlightImage = $('#spotlightImage');
    if (spotlight && spotlightImage) {
      const rect = spotlight.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      spotlightImage.style.transform = `scale(${1.01 + progress * .06}) translate3d(0, ${progress * -10}px, 0)`;
    }

    const process = $('#processTrack');
    const processLine = $('#processLine');
    if (process) {
      const rect = process.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight * .72 - rect.top) / Math.max(1, rect.height * .78)));
      if (processLine && window.innerWidth > 820) processLine.style.width = `${progress * 100}%`;

      const steps = $$('[data-process-step]', process);
      const activeIndex = Math.min(steps.length - 1, Math.max(0, Math.floor(progress * steps.length)));
      steps.forEach((step, index) => step.classList.toggle('is-active', index <= activeIndex && progress > .02));
    }

    const transition = $('#waterToStone');
    const stoneLayer = $('.stone-transition-layer', transition || document);
    const transitionWave = $('.transition-wave', transition || document);
    if (transition && stoneLayer) {
      const rect = transition.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      stoneLayer.style.transform = `translateY(${52 - progress * 19}%) scale(${1.02 + progress * .025})`;
      if (transitionWave) transitionWave.style.transform = `translate3d(0, ${10 - progress * 10}px, 0)`;
    }

    const collage = $('[data-parallax-collage]');
    if (collage && window.innerWidth > 820) {
      const rect = collage.getBoundingClientRect();
      const centerDelta = (window.innerHeight * .5 - (rect.top + rect.height * .5)) / window.innerHeight;
      const a = $('.collage-small-a', collage);
      const b = $('.collage-small-b', collage);
      if (a) a.style.transform = `translate3d(0, ${centerDelta * -22}px, 0)`;
      if (b) b.style.transform = `translate3d(0, ${centerDelta * 18}px, 0)`;
    }

    const about = $('[data-about-parallax]');
    if (about && window.innerWidth > 820) {
      const rect = about.getBoundingClientRect();
      const centerDelta = (window.innerHeight * .5 - (rect.top + rect.height * .5)) / window.innerHeight;
      const floating = $('.about-photo-float', about);
      const stamp = $('.about-stamp', about);
      if (floating) floating.style.transform = `translate3d(0, ${centerDelta * -26}px, 0)`;
      if (stamp) stamp.style.transform = `translate3d(0, ${centerDelta * 16}px, 0)`;
    }
  }

  function createMasterLoop(waterModel) {
    const heroBg = $('.hero-bg-image');
    const heroFilm = $('.hero-film');
    const cursor = $('#cursorLens');

    // Phones do not need a permanent animation loop. Schedule only when scroll/resize changes.
    if (mobileLite) {
      let scheduled = false;
      const runMobileFrame = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (state.visible) updateScrollEffects();
        });
      };
      window.addEventListener('scroll', runMobileFrame, { passive: true });
      window.addEventListener('resize', runMobileFrame, { passive: true });
      runMobileFrame();
      return;
    }

    const frame = timestamp => {
      if (state.visible) {
        if (finePointer && !reducedMotion) {
          state.cursorX += (state.pointerX - state.cursorX) * .2;
          state.cursorY += (state.pointerY - state.cursorY) * .2;
          if (cursor) cursor.style.transform = `translate3d(${state.cursorX - cursor.offsetWidth / 2}px, ${state.cursorY - cursor.offsetHeight / 2}px, 0)`;

          state.heroX += (state.heroTargetX - state.heroX) * .055;
          state.heroY += (state.heroTargetY - state.heroY) * .055;
          if (heroBg) heroBg.style.transform = `scale(1.075) translate3d(${state.heroX * -7}px, ${state.heroY * -5}px, 0)`;
          if (heroFilm) heroFilm.style.transform = `translate3d(${state.heroX * 8}px, ${state.heroY * 5}px, 0)`;
        }

        updateScrollEffects();
        drawWater(waterModel, timestamp);
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }


  function initSpatial3D() {
    const viewport = $('#spatialViewport');
    const scene = $('#spatialScene');
    if (!viewport || !scene || reducedMotion || mobileLite) return;

    if (finePointer) {
      let leaveTimer = 0;

      const reset = () => {
        viewport.classList.remove('is-moving');
        viewport.style.setProperty('--scene-rx', '5deg');
        viewport.style.setProperty('--scene-ry', '-7deg');
        viewport.style.setProperty('--scene-x', '0px');
        viewport.style.setProperty('--scene-y', '0px');
        const water = $('.spatial-water-glass', viewport);
        if (water) {
          water.style.setProperty('--water-x', '62%');
          water.style.setProperty('--water-y', '36%');
        }
      };

      viewport.addEventListener('pointermove', event => {
        window.clearTimeout(leaveTimer);
        const rect = viewport.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const x = (nx - .5) * 2;
        const y = (ny - .5) * 2;

        viewport.classList.add('is-moving');
        viewport.style.setProperty('--scene-rx', `${5 - y * 7}deg`);
        viewport.style.setProperty('--scene-ry', `${-7 + x * 10}deg`);
        viewport.style.setProperty('--scene-x', `${x * 10}px`);
        viewport.style.setProperty('--scene-y', `${y * 7}px`);

        const water = $('.spatial-water-glass', viewport);
        if (water) {
          water.style.setProperty('--water-x', `${nx * 100}%`);
          water.style.setProperty('--water-y', `${ny * 100}%`);
        }
      }, { passive: true });

      viewport.addEventListener('pointerleave', () => {
        leaveTimer = window.setTimeout(reset, 40);
      });
    }
  }

  function initDepthTilt() {
    if (!finePointer || reducedMotion) return;

    const bind = (element, maxX, maxY, className = 'is-depth-active') => {
      if (!element) return;
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width - .5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - .5) * 2;
        element.classList.add(className);
        element.style.transform = `rotateX(${ny * -maxX}deg) rotateY(${nx * maxY}deg) translateZ(0)`;
      }, { passive: true });
      element.addEventListener('pointerleave', () => {
        element.classList.remove(className);
        element.style.transform = '';
      });
    };

    $$('.pool-tile').forEach(tile => bind(tile, 1.8, 2.4));

    const materialStage = $('.materials-stage-frame');
    if (materialStage) {
      materialStage.addEventListener('pointermove', event => {
        const rect = materialStage.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width - .5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - .5) * 2;
        materialStage.classList.add('is-depth-active');
        materialStage.style.setProperty('--mat-rx', `${ny * -1.8}deg`);
        materialStage.style.setProperty('--mat-ry', `${nx * 2.2}deg`);
      }, { passive: true });
      materialStage.addEventListener('pointerleave', () => {
        materialStage.classList.remove('is-depth-active');
        materialStage.style.setProperty('--mat-rx', '0deg');
        materialStage.style.setProperty('--mat-ry', '0deg');
      });
    }
  }

  function initProjectDeck3D() {
    const deck = $('#projectDeck');
    const cards = deck ? $$('[data-deck-card]', deck) : [];
    const prev = $('#deckPrev');
    const next = $('#deckNext');
    const counter = $('#deckCounter');
    if (!deck || !cards.length) return;

    let active = 0;
    let wheelLock = false;
    let startX = 0;
    let deltaX = 0;

    const render = () => {
      cards.forEach((card, index) => {
        let offset = index - active;
        const half = Math.ceil(cards.length / 2);
        if (offset > half) offset -= cards.length;
        if (offset < -half) offset += cards.length;
        card.style.setProperty('--deck-offset', String(offset));
        card.classList.toggle('is-active', index === active);
        card.setAttribute('aria-hidden', index === active ? 'false' : 'true');
      });
      if (counter) counter.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    };

    const setActive = index => {
      active = (index + cards.length) % cards.length;
      render();
    };

    prev?.addEventListener('click', () => setActive(active - 1));
    next?.addEventListener('click', () => setActive(active + 1));

    cards.forEach((card, index) => card.addEventListener('click', () => setActive(index)));

    if (finePointer && !reducedMotion) {
      deck.addEventListener('wheel', event => {
        if (Math.abs(event.deltaY) < 12 || wheelLock) return;
        wheelLock = true;
        setActive(active + (event.deltaY > 0 ? 1 : -1));
        window.setTimeout(() => { wheelLock = false; }, 420);
      }, { passive: true });
    }

    deck.addEventListener('pointerdown', event => {
      startX = event.clientX;
      deltaX = 0;
      deck.setPointerCapture?.(event.pointerId);
    });
    deck.addEventListener('pointermove', event => {
      if (!startX) return;
      deltaX = event.clientX - startX;
    }, { passive: true });
    deck.addEventListener('pointerup', event => {
      if (Math.abs(deltaX) > 55) setActive(active + (deltaX < 0 ? 1 : -1));
      startX = 0; deltaX = 0;
      deck.releasePointerCapture?.(event.pointerId);
    });

    render();
  }

  function initMaterialDepth() {
    const frame = $('.materials-stage-frame');
    if (!frame || !finePointer || reducedMotion) return;
    frame.addEventListener('pointermove', event => {
      const rect = frame.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width - .5) * 2;
      const ny = ((event.clientY - rect.top) / rect.height - .5) * 2;
      frame.style.setProperty('--material-light-x', `${(nx * .5 + .5) * 100}%`);
      frame.style.setProperty('--material-light-y', `${(ny * .5 + .5) * 100}%`);
      frame.style.setProperty('--material-depth-x', `${nx * 7}px`);
      frame.style.setProperty('--material-depth-y', `${ny * 5}px`);
    }, { passive: true });
    frame.addEventListener('pointerleave', () => {
      frame.style.setProperty('--material-light-x', '50%');
      frame.style.setProperty('--material-light-y', '50%');
      frame.style.setProperty('--material-depth-x', '0px');
      frame.style.setProperty('--material-depth-y', '0px');
    });
  }

  function initDesktop3DModule() {
    // Three.js is intentionally not downloaded/parsing on phones. Desktop keeps the full 3D experience.
    if (mobileLite || reducedMotion || saveData || !finePointer || window.innerWidth < 1024) return;
    const load = () => import('./three-scenes.js?v=3.3.1').catch(error => {
      console.warn('Experiência 3D indisponível; usando o layout padrão.', error);
      document.documentElement.classList.add('no-webgl');
    });
    if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 1400 });
    else window.setTimeout(load, 650);
  }

  function initYear() {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  initLoader();
  initHeader();
  initMobileNav();
  initReveal();
  initActiveNav();
  initMagneticButtons();
  initCursorLens();
  initHeroMotion();
  const waterModel = initWaterFX();
  initMaterialStory();
  initPortfolio();
  initConfigurator();
  initVideos();
  initFloatingWhatsApp();
  initPointerSpotlights();
  initCaseMotion();
  initSpatial3D();
  initDepthTilt();
  initProjectDeck3D();
  initMaterialDepth();
  initScrollState();
  initDesktop3DModule();
  initYear();
  createMasterLoop(waterModel);
})();
