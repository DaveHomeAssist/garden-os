function isInteractiveField(target) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isCoarsePointer() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function createShell() {
  const root = document.createElement('div');
  root.className = 'tool-hud';
  root.style.position = 'absolute';
  root.style.left = '50%';
  root.style.bottom = 'calc(16px + env(safe-area-inset-bottom, 0px))';
  root.style.transform = 'translateX(-50%)';
  root.style.display = 'flex';
  root.style.alignItems = 'center';
  root.style.gap = '10px';
  root.style.padding = '10px 12px';
  root.style.borderRadius = '18px';
  root.style.background = 'rgba(26, 18, 12, 0.68)';
  root.style.border = '1px solid rgba(247, 242, 234, 0.08)';
  root.style.boxShadow = '0 20px 44px rgba(0, 0, 0, 0.28)';
  root.style.backdropFilter = 'blur(12px)';
  root.style.zIndex = '22';
  root.style.pointerEvents = 'none';
  root.style.transition = 'opacity 150ms ease, transform 150ms ease';
  root.style.opacity = '0';
  root.hidden = true;
  return root;
}

function applyButtonStyles(button, selected) {
  const size = isCoarsePointer() ? 56 : 48;
  button.style.position = 'relative';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.width = `${size}px`;
  button.style.height = `${size}px`;
  button.style.borderRadius = '8px';
  button.style.border = selected
    ? '1px solid #e8c84a'
    : '1px solid rgba(247, 242, 234, 0.08)';
  button.style.background = selected
    ? 'rgba(92, 61, 30, 0.92)'
    : 'rgba(92, 61, 30, 0.84)';
  button.style.color = 'var(--cream, #f7f2ea)';
  button.style.fontSize = isCoarsePointer() ? '1.3rem' : '1.1rem';
  button.style.lineHeight = '1';
  button.style.cursor = 'pointer';
  button.style.pointerEvents = 'auto';
  button.style.transition = 'transform 150ms ease, border-color 150ms ease, background 150ms ease';
  button.style.transform = selected ? 'scale(1.1)' : 'scale(1)';
  button.style.outline = 'none';
}

export class ToolHUD {
  constructor(container, inputManager, store) {
    this.container = container;
    this.inputManager = inputManager;
    this.store = store;
    this.tools = [];
    this.buttons = new Map();
    this.selectedToolId = null;
    this.visible = false;
    this.root = createShell();
    this.container.append(this.root);

    this.inputManager.registerAction('tool_slot_1', { keys: ['1'] });
    this.inputManager.registerAction('tool_slot_2', { keys: ['2'] });
    this.inputManager.registerAction('tool_slot_3', { keys: ['3'] });
    this.inputManager.registerAction('tool_slot_4', { keys: ['4'] });
    this.inputManager.registerAction('tool_slot_5', { keys: ['5'] });
    this.inputManager.registerAction('tool_slot_6', { keys: ['6'] });

    this.disposers = [
      this.inputManager.on('next_tool', (payload) => {
        if (!this.visible || isInteractiveField(payload.event?.target)) return;
        payload.preventDefault();
        this.selectRelative(1);
      }),
      this.inputManager.on('prev_tool', (payload) => {
        if (!this.visible || isInteractiveField(payload.event?.target)) return;
        payload.preventDefault();
        this.selectRelative(-1);
      }),
    ];

    for (let index = 0; index < 6; index += 1) {
      const actionName = `tool_slot_${index + 1}`;
      this.disposers.push(this.inputManager.on(actionName, (payload) => {
        if (!this.visible || isInteractiveField(payload.event?.target)) return;
        payload.preventDefault();
        const tool = this.tools[index];
        if (tool) {
          this.selectTool(tool.id);
        }
      }));
    }
  }

  setTools(tools) {
    this.tools = Array.isArray(tools) ? [...tools] : [];
    if (!this.tools.some((tool) => tool.id === this.selectedToolId)) {
      this.selectedToolId = this.tools[0]?.id ?? null;
    }
    this.render();
  }

  getSelectedTool() {
    return this.tools.find((tool) => tool.id === this.selectedToolId) ?? null;
  }

