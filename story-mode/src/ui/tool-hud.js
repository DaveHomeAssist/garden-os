function isInteractiveField(target) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function createShell() {
  const root = document.createElement('div');
  root.className = 'tool-hud';
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', 'Garden tools');
  root.setAttribute('aria-hidden', 'true');
  root.hidden = true;
  return root;
}

function createToolSlot(tool, index) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tool-hud__slot';
  button.dataset.toolId = tool.id;
  button.title = tool.label;
  button.setAttribute('aria-label', `${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`);

  const icon = document.createElement('span');
  icon.className = 'tool-hud__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = tool.icon ?? '•';

  const shortcut = document.createElement('span');
  shortcut.className = 'tool-hud__shortcut';
  shortcut.setAttribute('aria-hidden', 'true');
  shortcut.textContent = tool.shortcut ?? String(index + 1);

  button.append(icon, shortcut);
  return button;
}

export class ToolHUD {
  constructor(container, inputManager, store, { onSelect } = {}) {
    this.container = container;
    this.inputManager = inputManager;
    this.store = store;
    this.onSelect = typeof onSelect === 'function' ? onSelect : null;
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

  selectTool(toolId, { silent = false } = {}) {
    if (!this.tools.some((tool) => tool.id === toolId)) {
      return null;
    }
    const previousToolId = this.selectedToolId;
    this.selectedToolId = toolId;
    this.syncSelection();
    const selectedTool = this.getSelectedTool();
    if (!silent && selectedTool && previousToolId !== toolId) {
      this.onSelect?.(selectedTool);
    }
    return selectedTool;
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    this.root.hidden = !this.visible;
    this.root.classList.toggle('is-visible', this.visible);
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
    this.root.replaceChildren();
    this.buttons.clear();

    this.tools.forEach((tool, index) => {
      const button = createToolSlot(tool, index);
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
      button.classList.toggle('is-selected', selected);
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
          const timeEl = document.createElement('span');
          timeEl.className = 'tool-hud__cooldown-time';
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
