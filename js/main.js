(function () {
  'use strict';

  /* ---------------- Real viewport height (--vh100) ----------------
     Plain CSS 100vh doesn't track the true visible height on mobile browsers
     — it's measured against the largest possible viewport (address bar
     hidden), so content sized to it can run under the browser chrome when
     the bar is shown. window.innerHeight always reflects what's actually
     visible right now, so the workspace card (capped to "one screen tall")
     uses this instead. ---------------- */
  function setViewportHeightVar() {
    document.documentElement.style.setProperty('--vh100', window.innerHeight + 'px');
  }
  setViewportHeightVar();
  window.addEventListener('resize', setViewportHeightVar);
  window.addEventListener('orientationchange', setViewportHeightVar);

  /* ---------------- Page-wide A/B review switch ----------------
     Temporary side-by-side comparison aid — one fixed control toggles every
     .pv-block on the page together (hero, diagram flow, features, etc.),
     each pair marked data-pv="a"/"b". Not part of either design; remove this
     block (and #pvSwitch in the HTML) once a version is picked. */
  var pvSwitch = document.getElementById('pvSwitch');
  document.body.setAttribute('data-pv-mode', 'a'); // default, matches the hero__variant--a shown by default
  if (pvSwitch) {
    var pvBlocks = Array.prototype.slice.call(document.querySelectorAll('.pv-block'));
    pvSwitch.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-pv-switch]');
      if (!btn) return;
      var version = btn.getAttribute('data-pv-switch');
      document.body.setAttribute('data-pv-mode', version); // lets sections without a duplicated A/B pair (like the workspace demo) still branch behavior off the global toggle
      pvSwitch.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      pvBlocks.forEach(function (block) {
        var isMatch = block.getAttribute('data-pv') === version;
        block.hidden = !isMatch;
        // Only the visible block's video (if any) should actually play —
        // keeps hidden ones from burning CPU/battery decoding off-screen.
        var video = block.querySelector('video');
        if (video) { if (isMatch) { video.play(); } else { video.pause(); } }
      });
    });
  }

  /* ---------------- GET API KEY buttons (A's dynamic dgStep2Btn + B's
     static one) -- both just open the API Console's key page. ---------------- */
  var API_KEY_URL = 'https://yce.makeupar.com/api-console/en/api-keys/';
  Array.prototype.slice.call(document.querySelectorAll('.step__key-btn')).forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.open(API_KEY_URL, '_blank', 'noopener,noreferrer');
    });
  });

  /* ---------------- Mobile nav toggle ---------------- */
  var burger = document.getElementById('burgerBtn');
  var mobilePanel = document.getElementById('mobilePanel');
  if (burger && mobilePanel) {
    burger.addEventListener('click', function () {
      var isOpen = mobilePanel.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(isOpen));
    });
    // Close mobile panel when a link inside it is clicked
    mobilePanel.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        mobilePanel.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- Method tabs (MCP / Agent Skill) ----------------
     Toggles which one is visually active AND, since the workspace demo's
     use cases are entirely different per method, which set of use-case tabs
     (and their content) the "One Prompt In, a Real Result Out" card shows. ---------------- */
  var methodTabs = document.getElementById('methodTabs');
  var methodTabsThumb = document.getElementById('methodTabsThumb');
  function moveMethodThumb(activeBtn) {
    if (!methodTabsThumb || !activeBtn) return;
    methodTabsThumb.style.left = activeBtn.offsetLeft + 'px';
    methodTabsThumb.style.width = activeBtn.offsetWidth + 'px';
  }
  if (methodTabs) {
    methodTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.method-tab');
      if (!btn) return;
      methodTabs.querySelectorAll('.method-tab').forEach(function (t) {
        t.classList.toggle('is-active', t === btn);
      });
      moveMethodThumb(btn);
      var method = btn.getAttribute('data-method');
      // Switching methods can resize both the connect-cards grid (3 cards/1
      // row vs 6/2 rows) AND the diagram section below it (step copy differs
      // in length), so everything after either one shifts. Rather than
      // guessing which element resizes and by how much, anchor on whatever
      // leaf element is actually at the top of the viewport right now: note
      // its position, re-render, then nudge scroll by exactly how far that
      // element moved. Sampled at viewport CENTER, not near the top — the
      // navbar (position:sticky) and the method-tabs-bar sitting right
      // below it (also sticky, pinned to the same spot while this whole
      // flow is on screen) both have a viewport-relative top that never
      // changes, which made this measure a permanent no-op when sampled up
      // there. The only remaining risk is the sampled point landing inside
      // the cards grid, whose innerHTML gets replaced — guarded via
      // document.contains.
      var anchor = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      var anchorTopBefore = anchor ? anchor.getBoundingClientRect().top : null;
      setWorkspaceMethod(method);
      setConnectMethod(method);
      if (anchor && document.contains(anchor)) {
        var anchorTopAfter = anchor.getBoundingClientRect().top;
        // html has scroll-behavior:smooth for real user-initiated scrolls —
        // scrollBy would inherit that here too, animating this correction
        // into a second, visible scroll motion instead of an invisible,
        // instant one. behavior:'instant' bypasses it for this one call.
        window.scrollBy({ top: anchorTopAfter - anchorTopBefore, left: 0, behavior: 'instant' });
      }
    });
    // Position it correctly on load (fonts affect tab width) and on resize —
    // without a transition on first paint, so it doesn't visibly slide in
    // from the top-left corner the instant the page loads.
    var placeThumbInstantly = function () {
      var active = methodTabs.querySelector('.method-tab.is-active') || methodTabs.querySelector('.method-tab');
      if (!methodTabsThumb || !active) return;
      methodTabsThumb.style.transition = 'none';
      moveMethodThumb(active);
      // Force layout so the transition-less position actually commits before
      // transitions are re-enabled for subsequent (real) tab clicks.
      void methodTabsThumb.offsetWidth;
      methodTabsThumb.style.transition = '';
    };
    placeThumbInstantly();
    window.addEventListener('resize', function () {
      clearTimeout(window.__methodThumbResizeT);
      window.__methodThumbResizeT = setTimeout(placeThumbInstantly, 150);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(placeThumbInstantly);
    }
  }

  /* ---------------- Workspace demo: data-driven use cases ----------------
     One data set per use case (MCP: Beauty brand/Skincare retail/Fashion
     e-commerce/Jewelry retail/Brand marketing/Creative agency; Agent Skill:
     Skin Analysis Expert/Facial Consultant/Beauty Advisor/Hair Advisor/Hair
     Diagnostics/Clothes Try-on Studio), per Figma node 16831:1828. Switching
     the method or the use-case tab re-renders every field in place — the
     reveal-animation DOM nodes themselves never change, only their content —
     and restarts the reveal so the new story plays from the top. ---------------- */
  var STATUS_ICONS = {
    'More MCP Clients...': 'assets/workspace/more_mcp_clients_icon.svg',
    'ChatGPT Codex': 'assets/hero/logo/codex-icon.svg',
    'n8n': 'assets/hero/logo/n8n-icon.svg',
    'VS Code Copilot': 'assets/hero/logo/github-copilot-icon.svg',
    'Claude': 'assets/hero/logo/claude.svg' // full wordmark (icon + text) — the label span is left empty for this one so the word "Claude" isn't duplicated
  };

  var MCP_TABS = ['Beauty brand', 'Skincare retail', 'Fashion e-commerce', 'Jewelry retail', 'Brand marketing', 'Creative agency'];
  var SKILL_TABS = ['Skin Analysis Expert', 'Facial Consultant', 'Beauty Advisor', 'Hair Advisor', 'Hair Diagnostics', 'Clothes Try-on Studio'];

  var USE_CASES = {
    'Beauty brand': {
      photos: ['assets/workspace/img-visual-asset-badge.png', 'assets/workspace/img-visual-asset-badge1.png'],
      prompt: 'Create a personalized lipstick preview for this shopper using our soft coral shade.',
      status: 'Claude',
      description: "I'll prepare a customer-facing virtual try-on while preserving the shopper's identity and the product shade.",
      toolBadge: 'Used AI Makeup Try-On',
      outcomeTitle: 'The personalized lipstick preview is ready for the beauty consultation flow.',
      bullets: ['Product shade matched to the supplied reference', 'Application limited to the lips', 'Original skin tone, facial features, and lighting preserved'],
      footerNote: "The output can now be returned inside the brand's shopping assistant or consultation experience.",
      result: 'assets/workspace/img-right-preview-workspace.png'
    },
    'Skincare retail': {
      photos: ['assets/workspace/usecases/skincare-retail-overlay.png'],
      prompt: 'Analyze this shopper selfie and return cosmetic concern scores for product discovery.',
      status: 'More MCP Clients...',
      description: "I'll generate structured cosmetic skin signals that a retail assistant can use to personalize product discovery.",
      toolBadge: 'Used AI Skin Analysis',
      outcomeTitle: 'The selfie is suitable for a cosmetic skincare discovery flow. The strongest visible focus areas are texture, pores, and dark circles.',
      bullets: ['Structured concern scores are available for ranking', 'Visual maps can be shown in the shopper experience', "The result can be passed to the retailer's own recommendation logic"],
      footerNote: 'This provides the analysis layer without prescribing medical treatment.',
      result: 'assets/workspace/usecases/skincare-retail-result.jpg'
    },
    'Fashion e-commerce': {
      photos: ['assets/workspace/usecases/fashion-ecommerce-overlay.png', 'assets/workspace/usecases/fashion-ecommerce-badge2-overlay.png'],
      prompt: 'Generate a shoppable try-on of this dress on our model photo.',
      status: 'VS Code Copilot',
      description: "I'll create a product-detail-page try-on that keeps the model recognizable and the garment faithful to the catalog image.",
      toolBadge: 'Used AI Clothes Try-On',
      outcomeTitle: 'The shoppable fashion preview is ready for the product page.',
      bullets: ['Garment color and pattern preserved', "Fit adapted to the model's original pose", 'Model identity and background retained'],
      footerNote: 'The generated asset can be displayed beside the original catalog photography.',
      result: 'assets/workspace/usecases/fashion-ecommerce-result.jpg'
    },
    'Jewelry retail': {
      photos: ['assets/workspace/usecases/jewelry-retail-overlay.png', 'assets/workspace/usecases/jewelry-retail-badge2-overlay.png'],
      prompt: "Place this watch on the shopper's wrist for an online product preview.",
      status: 'n8n',
      description: "I'll create an on-wrist product visualization with the scale and perspective matched to the shopper photo.",
      toolBadge: 'Used AI Watch Try-On',
      outcomeTitle: 'The on-wrist preview has been generated for the retail experience.',
      bullets: ['Watch face and product design preserved', 'Band aligned to the detected wrist', 'Perspective and lighting matched to the source photo'],
      footerNote: 'The result is ready to embed in a conversational shopping or product-detail flow.',
      result: 'assets/workspace/usecases/jewelry-retail-result.jpg'
    },
    'Brand marketing': {
      photos: ['assets/workspace/usecases/brand-marketing-badge.png'],
      prompt: 'Create three campaign directions from this product packshot.',
      status: 'ChatGPT Codex',
      description: "I'll turn the approved packshot into a consistent set of campaign concepts without losing the product identity.",
      toolBadge: 'Used AI Image Generator',
      outcomeTitle: 'Three campaign directions are ready for the marketing team.',
      bullets: ['Clean studio hero for web and commerce', 'Lifestyle editorial composition for campaign pages', 'Close-up social crop for paid media'],
      footerNote: 'Each direction keeps the supplied product visually consistent across the set.',
      result: 'assets/workspace/usecases/brand-marketing-result.jpg'
    },
    'Creative agency': {
      photos: ['assets/workspace/usecases/creative-agency-badge.png', 'assets/workspace/usecases/creative-agency-badge2.png'],
      prompt: 'Turn this approved key visual into a five-second social promo.',
      status: 'n8n',
      description: "I'll add controlled motion to the approved visual and prepare a short-form asset suitable for a client campaign.",
      toolBadge: 'Used AI Video Generator',
      outcomeTitle: 'The five-second social promo is ready for agency review.',
      bullets: ['Approved subject and composition preserved', 'Subtle push-in and lighting motion added', 'Duration optimized for short-form placement'],
      footerNote: "The resulting clip can move directly into the team's review and delivery workflow.",
      result: 'assets/workspace/usecases/creative-agency-result.mp4'
    },
    'Skin Analysis Expert': {
      photos: ['assets/workspace/usecases/skin-analysis-expert-overlay.png'],
      prompt: 'Analyze my skin and summarize the main visible concerns.',
      status: 'More MCP Clients...',
      description: "I'll run the Skin Analysis Expert workflow and turn the API scores into a readable cosmetic skin report.",
      toolBadge: 'Used Skin Analysis Expert',
      outcomeTitle: 'Your report highlights texture, pores, and dark circles as the most visible focus areas in this image.',
      bullets: ['Texture appears moderately uneven', 'Pores are most visible around the T-zone', 'Dark circles are visible beneath both eyes'],
      footerNote: 'This is a cosmetic image assessment, not a medical diagnosis. The full report and visual map are ready on the right.',
      result: 'assets/workspace/usecases/skin-analysis-expert-result.jpg'
    },
    'Facial Consultant': {
      photos: ['assets/workspace/usecases/facial-consultant-badge.png'],
      prompt: 'What are my color tones and visible facial attributes?',
      status: 'ChatGPT Codex',
      description: "I'll combine color-tone and facial-attribute analysis into a single appearance profile.",
      toolBadge: 'Used Facial Consultant',
      outcomeTitle: 'The analysis indicates a warm-leaning undertone and an oval face shape with balanced visible proportions.',
      bullets: ['Undertone: warm', 'Face shape: oval', 'Overall contrast: medium'],
      footerNote: 'The complete appearance profile is available on the right.',
      result: 'assets/workspace/usecases/facial-consultant-result.jpg'
    },
    'Beauty Advisor': {
      photos: ['assets/workspace/usecases/beauty-advisor-badge.png'],
      prompt: 'Recommend and preview a makeup look for me.',
      status: 'VS Code Copilot',
      description: "I'll analyze the visible facial attributes and color tones, recommend a coordinated look, and generate a preview.",
      toolBadge: 'Used Beauty Advisor',
      outcomeTitle: 'I selected a warm everyday look designed to complement the visible color tones and facial proportions.',
      bullets: ['Eyes: soft bronze definition', 'Cheeks: warm peach blush', 'Lips: muted coral satin'],
      footerNote: 'I also generated the complete look on the supplied photo; the preview is ready on the right.',
      result: 'assets/workspace/usecases/beauty-advisor-result.jpg'
    },
    'Hair Advisor': {
      photos: ['assets/workspace/usecases/hair-advisor-badge.png'],
      prompt: 'What hairstyle and color would suit me?',
      status: 'Claude',
      description: "I'll analyze the visible facial attributes and color tones, then generate a hairstyle and color preview.",
      toolBadge: 'Used Hair Color & Style Advisor',
      outcomeTitle: 'Two styles are a strong match for the visible face shape: a softly layered shoulder-length cut and a longer face-framing style.',
      bullets: ['Recommended color: soft copper brown', 'Alternative: warm chestnut', 'Preview: layered style with soft copper tone'],
      footerNote: 'The recommended combination is shown on the right.',
      result: 'assets/workspace/usecases/hair-advisor-result.jpg'
    },
    'Hair Diagnostics': {
      photos: ['assets/workspace/usecases/hair-diagnostics-badge.png'],
      prompt: 'Analyze the visible characteristics of my hair.',
      status: 'ChatGPT Codex',
      description: "I'll assess the visible density, type, frizziness, and length, then combine them into one structured hair profile.",
      toolBadge: 'Used Hair Diagnostics',
      outcomeTitle: 'The image provides enough visibility for a complete hair-characteristics profile.',
      bullets: ['Visible density: medium', 'Hair type: wavy', 'Visible frizziness: low', 'Length: shoulder length'],
      footerNote: 'The structured result is an appearance assessment rather than a medical diagnosis.',
      result: 'assets/workspace/usecases/hair-diagnostics-result.jpg'
    },
    'Clothes Try-on Studio': {
      photos: ['assets/workspace/usecases/clothes-tryon-studio-badge.png', 'assets/workspace/usecases/clothes-tryon-studio-badge2.png'],
      prompt: 'Try this outfit with a runway walk.',
      status: 'VS Code Copilot',
      description: "I'll apply the outfit to the model first, then use the completed try-on as the reference for a short runway motion.",
      toolBadge: 'Used Clothes Try-on Studio',
      outcomeTitle: 'I completed the outfit try-on and used the result to generate a five-second runway-style clip.',
      bullets: ['Garment details preserved', 'Model identity retained', 'Motion: forward walk with a subtle turn'],
      footerNote: 'The finished runway preview is ready on the right.',
      result: 'assets/workspace/usecases/clothes-tryon-studio-result.mp4'
    }
  };

  var workspaceTabsEl = document.getElementById('workspaceTabs');
  var replayDemo = null; // assigned once the reveal-cycle further down initializes

  function renderUseCaseContent(key) {
    var data = USE_CASES[key];
    if (!data) return;

    var badge1 = document.getElementById('wsBadge1');
    var badge2 = document.getElementById('wsBadge2');
    if (badge1) {
      badge1.classList.remove('is-unused');
      badge1.querySelector('img').src = data.photos[0];
    }
    if (badge2) {
      if (data.photos[1]) {
        badge2.classList.remove('is-unused');
        badge2.querySelector('img').src = data.photos[1];
      } else {
        badge2.classList.add('is-unused');
      }
    }

    var promptEl = document.getElementById('wsPrompt');
    if (promptEl) promptEl.textContent = data.prompt;

    var statusIcon = document.getElementById('wsStatusIcon');
    var statusLabel = document.getElementById('wsStatusLabel');
    if (statusIcon) {
      statusIcon.src = STATUS_ICONS[data.status] || STATUS_ICONS['More MCP Clients...'];
      // 'Claude' uses the full wordmark (icon + text baked into one image),
      // so it needs its own natural aspect ratio instead of the fixed 20x20
      // square every other (icon-only) status logo uses.
      statusIcon.classList.toggle('is-wordmark', data.status === 'Claude');
    }
    if (statusLabel) statusLabel.textContent = data.status === 'Claude' ? '' : data.status;

    var descEl = document.getElementById('wsDescription');
    if (descEl) descEl.textContent = data.description;

    var toolBadgeEl = document.getElementById('wsToolBadge');
    if (toolBadgeEl) toolBadgeEl.textContent = data.toolBadge;

    var outcomeTitleEl = document.getElementById('wsOutcomeTitle');
    if (outcomeTitleEl) outcomeTitleEl.textContent = data.outcomeTitle;

    var bulletListEl = document.getElementById('wsBulletList');
    if (bulletListEl) {
      bulletListEl.innerHTML = data.bullets.map(function (b) {
        return '<li>• ' + b + '</li>';
      }).join('');
    }

    var footerNoteEl = document.getElementById('wsFooterNote');
    if (footerNoteEl) footerNoteEl.textContent = data.footerNote;

    // A few use cases (e.g. Creative agency's "Used AI Video Generator")
    // produce a video result instead of a still image — detected by file
    // extension since that's already the one thing distinguishing them in
    // the data, no extra flag needed. Swap which element is visible instead
    // of trying to play a video through an <img> tag (silently broken) or
    // show a static poster for a video result (undersells the feature).
    var resultImg = document.getElementById('wsResultImage');
    var resultVideo = document.getElementById('wsResultVideo');
    var isVideo = /\.(mp4|webm|mov)$/i.test(data.result);
    if (resultImg) resultImg.hidden = isVideo;
    if (resultVideo) {
      resultVideo.hidden = !isVideo;
      if (isVideo) {
        if (resultVideo.getAttribute('src') !== data.result) resultVideo.src = data.result;
        resultVideo.play().catch(function () {}); // autoplay can reject before the reveal-cycle's own opacity transition finishes settling; harmless either way
      } else {
        resultVideo.pause();
      }
    }
    if (resultImg && !isVideo) resultImg.src = data.result;

    var resultCaptionEl = document.getElementById('wsResultCaption');
    if (resultCaptionEl) resultCaptionEl.textContent = data.toolBadge;
  }

  function setActiveUseCase(key) {
    if (!workspaceTabsEl) return;
    workspaceTabsEl.querySelectorAll('.workspace__tab').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-usecase') === key);
    });
    // replayDemo() first: it synchronously strips .is-visible from every
    // reveal-item (result photo included) before the new use case's content
    // gets swapped in. Doing it in the other order — content swap, then
    // reset — briefly showed the NEW result photo fading out under the OLD
    // .is-visible state, since .reveal-item's hide is a 0.5s opacity
    // transition, not an instant cut. Reset-then-swap means whatever fades
    // out is always the outgoing use case's own content, never a preview of
    // the next one.
    if (replayDemo) replayDemo();
    renderUseCaseContent(key);
  }

  function renderWorkspaceTabs(tabKeys) {
    if (!workspaceTabsEl) return;
    workspaceTabsEl.innerHTML = tabKeys.map(function (label, i) {
      return '<button class="workspace__tab' + (i === 0 ? ' is-active' : '') + '" role="tab" data-usecase="' + label + '">' + label + '</button>';
    }).join('');
  }

  function setWorkspaceMethod(method) {
    var tabKeys = method === 'skill' ? SKILL_TABS : MCP_TABS;
    renderWorkspaceTabs(tabKeys);
    // Same reset-before-swap ordering as setActiveUseCase above, and for the
    // same reason.
    if (replayDemo) replayDemo();
    renderUseCaseContent(tabKeys[0]);
  }

  /* ---------------- "Two ways to connect" cards: also swap with the method ----------------
     MCP mode shows the 3 domain-server cards; Agent Skill mode shows the 6
     ready-made skills from Figma node 16915:145367. ---------------- */
  var CONNECT_TITLES = {
    mcp: {
      intro: 'Connect one or more domain servers to give your agent direct access to YouCam API tools. All three servers use the same API key.',
      h2: 'Three MCPs, One API Key',
      p: 'Each MCP server groups YouCam API tools by domain. Connect only the server your agent needs, or add all three using the same API key.'
    },
    skill: {
      intro: 'Install a ready-made workflow. Each skill calls YouCam APIs directly using your API key—no MCP setup required.',
      h2: 'Ready-Made Agent Skills',
      p: 'Install ready-made skills for common workflows. Each skill calls YouCam APIs directly and requires only your API key—no MCP setup.'
    }
  };
  var MCP_CONNECT_CARDS = [
    {
      tag: 'Beauty &amp; Personal Care',
      title: 'YouCam for Beauty &amp; Personal Care',
      desc: 'Give your agent tools for cosmetic skin analysis, makeup try-on, facial analysis, hairstyle generation, hair color, and beard editing.',
      pills: ['Skin, Face &amp; Body', 'Beauty', 'Hair &amp; Beard'],
      images: ['assets/connect/img-img.png', 'assets/connect/img-img1.png']
    },
    {
      tag: 'Fashion &amp; Retail',
      title: 'YouCam for Fashion &amp; Retail',
      desc: 'Give your agent tools to dress models, change backgrounds, and place jewelry or watches on photos for virtual try-on experiences.',
      pills: ['Fashion', 'Jewelry &amp; Watch'],
      images: ['assets/connect/img-img.png', 'assets/connect/img-img2.png']
    },
    {
      tag: 'Creators',
      title: 'YouCam for Creators',
      desc: 'Give your agent tools to generate, edit, and transform images and videos from prompts or reference media.',
      pills: ['Image', 'Video'],
      images: ['assets/connect/img-img.png', 'assets/connect/img-img3.png', 'assets/connect/img-img4.png']
    }
  ];
  var SKILL_CONNECT_CARDS = [
    {
      title: 'Skin Analysis Expert',
      desc: 'Analyzes a selfie across 14 visible skin concerns and turns the API response into a structured, plain-language cosmetic skin report.',
      pills: ['AI Skin Analysis'],
      images: ['assets/connect/skills/skin-analysis-expert.jpg']
    },
    {
      title: 'Facial Consultant',
      desc: 'Analyzes visible facial attributes and color tones, then returns a personalized appearance profile.',
      pills: ['AI Facial Color Tones Analyzer', 'AI Face Attributes'],
      images: ['assets/connect/skills/facial-consultant.jpg']
    },
    {
      title: 'Beauty Advisor',
      desc: 'Analyzes facial attributes and color tones, recommends a matching makeup look, and generates a preview on the provided photo.',
      pills: ['AI Face Attributes', 'AI Facial Color Tones', 'AI Makeup Try-On', 'AI Look Try-On'],
      images: ['assets/connect/skills/beauty-advisor.jpg']
    },
    {
      title: 'Hair Color &amp; Style Advisor',
      desc: 'Analyzes facial attributes and color tones, suggests matching hairstyles and hair colors, and previews each look on the provided photo.',
      pills: ['AI Face Attributes', 'AI Facial Color Tones', 'AI Hairstyle', 'AI Hair Color'],
      images: ['assets/connect/skills/hair-color-style-advisor.jpg']
    },
    {
      title: 'Hair Diagnostics',
      desc: 'Analyzes four visible hair characteristics—density, type, frizziness, and length—and returns one structured report.',
      pills: ['AI Hair Density Detection', 'AI Hair Type Detection', 'AI Hair Frizziness Detection', 'AI Hair Length Detection'],
      images: ['assets/connect/skills/hair-diagnostics.jpg']
    },
    {
      title: 'Clothes Try-on Studio',
      desc: 'Dresses a model in the provided outfit, optionally changes the background, and generates a turn, runway walk, or pose motion.',
      pills: ['AI Clothes', 'AI Change Background', 'AI Video Generator'],
      images: ['assets/connect/skills/clothes-tryon-studio.jpg']
    }
  ];

  var connectCardsGrid = document.getElementById('connectCardsGrid');
  var connectTitleH2 = document.getElementById('connectTitleH2');
  var connectTitleP = document.getElementById('connectTitleP');
  var connectIntroP = document.getElementById('connectIntroP');

  function renderConnectCards(method) {
    var titles = CONNECT_TITLES[method] || CONNECT_TITLES.mcp;
    // "Two ways to connect"'s own intro blurb, right above the MCP/Agent
    // Skill toggle — was static HTML, always showing the MCP wording
    // regardless of which tab was actually active.
    if (connectIntroP) connectIntroP.innerHTML = titles.intro;
    if (connectTitleH2) connectTitleH2.innerHTML = titles.h2;
    if (connectTitleP) connectTitleP.innerHTML = titles.p;

    if (!connectCardsGrid) return;
    var cards = method === 'skill' ? SKILL_CONNECT_CARDS : MCP_CONNECT_CARDS;
    connectCardsGrid.innerHTML = cards.map(function (card) {
      var imgs = card.images.map(function (src, i) {
        var style = i === 0 ? 'object-fit:contain;' : 'position:absolute; inset:0;';
        return '<img src="' + src + '" alt="" style="' + style + '">';
      }).join('');
      var pills = card.pills.map(function (p) { return '<span class="pill">' + p + '</span>'; }).join('');
      return (
        '<article class="connect-card">' +
          '<div class="connect-card__thumb">' + imgs + '</div>' +
          '<h4>' + card.title + '</h4>' +
          '<p>' + card.desc + '</p>' +
          '<div class="connect-card__pills">' + pills + '</div>' +
        '</article>'
      );
    }).join('');
  }

  /* ---------------- "Connect an MCP Server" diagram: steps text + which
     right-hand panel (MCP connector/terminal vs Agent Skill code card) shows,
     also driven by the same top-level method switch. ---------------- */
  // "Connect an MCP Server"/"Add an Agent Skill" section title + intro —
  // was static HTML with no ids, never updated by the method toggle at all
  // (only the numbered steps below it did), so it stayed frozen on MCP
  // wording even with Agent Skill active.
  var DIAGRAM_TITLES = {
    mcp: {
      h2: 'Connect an MCP Server',
      p: 'Choose a domain server, add its configuration to your MCP client, and authenticate with your YouCam API key.'
    },
    skill: {
      h2: 'Add an Agent Skill',
      p: 'Install the complete YouCam skill collection, set your API key, and invoke a workflow from your agent. MCP is not required.'
    }
  };
  var dgTitleH2 = document.getElementById('diagramTitleH2');
  var dgTitleP = document.getElementById('diagramTitleP');
  var DIAGRAM_STEPS = {
    mcp: [
      { title: 'Add the connector', desc: 'Paste the selected MCP configuration into your client.' },
      { title: 'Add your API key', desc: 'Get a <span class="accent">Bearer</span> key from the API Console, then add it to your MCP configuration or set <span class="accent">YOUCAM_API_KEY</span> for Agent Skills.', btn: 'GET API KEY →' },
      { title: 'Call it from chat', desc: 'Ask in plain English; your agent selects the right tool and returns structured results.' }
    ],
    skill: [
      { title: 'Install the YouCam skills', desc: 'Run <span class="accent">npx skills add youcam</span> to install the complete skill collection.' },
      { title: 'Add your API key', desc: 'Get a <span class="accent">Bearer</span> key from the API Console, then add it to your MCP configuration or set <span class="accent">YOUCAM_API_KEY</span> for Agent Skills.', btn: 'GET API KEY →' },
      { title: 'Call it from chat', desc: 'Invoke a skill; it calls the required APIs and returns a formatted report with result media.' }
    ]
  };
  var dgStep1Title = document.getElementById('dgStep1Title');
  var dgStep1Desc = document.getElementById('dgStep1Desc');
  var dgStep2Title = document.getElementById('dgStep2Title');
  var dgStep2Desc = document.getElementById('dgStep2Desc');
  var dgStep2Btn = document.getElementById('dgStep2Btn');
  var dgStep3Title = document.getElementById('dgStep3Title');
  var dgStep3Desc = document.getElementById('dgStep3Desc');
  var diagramPanelMcp = document.getElementById('diagramPanelMcp');
  var diagramPanelSkill = document.getElementById('diagramPanelSkill');

  function renderDiagramSteps(method) {
    var titles = DIAGRAM_TITLES[method] || DIAGRAM_TITLES.mcp;
    if (dgTitleH2) dgTitleH2.textContent = titles.h2;
    if (dgTitleP) dgTitleP.textContent = titles.p;

    var steps = DIAGRAM_STEPS[method] || DIAGRAM_STEPS.mcp;
    if (dgStep1Title) dgStep1Title.textContent = steps[0].title;
    if (dgStep1Desc) dgStep1Desc.innerHTML = steps[0].desc;
    if (dgStep2Title) dgStep2Title.textContent = steps[1].title;
    if (dgStep2Desc) dgStep2Desc.innerHTML = steps[1].desc;
    if (dgStep2Btn) {
      if (steps[1].btn) { dgStep2Btn.textContent = steps[1].btn; dgStep2Btn.hidden = false; }
      else { dgStep2Btn.hidden = true; }
    }
    if (dgStep3Title) dgStep3Title.textContent = steps[2].title;
    if (dgStep3Desc) dgStep3Desc.innerHTML = steps[2].desc;

    if (diagramPanelMcp) diagramPanelMcp.hidden = method === 'skill';
    if (diagramPanelSkill) diagramPanelSkill.hidden = method !== 'skill';
  }

  function setConnectMethod(method) {
    renderConnectCards(method);
    renderDiagramSteps(method);
  }
  setConnectMethod('mcp'); // matches the static HTML default, kept as the single source of truth going forward

  if (workspaceTabsEl) {
    workspaceTabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.workspace__tab');
      if (!btn) return;
      setActiveUseCase(btn.getAttribute('data-usecase'));
    });
    setWorkspaceMethod('mcp'); // initial render, before the page's own MCP/Agent Skill switch is touched
  }

  /* ---------------- Sticky MCP/Agent Skill switch: stays pinned through the
     connect cards + both diagram panels + the workspace demo (all still true
     CSS position:sticky, bound to .connect-flow's height), then fades out once
     the Features section has scrolled up to occupy the top third of the
     viewport — that hand-off point is unrelated to any element's edge, so it
     has to be measured on scroll rather than left to sticky's own cutoff. ---------------- */
  var stickyBar = document.querySelector('.method-tabs-bar');
  var featuresSection = document.querySelector('.features');
  if (stickyBar && featuresSection) {
    var tickingStickyBar = false;
    function updateStickyBarVisibility() {
      tickingStickyBar = false;
      var triggerY = window.innerHeight / 3;
      var pastTrigger = featuresSection.getBoundingClientRect().top <= triggerY;
      stickyBar.classList.toggle('is-past-flow', pastTrigger);
    }
    function requestStickyBarUpdate() {
      if (tickingStickyBar) return;
      tickingStickyBar = true;
      requestAnimationFrame(updateStickyBarVisibility);
    }
    window.addEventListener('scroll', requestStickyBarUpdate, { passive: true });
    window.addEventListener('resize', requestStickyBarUpdate);
    updateStickyBarVisibility();
  }

  /* ---------------- MCP config playground: domain (Beauty/Fashion/Creators)
     × client (Claude/GitHub Copilot/n8n/Cursor/Codex) both switch, and
     together they drive the generated config shown in the terminal. ---------------- */
  var DOMAINS = {
    beauty:   { server: 'youcam-beauty',   slug: 'beauty' },
    fashion:  { server: 'youcam-fashion',  slug: 'fashion' },
    creators: { server: 'youcam-creators', slug: 'creators' }
  };
  var CLIENTS = {
    claude:  { filename: 'claude_desktop_config.json', requiresNode: true },
    copilot: { filename: 'mcp.json', requiresNode: false },
    n8n:     { filename: 'mcp.json', requiresNode: false },
    cursor:  { filename: 'mcp.json', requiresNode: false },
    codex:   { filename: 'config.toml', requiresNode: true }
  };
  // Real per-token JSON coloring (keys vs. string values) instead of one
  // flat color for the whole block — .terminal__body's own base color acts
  // as the punctuation/brace color, .tok-key/.tok-str override just the
  // parts wrapped here. Safe to build as an HTML string (not user input,
  // every value comes from the DOMAINS map above) and assign via innerHTML;
  // .textContent still returns the plain JSON for the copy button, since it
  // just concatenates the text nodes regardless of the span wrappers.
  function jsonKey(s) { return '<span class="tok-key">"' + s + '"</span>'; }
  function jsonStr(s) { return '<span class="tok-str">"' + s + '"</span>'; }
  function buildMcpConfig(domainKey) {
    var d = DOMAINS[domainKey] || DOMAINS.beauty;
    return '{\n' +
      '  ' + jsonKey('mcpServers') + ': {\n' +
      '    ' + jsonKey(d.server) + ': {\n' +
      '      ' + jsonKey('command') + ': ' + jsonStr('npx') + ',\n' +
      '      ' + jsonKey('args') + ': [\n' +
      '        ' + jsonStr('-y') + ', ' + jsonStr('mcp-remote') + ',\n' +
      '        ' + jsonStr('https://mcp-api-01.youcamapi.com/mcp/' + d.slug) + ',\n' +
      '        ' + jsonStr('--header') + ', ' + jsonStr('Authorization:${AUTH}') + '\n' +
      '      ],\n' +
      '      ' + jsonKey('env') + ': {\n' +
      '        ' + jsonKey('AUTH') + ': ' + jsonStr('Bearer YOUR_API_KEY') + '\n' +
      '      }\n' +
      '    }\n' +
      '  }\n' +
      '}';
  }

  // Wires up a domain switcher (connector-row/connector-col). If it declares
  // data-terminal, selecting a domain also regenerates that terminal's JSON.
  document.querySelectorAll('[id$="DomainSwitch"]').forEach(function (group) {
    var terminalId = group.getAttribute('data-terminal');
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.connector-item');
      if (!btn || !group.contains(btn)) return;
      group.querySelectorAll('.connector-item').forEach(function (item) {
        var active = item === btn;
        item.classList.toggle('is-active', active);
        // Domain icon swaps blue (active) <-> gray (inactive); the status
        // badge only needs its background toggled (handled in CSS).
        var icon = item.querySelector('.connector-item__icon');
        if (icon) {
          var src = active ? icon.getAttribute('data-active-src') : icon.getAttribute('data-inactive-src');
          if (src) icon.src = src;
        }
      });
      if (terminalId) {
        var pre = document.getElementById(terminalId);
        if (pre) pre.innerHTML = buildMcpConfig(btn.getAttribute('data-domain'));
      }
    });
  });

  // Client logos (Claude / GitHub Copilot / n8n / Cursor / Codex) in the
  // terminal header: the active one gets swapped to the white-pill treatment
  // in CSS. The JSON body stays keyed to whichever domain is active.
  // Generic over every [id$="ClientSwitch"] instance (A's mcpClientSwitch,
  // B's diagramBClientSwitch, any future ones) instead of one hardcoded ID —
  // the footer status is found by DOM traversal from within the same
  // .terminal instead of a second hardcoded ID, so this scales to as many
  // terminals as the page has without extra wiring per one.
  document.querySelectorAll('[id$="ClientSwitch"]').forEach(function (mcpClientSwitch) {
    mcpClientSwitch.addEventListener('click', function (e) {
      var btn = e.target.closest('.terminal__logo');
      if (!btn) return;
      mcpClientSwitch.querySelectorAll('.terminal__logo').forEach(function (t) {
        t.classList.toggle('is-active', t === btn);
      });
      var client = CLIENTS[btn.getAttribute('data-client')];
      // Only clients that shell out to `npx mcp-remote` locally need a
      // Node.js/npm runtime; others run the connection through their own host.
      var terminal = mcpClientSwitch.closest('.terminal');
      var footerStatus = terminal ? terminal.querySelector('.terminal__footer-status') : null;
      if (client && footerStatus) footerStatus.style.display = client.requiresNode ? '' : 'none';
    });
  });

  /* ---------------- Card-grid reveal-on-scroll ----------------
     Any container passed here fades/slides its direct children in with a
     small stagger once it scrolls into view — connect cards, feature cards,
     why-build cards, showcase cards, stats cards/figures all use this. */
  function revealCardGrid(container) {
    if (!container) return;
    Array.prototype.slice.call(container.children).forEach(function (child, i) {
      child.style.transitionDelay = (i * 100) + 'ms';
    });
    container.classList.add('is-revealed');
  }
  // onRevealed (optional) fires once, after the whole staggered reveal has
  // actually finished playing — e.g. the stats count-up waits for this
  // instead of starting at the same time as the cards.
  function armCardGrid(container, onRevealed) {
    if (!container) return;
    container.classList.add('card-reveal');
    function afterReveal() {
      if (!onRevealed) return;
      var count = container.children.length;
      var totalMs = Math.max(0, count - 1) * 100 + 700 + 150; // last stagger delay + transition + a short beat
      setTimeout(onRevealed, totalMs);
    }
    if (!('IntersectionObserver' in window)) { revealCardGrid(container); afterReveal(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealCardGrid(container);
          afterReveal();
          io.disconnect();
        }
      });
      // Shrinks the effective viewport bottom by 20% so a grid that's
      // already sitting right at the initial fold (e.g. the connect cards,
      // just below the hero) doesn't fire the instant the page loads —
      // it waits until scrolling actually brings it meaningfully into view.
    }, { threshold: 0.15, rootMargin: '0px 0px -20% 0px' });
    io.observe(container);
  }
  ['connectCardsGrid', 'showcaseGrid'].forEach(function (id) {
    armCardGrid(document.getElementById(id));
  });
  var statsFigures = document.querySelector('.stats__row--figures');
  if (statsFigures) armCardGrid(statsFigures);
  document.querySelectorAll('.feature-grid, .why-build__grid').forEach(armCardGrid);

  /* ---------------- FAQ accordion ---------------- */
  var faqList = document.getElementById('faqList');
  if (faqList) {
    faqList.addEventListener('click', function (e) {
      var q = e.target.closest('.faq-item__q');
      if (!q) return;
      var item = q.closest('.faq-item');
      item.classList.toggle('is-open');
    });
  }

  /* ---------------- Copy-to-clipboard for terminal / bearer token blocks ---------------- */
  document.addEventListener('click', function (e) {
    var copyBtn = e.target.closest('[data-copy-target], [data-copy-value]');
    if (!copyBtn) return;
    var text = copyBtn.getAttribute('data-copy-value');
    if (!text) {
      var targetId = copyBtn.getAttribute('data-copy-target');
      var target = targetId && document.getElementById(targetId);
      text = target ? target.textContent : '';
    }
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(function () {
      var originalHTML = copyBtn.innerHTML;
      copyBtn.textContent = 'Copied!';
      setTimeout(function () {
        copyBtn.innerHTML = originalHTML;
      }, 1200);
    }).catch(function () {});
  });

  /* ---------------- Marquees (hero partner logos + Agent Skill partner logos):
     duplicate logos within the SAME track (never two tracks side by side —
     that can't loop seamlessly) enough times that the strip always has more
     content waiting off-screen than the visible width, so on a wide monitor
     it never visibly "runs dry" before the loop repeats. The shift distance
     and speed are MEASURED (one real logo-set width), not assumed, so the
     jump-back is pixel-exact regardless of how many sets that took. ---------------- */
  var PX_PER_SECOND = 45; // constant scroll speed regardless of set width

  function setupMarquee(track) {
    // Remember how many children make up ONE real set the first time this runs —
    // on later calls (window resize) track.children has already grown with
    // clones, so this is the only reliable way to know which ones are "real".
    var setSize = parseInt(track.dataset.setSize, 10);
    var baseItems;
    if (!setSize) {
      baseItems = Array.prototype.slice.call(track.children);
      setSize = baseItems.length;
      if (!setSize) return;
      track.dataset.setSize = String(setSize);
    } else {
      baseItems = Array.prototype.slice.call(track.children, 0, setSize);
    }

    // Duplicate until the track is comfortably wider than 2x its visible
    // container — guarantees at least one full extra set is always queued
    // up off-screen in either direction. Never removes clones on re-run, so
    // this is safe to call again on resize (only ever adds more if needed).
    var container = track.parentElement;
    var containerWidth = (container && container.clientWidth) || window.innerWidth;
    var guard = 0;
    while (track.scrollWidth < containerWidth * 2 && guard < 12) {
      baseItems.forEach(function (item) {
        var clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      });
      guard++;
    }

    // The gap between where set 1 starts and where set 2 starts IS the width of
    // one full repetition (logos + trailing gap) — shifting by exactly that
    // makes the loop seamless no matter how many repetitions were needed above.
    // (Measured as a delta, not raw offsetLeft, since offsetParent may not be
    // the track itself.)
    var distance = track.children[setSize].offsetLeft - track.children[0].offsetLeft;
    if (!distance) return; // bail rather than divide by zero / animate nothing

    track.style.setProperty('--marquee-shift', '-' + distance + 'px');
    track.style.setProperty('--marquee-duration', (distance / PX_PER_SECOND) + 's');
    track.classList.add('is-ready');
  }

  var marqueeTracks = Array.prototype.slice.call(document.querySelectorAll('.marquee__track'));
  if (marqueeTracks.length) {
    // Wait for images to finish loading — measuring before then would use
    // each logo's collapsed/placeholder size and produce the wrong distance.
    var pendingImages = marqueeTracks.reduce(function (n, t) { return n + t.querySelectorAll('img').length; }, 0);
    var settled = false;
    function trySetupAll() {
      if (settled) return;
      settled = true;
      marqueeTracks.forEach(setupMarquee);
    }
    if (document.readyState === 'complete') {
      trySetupAll();
    } else {
      var loaded = 0;
      marqueeTracks.forEach(function (t) {
        t.querySelectorAll('img').forEach(function (img) {
          if (img.complete) { loaded++; return; }
          img.addEventListener('load', function () { if (++loaded >= pendingImages) trySetupAll(); });
          img.addEventListener('error', function () { if (++loaded >= pendingImages) trySetupAll(); });
        });
      });
      if (loaded >= pendingImages) trySetupAll();
      window.addEventListener('load', trySetupAll); // safety net
    }
    window.addEventListener('resize', function () {
      clearTimeout(window.__marqueeResizeT);
      window.__marqueeResizeT = setTimeout(function () {
        marqueeTracks.forEach(function (track) {
          track.classList.remove('is-ready');
          // Re-measure against the existing (already-duplicated) children —
          // safe to call again since it only ever adds more, never removes.
          setupMarquee(track);
        });
      }, 200);
    });
  }

  /* ---------------- Showcase grid, built from data to keep index.html lean ----------------
     Real photo/video pairs (assets/showcase/) — each card shows the poster
     image immediately and, for entries with a clip, lazy-loads + autoplays
     the muted loop only once it's actually on screen (pausing again once it
     scrolls away) rather than loading/playing all ten videos at once. ---------------- */
  var showcaseGrid = document.getElementById('showcaseGrid');
  if (showcaseGrid) {
    // videoFile carries a "-tmp" suffix on several entries — some external
    // process (not this codebase) renamed every showcase .mp4 with that
    // suffix while the .jpg posters were left alone, breaking every hover
    // video's <source> path (posters still showed fine, silently masking
    // it) until this was caught. Split out from `file` (still used for the
    // poster path) so a future rename-back only needs to change it here.
    var items = [
      { label: 'Skin Analysis', file: 'Skin Analysis', videoFile: 'Skin Analysis-tmp' },
      { label: 'Makeup Transfer', file: 'Makeup Transfer', videoFile: 'Makeup Transfer-tmp' },
      { label: 'Image Generation', file: 'Image Generation', posterFile: 'Image Generation-1' },
      { label: 'Video Generation', file: 'Video Generation', videoFile: 'Video Generation-tmp' },
      { label: 'Clothes VTO', file: 'Clothes VTO', videoFile: 'Clothes VTO-tmp' },
      { label: 'Hair VTO', file: 'Hair VTO', videoFile: 'Hair VTO-tmp' },
      { label: 'Reshape', file: 'Reshape' },
      { label: 'Image Edit', file: 'Image Edit' },
      { label: 'Jewelry Try-On', file: 'AR Bracelet-topbanner-pd', posterFile: 'AR Bracelet-topbanner-pd-0', videoFile: 'AR Bracelet-topbanner-pd-tmp' }
    ];
    var html = items.map(function (item) {
      var poster = 'assets/showcase/' + encodeURIComponent((item.posterFile || item.file) + '.jpg');
      var hasVideo = item.videoExt !== null;
      var media = hasVideo
        ? '<video class="showcase-card__media" muted loop playsinline preload="none" poster="' + poster + '">' +
            '<source data-src="' + 'assets/showcase/' + encodeURIComponent((item.videoFile || item.file) + '.mp4') + '" type="video/mp4">' +
          '</video>'
        : '<img class="showcase-card__media" src="' + poster + '" alt="">';
      return (
        '<div class="showcase-card">' +
          '<div class="showcase-card__body"' + (hasVideo ? ' tabindex="0"' : '') + '>' +
            media +
            '<span class="showcase-card__pill">' + item.label + '</span>' +
          '</div>' +
          '<span class="showcase-card__label">' + item.label + '</span>' +
        '</div>'
      );
    }).join('');
    showcaseGrid.innerHTML = html;

    // Lazy load + play each clip on hover (poster shows the rest of the time).
    // Loading is deferred to the first hover, not done up front, so scrolling
    // past ten cards doesn't fetch ten videos' worth of data for nothing.
    var showcaseVideos = Array.prototype.slice.call(showcaseGrid.querySelectorAll('video.showcase-card__media'));
    showcaseVideos.forEach(function (video) {
      var card = video.closest('.showcase-card__body');
      if (!card) return;
      function loadIfNeeded() {
        var source = video.querySelector('source');
        if (source && source.dataset.src) {
          source.src = source.dataset.src;
          delete source.dataset.src;
          video.load();
        }
      }
      function playVideo() {
        loadIfNeeded();
        video.play().catch(function () {});
      }
      function stopVideo() {
        video.pause();
        video.currentTime = 0; // reset so the next hover replays from the start
        // Once a video has rendered any frame, its poster never reappears on
        // its own — pausing/seeking to 0 just leaves whatever that frame
        // looks like on screen (often a black flash-frame). load() resets
        // the element back to its pre-playback state, which restores the
        // poster image until the next hover.
        video.load();
      }
      card.addEventListener('mouseenter', playVideo);
      card.addEventListener('mouseleave', stopVideo);
      card.addEventListener('focus', playVideo); // keyboard nav parity
      card.addEventListener('blur', stopVideo);
      // Touch devices have no hover — tap toggles play/pause instead.
      card.addEventListener('click', function () {
        if (video.paused) { playVideo(); } else { stopVideo(); }
      });
    });
  }

  /* ---------------- Workspace demo: step-by-step reveal, looping ----------------
     Plays once the card scrolls into view: input images → prompt → "AI is
     thinking" → response built piece by piece → generated result → hold →
     reset → replay. */
  var demoCard = document.getElementById('workspaceDemo');
  if (demoCard) {
    // [data-reveal] excludes #workspaceTyping (a .reveal-item with no
    // data-reveal of its own, handled entirely by its own dedicated show/
    // hide below) from this generic per-step grouping. Without this, it
    // fell into a group keyed by the string "null" (getAttribute returns
    // null, coerced to an object key) that sorted to the END of stepKeys —
    // meaning the generic loop re-added .is-visible to it a second time,
    // long after its own deliberate hide, right around when the full reply
    // finished revealing. That's what kept showing "AI is thinking..."
    // alongside the finished reply instead of just during the pause before it.
    var revealItems = Array.prototype.slice.call(demoCard.querySelectorAll('.reveal-item[data-reveal]'));
    var typingEl = document.getElementById('workspaceTyping');
    var groups = {};
    revealItems.forEach(function (el) {
      var key = el.getAttribute('data-reveal');
      (groups[key] = groups[key] || []).push(el);
    });
    var stepKeys = Object.keys(groups).sort(function (a, b) { return Number(a) - Number(b); });

    // The chat log has its own scrollbar on desktop (card height capped to a
    // share of the viewport) but not on mobile anymore, where the whole
    // .workspace-card scrolls as one unit instead — so as each reply piece
    // appears, follow it down like a real chat by scrolling whichever of the
    // two is actually the scrolling container, not always .workspace-card__left.
    var chatLog = demoCard.querySelector('.workspace-card__left');
    function scrollContainer() {
      return (chatLog && chatLog.scrollHeight > chatLog.clientHeight + 1) ? chatLog : demoCard;
    }
    function scrollNewestIntoView(el) {
      if (!el) return;
      var container = scrollContainer();
      var elRect = el.getBoundingClientRect();
      var containerRect = container.getBoundingClientRect();
      var overflowBelow = elRect.bottom - containerRect.bottom;
      if (overflowBelow > 0) {
        container.scrollTo({ top: container.scrollTop + overflowBelow + 16, behavior: 'smooth' });
      }
    }
    // Per direct request: always settle at the very bottom once the whole
    // reply has finished revealing, rather than stopping wherever the last
    // "follow the newest piece into view" scroll happened to land.
    function scrollToBottom() {
      var container = scrollContainer();
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      revealItems.forEach(function (el) { el.classList.add('is-visible'); });
    } else {
      var timers = [];
      var schedule = function (fn, delay) { timers.push(setTimeout(fn, delay)); };
      var clearAllTimers = function () { timers.forEach(clearTimeout); timers = []; };

      var playCycle = function () {
        clearAllTimers();
        // Removing .is-visible still runs .reveal-item's own 0.5s opacity
        // transition — a normal fade-out on its own, but setActiveUseCase
        // swaps each element's actual content (the result photo included)
        // to the NEW use case right after this reset returns, so without
        // forcing the fade instant here, that 0.5s window fades out
        // whatever's now underneath, i.e. a glimpse of the new photo before
        // its real staged reveal later in the timeline. Kill transitions for
        // one reflow so the reset is an instant cut, then restore them so
        // every later scheduled reveal still animates normally.
        revealItems.forEach(function (el) { el.style.transition = 'none'; });
        if (typingEl) typingEl.style.transition = 'none';
        revealItems.forEach(function (el) { el.classList.remove('is-visible'); });
        if (typingEl) typingEl.classList.remove('is-visible');
        demoCard.classList.remove('is-result-shown'); // mobile shrink/float state, reset each replay
        void demoCard.offsetHeight; // force layout flush before re-enabling transitions
        revealItems.forEach(function (el) { el.style.transition = ''; });
        if (typingEl) typingEl.style.transition = '';
        if (chatLog) chatLog.scrollTop = 0; // start each replay back at the top
        demoCard.scrollTop = 0; // ditto for mobile, where demoCard itself is the scrolling container instead

        var t = 400;
        var STEP_GAP = 550;
        var THINK_DURATION = 900;
        // .reveal-item's own translateY(10px) → translateY(0) transition takes
        // this long to settle — reading getBoundingClientRect() any earlier
        // catches it mid-transition, so the scroll target undershoots by
        // however many px are left to settle, then the layout "jumps" that
        // last bit into place a moment after we already stopped scrolling.
        var REVEAL_SETTLE_MS = 500;
        var lastKey = stepKeys[stepKeys.length - 1];

        stepKeys.forEach(function (key) {
          // Show a brief "AI is thinking" pause right before the first
          // AI-generated block (step 3: the "More MCP Clients..." status line).
          if (key === '3' && typingEl) {
            schedule(function () {
              typingEl.classList.add('is-visible');
              scrollNewestIntoView(typingEl);
            }, t);
            t += THINK_DURATION;
            schedule(function () { typingEl.classList.remove('is-visible'); }, t);
            t += 250;
          }
          schedule(function () {
            groups[key].forEach(function (el) { el.classList.add('is-visible'); });
            // On mobile, the result panel (step 8) also shrinks the card and
            // floats itself over its corner instead of sitting in normal
            // flow — see the .is-result-shown CSS + #resultFloatClose below.
            // B-version only: #workspaceDemo isn't a .pv-block itself (it's
            // shared, not duplicated per A/B), so we branch on the page-wide
            // toggle's data-pv-mode instead. Version A never gets this class.
            if (key === '8' && document.body.getAttribute('data-pv-mode') === 'b') {
              demoCard.classList.add('is-result-shown');
            }
            // Follow the last (bottom-most) element of this step down into
            // view — delayed until its own reveal transition has settled.
            // Once the whole reply has finished (the last step), settle at
            // the true bottom instead, per direct request, rather than
            // wherever this step's own "follow it into view" scroll landed.
            schedule(function () {
              if (key === lastKey) {
                scrollToBottom();
              } else {
                scrollNewestIntoView(groups[key][groups[key].length - 1]);
              }
            }, REVEAL_SETTLE_MS);
          }, t);
          t += STEP_GAP;
        });

        // Play through once and hold on the finished result — no auto-restart.
        // It only plays again if the user switches method/use-case away and
        // back (setActiveUseCase/setWorkspaceMethod call replayDemo directly).
      };

      var started = false;
      // Exposed so switching the method or use-case tab can replay the story
      // for the newly-shown content instead of leaving the old one's mid-cycle
      // state on screen.
      replayDemo = function () {
        started = true;
        playCycle();
      };

      // Mobile "×" on the floating result panel — dismiss it back to the
      // card's full width rather than re-running the whole reveal cycle.
      var resultFloatClose = document.getElementById('resultFloatClose');
      if (resultFloatClose) {
        resultFloatClose.addEventListener('click', function () {
          demoCard.classList.remove('is-result-shown');
        });
      }

      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !started) {
              started = true;
              playCycle();
              io.disconnect();
            }
          });
        }, { threshold: 0.3 });
        io.observe(demoCard);
      } else {
        replayDemo();
      }
    }
  }

  /* ---------------- Stats banner: count-up on scroll into view ----------------
     Plays once per page load, right after the cards' own reveal animation
     finishes (via armCardGrid's onRevealed callback) rather than starting
     at the same time — scrolling away and back does NOT replay it (only a
     fresh page load does). Eased fast-to-slow (ease-out) rather than linear. ---------------- */
  var statsCards = document.getElementById('statsCards');
  if (statsCards) {
    var countEls = Array.prototype.slice.call(statsCards.querySelectorAll('[data-count-to]'));
    var reduceMotionStats = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function formatCount(value, decimals, suffix) {
      return value.toFixed(decimals) + suffix;
    }

    function playCountUp() {
      var DURATION = 1600;
      countEls.forEach(function (el) {
        var target = parseFloat(el.getAttribute('data-count-to'));
        var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
        var suffix = el.getAttribute('data-suffix') || '';
        if (reduceMotionStats) {
          el.textContent = formatCount(target, decimals, suffix);
          return;
        }
        var start = null;
        function frame(now) {
          if (start === null) start = now;
          var t = Math.min((now - start) / DURATION, 1);
          var eased = 1 - Math.pow(1 - t, 3); // ease-out cubic — fast start, settles in slowly
          el.textContent = formatCount(target * eased, decimals, suffix);
          if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }

    // No card entrance animation here — just the number count-up, on its
    // own IntersectionObserver (plays once per page load).
    if ('IntersectionObserver' in window) {
      var statsStarted = false;
      var statsIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !statsStarted) {
            statsStarted = true;
            playCountUp();
            statsIo.disconnect();
          }
        });
      }, { threshold: 0.4 });
      statsIo.observe(statsCards);
    } else {
      playCountUp();
    }
  }

  /* ---------------- Steps connector: a dot travels from circle 1 to circle 3
     in a straight line (measured exactly, so it never overshoots past 3),
     lighting up each circle the instant it arrives, then holds and resets. ---------------- */
  var stepsWrap = document.querySelector('.steps-wrap');
  if (stepsWrap && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var connector = stepsWrap.querySelector('.steps__connector');
    var dot = stepsWrap.querySelector('.steps__dot');
    var circles = Array.prototype.slice.call(stepsWrap.querySelectorAll('.step__num'));

    var TRAVEL_MS = 4800;   // slower, deliberate pace
    var HOLD_MS = 900;      // pause fully lit at step 3
    var FADE_MS = 350;      // dot fades out before resetting
    var GAP_MS = 700;       // pause before the next pass

    var DOT_UNDERSHOOT = 20; // px short of circle 3's true center — a visible safety margin against any overshoot
    // How much sooner each step's glow fires than the dot's true arrival time —
    // tuned independently per step (index 0 is step 1, which lights instantly
    // regardless, so its entry here is unused).
    var GLOW_EARLY_MS = [0, 300, 500];
    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    var geo = { top: 0, bottom: 0, dotBottom: 0, thresholds: [] };
    function measure() {
      if (!circles.length) return;
      var wrapRect = stepsWrap.getBoundingClientRect();
      var centers = circles.map(function (c) {
        var r = c.getBoundingClientRect();
        return (r.top + r.height / 2) - wrapRect.top;
      });
      geo.top = centers[0];
      geo.bottom = centers[centers.length - 1];
      // The connector LINE still runs the full distance to circle 3's center
      // (so it visually connects to it), but the DOT stops a bit short of
      // that — it's the dot sitting dead-center on the circle, right at its
      // edge, that was reading as "overshooting past 3".
      geo.dotBottom = Math.max(geo.top, geo.bottom - DOT_UNDERSHOOT);
      var span = geo.bottom - geo.top || 1;
      geo.thresholds = centers.map(function (y) { return (y - geo.top) / span; });
      connector.style.top = geo.top + 'px';
      connector.style.height = (geo.bottom - geo.top) + 'px';
    }
    measure();
    window.addEventListener('resize', function () {
      clearTimeout(window.__stepsResizeT);
      window.__stepsResizeT = setTimeout(measure, 150);
    });

    var rafId = null;
    function setGlow(activeCount) {
      circles.forEach(function (c, i) { c.classList.toggle('is-glowing', i < activeCount); });
    }

    function runPass() {
      // Re-measure on every pass, not just the first — if a web font swaps in,
      // an image finishes loading, or anything else reflows the steps after
      // the very first measurement, a stale geo.bottom is exactly what makes
      // the dot travel past (or stop short of) where circle 3 actually is now.
      measure();
      var start = null;
      dot.style.opacity = '1';
      setGlow(1); // circle 1 lights immediately as the dot departs from it

      function frame(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / TRAVEL_MS, 1);
        // ease-in-out for a smoother, less mechanical glide
        var eased = easeInOut(t);

        // `eased` (0-1) stays keyed to the REAL top-to-bottom span so the
        // glow timing below lines up with circle 3's true center — but the
        // dot's own RENDERED position is separately clamped to never travel
        // past geo.dotBottom (the undershoot stop), so it never visually
        // overlaps/passes the circle even though the glow already fired.
        var span = geo.bottom - geo.top || 1;
        var dotSpanFrac = (geo.dotBottom - geo.top) / span;
        var travelFrac = Math.min(eased, dotSpanFrac);
        dot.style.top = (geo.top + travelFrac * span) + 'px';

        // Each step (from 2 onward) gets its own early-trigger offset so it
        // lights up a tunable amount before the dot's true arrival — checked
        // in order, stopping at the first one not yet satisfied, so they
        // still always light up sequentially.
        var reached = 1;
        for (var gi = 1; gi < geo.thresholds.length; gi++) {
          var early = GLOW_EARLY_MS[gi] || 0;
          var glowEased = easeInOut(Math.min((now - start + early) / TRAVEL_MS, 1));
          if (glowEased >= geo.thresholds[gi] - 0.001) reached++;
          else break;
        }
        setGlow(Math.max(1, reached));

        if (t < 1) {
          rafId = requestAnimationFrame(frame);
        } else {
          // Hold fully lit at step 3, then fade the dot and reset for the next pass.
          setTimeout(function () {
            dot.style.transition = 'opacity ' + FADE_MS + 'ms ease';
            dot.style.opacity = '0';
            setTimeout(function () {
              dot.style.transition = '';
              dot.style.top = geo.top + 'px';
              setGlow(0);
              setTimeout(runPass, GAP_MS);
            }, FADE_MS);
          }, HOLD_MS);
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    if ('IntersectionObserver' in window) {
      var stepsStarted = false;
      var stepsIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !stepsStarted) {
            stepsStarted = true;
            measure();
            runPass();
            stepsIo.disconnect();
          }
        });
      }, { threshold: 0.3 });
      stepsIo.observe(stepsWrap);
    } else {
      runPass();
    }
  }

  /* ---------------- Version B's horizontal 1-2-3 steps ----------------
     Same sequential-glow concept as A's vertical steps/traveling-dot, just
     adapted sideways: each divider between circles fills blue as that leg
     "completes", lighting the next circle, then holds fully lit and resets
     to loop again. */
  var horizontalSteps = document.getElementById('horizontalSteps');
  if (horizontalSteps && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var hCircles = Array.prototype.slice.call(horizontalSteps.querySelectorAll('.step__num'));
    var hDividers = Array.prototype.slice.call(horizontalSteps.querySelectorAll('.horizontal-steps__divider'));
    var hDividerFills = Array.prototype.slice.call(horizontalSteps.querySelectorAll('.horizontal-steps__divider-fill'));

    // Once stacked vertically (mobile), each divider is position:absolute
    // and needs its real top/height measured — same technique as A's own
    // .steps__connector, just per-divider (one span per adjacent circle
    // pair) instead of one continuous line across all three. Without this,
    // the divider's old fixed height covered only a fraction of the true
    // gap between circles (each step's own 1-3 lines of text made that gap
    // taller than any fixed value could account for), showing as a short
    // dashed segment floating with blank space around it instead of a full
    // line connecting the circles. Desktop's horizontal layout never enters
    // the flexDirection:'column' branch, so it's untouched — its divider
    // stays the plain in-flow segment its own CSS already sizes.
    function measureHDividers() {
      if (getComputedStyle(horizontalSteps).flexDirection !== 'column') {
        hDividers.forEach(function (d) { d.style.top = ''; d.style.height = ''; });
        return;
      }
      var wrapRect = horizontalSteps.getBoundingClientRect();
      var centers = hCircles.map(function (c) {
        var r = c.getBoundingClientRect();
        return (r.top + r.height / 2) - wrapRect.top;
      });
      hDividers.forEach(function (div, i) {
        var top = centers[i];
        var bottom = centers[i + 1];
        if (top == null || bottom == null) return;
        div.style.top = top + 'px';
        div.style.height = Math.max(0, bottom - top) + 'px';
      });
    }
    measureHDividers();
    window.addEventListener('resize', function () {
      clearTimeout(window.__hStepsResizeT);
      window.__hStepsResizeT = setTimeout(measureHDividers, 150);
    });

    var H_STEP_MS = 1400;
    var H_HOLD_MS = 5000; // once all 3 steps + cards are lit, hold here before looping back to the start
    var H_GAP_MS = 700;

    // The 3 Flow-Grid cards below reveal in step with the glow: card 1
    // (connector) is visible from the start; card 2 (console) + its leading
    // arrow appear when step 2 lights; card 3 (chat) + its leading arrow
    // appear when step 3 lights. .flow-grid.is-staged (added below) is what
    // makes cards 2/3 + both arrows start hidden via CSS in the first place.
    var flowGrid = document.querySelector('.flow-grid');
    var flowConsole = flowGrid ? flowGrid.querySelector('.flow-grid__col--console') : null;
    var flowChat = flowGrid ? flowGrid.querySelector('.flow-grid__col--chat') : null;
    var flowArrows = flowGrid ? Array.prototype.slice.call(flowGrid.querySelectorAll('.flow-grid__arrow')) : [];
    if (flowGrid) flowGrid.classList.add('is-staged');

    function hSetGlow(activeCount) {
      hCircles.forEach(function (c, i) { c.classList.toggle('is-glowing', i < activeCount); });
    }
    function hSetDividers(filledCount) {
      hDividerFills.forEach(function (d, i) { d.classList.toggle('is-filled', i < filledCount); });
    }
    function hSetFlow(revealedCount) {
      if (flowConsole) flowConsole.classList.toggle('is-visible', revealedCount >= 2);
      if (flowChat) flowChat.classList.toggle('is-visible', revealedCount >= 3);
      flowArrows.forEach(function (arrow, i) { arrow.classList.toggle('is-visible', revealedCount >= i + 2); });
    }

    function hRunPass() {
      horizontalSteps.classList.add('is-playing');
      hSetGlow(1);
      hSetDividers(0);
      hSetFlow(1);
      setTimeout(function () {
        hSetDividers(1);
        hSetGlow(2);
        hSetFlow(2);
        setTimeout(function () {
          hSetDividers(2);
          hSetGlow(3);
          hSetFlow(3);
          setTimeout(function () {
            hSetGlow(0);
            hSetDividers(0);
            hSetFlow(0);
            horizontalSteps.classList.remove('is-playing');
            setTimeout(hRunPass, H_GAP_MS);
          }, H_HOLD_MS);
        }, H_STEP_MS);
      }, H_STEP_MS);
    }

    if ('IntersectionObserver' in window) {
      var hStarted = false;
      var hIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !hStarted) {
            hStarted = true;
            // The very first measureHDividers() call above ran while B's
            // whole diagram section was still hidden (A shown by default),
            // so getBoundingClientRect() on every circle returned zeros —
            // re-measure now that it's actually visible and laid out.
            measureHDividers();
            hRunPass();
            hIo.disconnect();
          }
        });
      }, { threshold: 0.3 });
      hIo.observe(horizontalSteps);
    } else {
      measureHDividers();
      hRunPass();
    }
  }
})();