  selectTool(toolId) {
    if (!this.tools.some((tool) => tool.id === toolId)) {
      return null;
    }
    this.selectedToolId = toolId;
    this.syncSelection();
    return this.getSelectedTool();
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.root.hidden = !this.visible;
    this.root.style.opacity = this.visible ? '1' : '0';
    this.root.style.transform = this.visible
      ? 'translateX(-50%) translateY(0)'
      : 'translateX(-50%) translateY(8px)';
    this.root.setAttribute('aria-hidden', this.visible ? 'false' : 'true');
  }

  dispose() {
    this.disposers.forEach((dispose) => dispose?.());
    this.disposers.length = 0;
    this.buttons.clear();
    this.root.remove();
  }

  selectRelative(delta) {
    if (!this.tools.length) return;
    const currentIndex = Math.max(0, this.tools.findIndex((tool) => tool.id === this.selectedToolId));
    const nextIndex = (currentIndex + delta + this.tools.length) % this.tools.length;
    this.selectTool(this.tools[nextIndex].id);
  }

  render() {
    this.root.innerHTML = '';
    this.buttons.clear();

    this.tools.forEach((tool, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tool-hud__slot';
      button.dataset.toolId = tool.id;
      button.title = tool.label;
      button.setAttribute('aria-label', `${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`);
      button.setAttribute('aria-pressed', tool.id === this.selectedToolId ? 'true' : 'false');
      button.innerHTML = `
        <span aria-hidden="true">${tool.icon ?? '•'}</span>
        <span
          aria-hidden="true"
          style="position:absolute;top:5px;right:5px;font-family:'DM Mono', ui-monospace, monospace;font-size:10px;color:rgba(247,242,234,0.62);line-height:1;"
        >${tool.shortcut ?? index + 1}</span>
      `;
      applyButtonStyles(button, tool.id === this.selectedToolId);
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectTool(tool.id);
      });
      this.root.append(button);
      this.buttons.set(tool.id, button);
    });

    this.syncSelection();
  }

  syncSelection() {
    this.buttons.forEach((button, toolId) => {
      const selected = toolId === this.selectedToolId;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      applyButtonStyles(button, selected);
    });
  }

  /**
   * Overlay a live countdown on any tool button whose cooldown has not expired.
   * Call every frame. Pass the highlighted cell index so per-cell cooldowns are
   * matched correctly; pass null when no cell is highlighted (shows the max
   * remaining cooldown for that tool across all cells).
   *
   * @param {Record<string,number>} toolCooldowns  state.season.toolCooldowns
   * @param {number|null}           cellIndex       currently highlighted cell or null
   * @param {number}                [now]           current timestamp (ms)
   */
  syncCooldowns(toolCooldowns = {}, cellIndex = null, now = Date.now()) {
    this.buttons.forEach((button, toolId) => {
      let cooldownUntil = 0;

      if (cellIndex !== null) {
        cooldownUntil = toolCooldowns[`${toolId}_${cellIndex}`] ?? 0;
      } else {
        // No cell targeted — surface the longest active cooldown for this tool
        const prefix = `${toolId}_`;
        for (const [key, until] of Object.entries(toolCooldowns)) {
          if (key.startsWith(prefix) && until > cooldownUntil) {
            cooldownUntil = until;
          }
        }
      }

      const remaining = Math.max(0, cooldownUntil - now);
      const onCooldown = remaining > 0;
      let overlay = button.querySelector('.tool-hud__cooldown');

      if (onCooldown) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'tool-hud__cooldown';
          overlay.setAttribute('aria-hidden', 'true');
          overlay.style.cssText = [
            'position:absolute;inset:0;border-radius:7px',
            'background:rgba(10,6,3,0.60)',
            'display:flex;align-items:center;justify-content:center',
            'pointer-events:none',
          ].join(';');
          const timeEl = document.createElement('span');
          timeEl.className = 'tool-hud__cooldown-time';
          timeEl.style.cssText = [
            "font-family:'DM Mono',ui-monospace,monospace",
            'font-size:11px;color:#f7f2ea;line-height:1',
          ].join(';');
          overlay.append(timeEl);
          button.append(overlay);
        }
        overlay.querySelector('.tool-hud__cooldown-time').textContent = `${Math.ceil(remaining / 1000)}s`;
      } else if (overlay) {
        overlay.remove();
      }
    });
  }
}
