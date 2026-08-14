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
  if (pvSwitch) {
    var pvBlocks = Array.prototype.slice.call(document.querySelectorAll('.pv-block'));
    pvSwitch.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-pv-switch]');
      if (!btn) return;
      var version = btn.getAttribute('data-pv-switch');
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
      setWorkspaceMethod(method);
      setConnectMethod(method);
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
    'More MCP Clients...': 'assets/hero/logo/claude-icon.svg',
    'ChatGPT Codex': 'assets/hero/logo/codex-icon.svg',
    'n8n': 'assets/hero/logo/n8n-icon.svg',
    'VS Code Copilot': 'assets/hero/logo/github-copilot-icon.svg'
  };

  var MCP_TABS = ['Beauty brand', 'Skincare retail', 'Fashion e-commerce', 'Jewelry retail', 'Brand marketing', 'Creative agency'];
  var SKILL_TABS = ['Skin Analysis Expert', 'Facial Consultant', 'Beauty Advisor', 'Hair Advisor', 'Hair Diagnostics', 'Clothes Try-on Studio'];

  var USE_CASES = {
    'Beauty brand': {
      photos: ['assets/workspace/img-visual-asset-badge.png', 'assets/workspace/img-visual-asset-badge1.png'],
      prompt: 'Create a personalized lipstick preview for this shopper using our soft coral shade.',
      status: 'More MCP Clients...',
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
      photos: ['assets/workspace/img-visual-asset-badge.png', 'assets/workspace/img-visual-asset-badge1.png'],
      prompt: 'Turn this approved key visual into a five-second social promo.',
      status: 'n8n',
      description: "I'll add controlled motion to the approved visual and prepare a short-form asset suitable for a client campaign.",
      toolBadge: 'Used AI Video Generator',
      outcomeTitle: 'The five-second social promo is ready for agency review.',
      bullets: ['Approved subject and composition preserved', 'Subtle push-in and lighting motion added', 'Duration optimized for short-form placement'],
      footerNote: "The resulting clip can move directly into the team's review and delivery workflow.",
      result: 'assets/workspace/img-right-preview-workspace.png'
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
      status: 'More MCP Clients...',
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
      result: 'assets/workspace/usecases/clothes-tryon-studio-result.jpg'
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
    if (statusIcon) statusIcon.src = STATUS_ICONS[data.status] || STATUS_ICONS['More MCP Clients...'];
    if (statusLabel) statusLabel.textContent = data.status;

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

    var resultImg = document.getElementById('wsResultImage');
    if (resultImg) resultImg.src = data.result;

    var resultCaptionEl = document.getElementById('wsResultCaption');
    if (resultCaptionEl) resultCaptionEl.textContent = data.toolBadge;
  }

  function setActiveUseCase(key) {
    if (!workspaceTabsEl) return;
    workspaceTabsEl.querySelectorAll('.workspace__tab').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-usecase') === key);
    });
    renderUseCaseContent(key);
    if (replayDemo) replayDemo(); // replay the reveal story from the top for the new content
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
    renderUseCaseContent(tabKeys[0]);
    if (replayDemo) replayDemo();
  }

  /* ---------------- "Two ways to connect" cards: also swap with the method ----------------
     MCP mode shows the 3 domain-server cards; Agent Skill mode shows the 6
     ready-made skills from Figma node 16915:145367. ---------------- */
  var CONNECT_TITLES = {
    mcp: {
      h2: 'Three MCPs, one API key',
      p: 'Each MCP server groups YouCam API tools by domain. Connect only the server your agent needs, or add all three using the same API key.'
    },
    skill: {
      h2: 'Ready-made Agent Skills',
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
      desc: 'Remove background from photo with impeccable accuracy, ensuring the high quality of images.',
      pills: ['Skin, Face &amp; Body', 'Beauty', 'Hair &amp; Beard'],
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

  function renderConnectCards(method) {
    var titles = CONNECT_TITLES[method] || CONNECT_TITLES.mcp;
    if (connectTitleH2) connectTitleH2.innerHTML = titles.h2;
    if (connectTitleP) connectTitleP.innerHTML = titles.p;

    if (!connectCardsGrid) return;
    var cards = method === 'skill' ? SKILL_CONNECT_CARDS : MCP_CONNECT_CARDS;
    connectCardsGrid.innerHTML = cards.map(function (card) {
      var imgs = card.images.map(function (src, i) {
        var style = i === 0 ? 'object-fit:contain;' : 'position:absolute; inset:0;';
        return '<img src="' + src + '" alt="" style="' + style + '">';
      }).join('');
      var tag = card.tag ? '<span class="connect-card__tag">' + card.tag + '</span>' : '';
      var pills = card.pills.map(function (p) { return '<span class="pill">' + p + '</span>'; }).join('');
      return (
        '<article class="connect-card">' +
          '<div class="connect-card__thumb">' + imgs + '</div>' +
          tag +
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
  var DIAGRAM_STEPS = {
    mcp: [
      { title: 'Add the connector', desc: 'Paste the selected MCP configuration into your client.' },
      { title: 'Add your API key', desc: 'Get a <span class="accent">Bearer</span> key from the API Console, then add it to your MCP configuration or set <span class="accent">YOUCAM_API_KEY</span> for Agent Skills.', btn: 'GET FREE API KEY' },
      { title: 'Call it from chat', desc: 'Ask in plain English; your agent selects the right tool and returns structured results.' }
    ],
    skill: [
      { title: 'Install the YouCam skills', desc: 'Run <span class="accent">npx skills add youcam</span> to install the complete skill collection.' },
      { title: 'Add your API key', desc: 'Get a <span class="accent">Bearer</span> key from the API Console, then add it to your MCP configuration or set <span class="accent">YOUCAM_API_KEY</span> for Agent Skills.', btn: 'OPEN API CONSOLE →' },
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
  function buildMcpConfig(domainKey) {
    var d = DOMAINS[domainKey] || DOMAINS.beauty;
    return '{\n' +
      '  "mcpServers": {\n' +
      '    "' + d.server + '": {\n' +
      '      "command": "npx",\n' +
      '      "args": [\n' +
      '        "-y", "mcp-remote",\n' +
      '        "https://mcp-api-01.youcamapi.com/mcp/' + d.slug + '",\n' +
      '        "--header", "Authorization:${AUTH}"\n' +
      '      ],\n' +
      '      "env": {\n' +
      '        "AUTH": "Bearer YOUR_API_KEY"\n' +
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
        item.classList.toggle('is-active', item === btn);
      });
      if (terminalId) {
        var pre = document.getElementById(terminalId);
        if (pre) pre.textContent = buildMcpConfig(btn.getAttribute('data-domain'));
      }
    });
  });

  // Client logos (Claude / GitHub Copilot / n8n / Cursor / Codex) in the
  // terminal header: the active one gets swapped to the white-pill treatment
  // in CSS. The JSON body stays keyed to whichever domain is active.
  var mcpClientSwitch = document.getElementById('mcpClientSwitch');
  if (mcpClientSwitch) {
    mcpClientSwitch.addEventListener('click', function (e) {
      var btn = e.target.closest('.terminal__logo');
      if (!btn) return;
      mcpClientSwitch.querySelectorAll('.terminal__logo').forEach(function (t) {
        t.classList.toggle('is-active', t === btn);
      });
      var client = CLIENTS[btn.getAttribute('data-client')];
      // Only clients that shell out to `npx mcp-remote` locally need a
      // Node.js/npm runtime; others run the connection through their own host.
      var footerStatus = document.getElementById('mcpFooterStatus');
      if (client && footerStatus) footerStatus.style.display = client.requiresNode ? '' : 'none';
    });
  }


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
    var items = [
      { label: 'Skin Analysis', file: 'Skin Analysis' },
      { label: 'Makeup Transfer', file: 'Makeup Transfer' },
      { label: 'Image Generation', file: 'Image Generation', videoExt: null },
      { label: 'Video Generation', file: 'Video Generation' },
      { label: 'Clothes VTO', file: 'Clothes VTO' },
      { label: 'Hair VTO', file: 'Hair VTO' },
      { label: 'Reshape', file: 'Reshape' },
      { label: 'Image Edit', file: 'Image Edit', videoExt: null },
      { label: 'Jewelry Try-On', file: 'AR Bracelet-topbanner-pd', posterFile: 'AR Bracelet-topbanner-pd-0' }
    ];
    var html = items.map(function (item) {
      var poster = 'assets/showcase/' + encodeURIComponent((item.posterFile || item.file) + '.jpg');
      var hasVideo = item.videoExt !== null;
      var media = hasVideo
        ? '<video class="showcase-card__media" muted loop playsinline preload="none" poster="' + poster + '">' +
            '<source data-src="' + 'assets/showcase/' + encodeURIComponent(item.file + '.mp4') + '" type="video/mp4">' +
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
    var revealItems = Array.prototype.slice.call(demoCard.querySelectorAll('.reveal-item'));
    var typingEl = document.getElementById('workspaceTyping');
    var groups = {};
    revealItems.forEach(function (el) {
      var key = el.getAttribute('data-reveal');
      (groups[key] = groups[key] || []).push(el);
    });
    var stepKeys = Object.keys(groups).sort(function (a, b) { return Number(a) - Number(b); });

    // The chat log now has its own scrollbar (card height is capped to a
    // share of the viewport), so as each reply piece appears, follow it down
    // like a real chat — but only scroll as far as needed to bring it fully
    // into view, not all the way to the bottom every time.
    var chatLog = demoCard.querySelector('.workspace-card__left');
    function scrollNewestIntoView(el) {
      if (!chatLog || !el) return;
      var elRect = el.getBoundingClientRect();
      var logRect = chatLog.getBoundingClientRect();
      var overflowBelow = elRect.bottom - logRect.bottom;
      if (overflowBelow > 0) {
        chatLog.scrollTo({ top: chatLog.scrollTop + overflowBelow + 16, behavior: 'smooth' });
      }
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
        revealItems.forEach(function (el) { el.classList.remove('is-visible'); });
        if (typingEl) typingEl.classList.remove('is-visible');
        if (chatLog) chatLog.scrollTop = 0; // start each replay back at the top

        var t = 400;
        var STEP_GAP = 550;
        var THINK_DURATION = 900;
        // .reveal-item's own translateY(10px) → translateY(0) transition takes
        // this long to settle — reading getBoundingClientRect() any earlier
        // catches it mid-transition, so the scroll target undershoots by
        // however many px are left to settle, then the layout "jumps" that
        // last bit into place a moment after we already stopped scrolling.
        var REVEAL_SETTLE_MS = 500;

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
            // Follow the last (bottom-most) element of this step down into
            // view — delayed until its own reveal transition has settled.
            schedule(function () {
              scrollNewestIntoView(groups[key][groups[key].length - 1]);
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
     Plays once per page load, the moment the cards first scroll into view —
     scrolling away and back does NOT replay it (only a fresh page load does),
     per request. Eased fast-to-slow (ease-out) rather than linear counting. ---------------- */
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
})();
