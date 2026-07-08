import {
  PLAYER_PROFILE_OPTIONS,
  getPlayerProfilePalette,
  normalizePlayerProfile,
} from '../data/player-profile.js';
import { escapeHtml } from './read-only-sheet.js';

function renderAvatar(profile) {
  const palette = getPlayerProfilePalette(profile);
  return `
    <div class="profile-avatar" style="
      --avatar-skin:${escapeHtml(palette.skinCss)};
      --avatar-hair:${escapeHtml(palette.hairCss)};
      --avatar-shirt:${escapeHtml(palette.shirtCss)};
      --avatar-apron:${escapeHtml(palette.apronCss)};
      --avatar-pants:${escapeHtml(palette.pantsCss)};
      --avatar-hat:${escapeHtml(palette.hatCss)};
    " aria-hidden="true">
      <span class="profile-avatar__shadow"></span>
      <span class="profile-avatar__legs"></span>
      <span class="profile-avatar__body"></span>
      <span class="profile-avatar__apron"></span>
      <span class="profile-avatar__head"></span>
      <span class="profile-avatar__hair"></span>
      <span class="profile-avatar__hat"></span>
    </div>
  `;
}

function renderOptionButton(group, option, selectedId) {
  const selected = option.id === selectedId;
  const color = option.color ?? option.shirtColor ?? '#e8c84a';
  return `
    <button
      type="button"
      class="profile-choice${selected ? ' is-selected' : ''}"
      data-profile-choice="${escapeHtml(group)}"
      data-profile-value="${escapeHtml(option.id)}"
      aria-pressed="${selected ? 'true' : 'false'}"
    >
      <span class="profile-choice__swatch" style="--choice-color:${escapeHtml(color)}"></span>
      <span>${escapeHtml(option.label)}</span>
    </button>
  `;
}

function renderChoiceGroup(label, group, profile) {
  return `
    <fieldset class="profile-fieldset">
      <legend>${escapeHtml(label)}</legend>
      <div class="profile-choice-grid" data-profile-group="${escapeHtml(group)}">
        ${PLAYER_PROFILE_OPTIONS[group].map((option) => renderOptionButton(group, option, profile[group])).join('')}
      </div>
    </fieldset>
  `;
}

function createPlayerProfileEditor({
  initialProfile,
  title = 'Gardener Profile',
  subtitle = 'Choose who is tending the bed.',
  submitLabel = 'Save Profile',
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
} = {}) {
  let profile = normalizePlayerProfile(initialProfile);
  const root = document.createElement('form');
  root.className = 'profile-editor';
  root.noValidate = true;

  function render() {
    root.innerHTML = `
      <div class="profile-editor__top">
        <div>
          <div class="profile-editor__eyebrow">Gardener Setup</div>
          <h2 class="profile-editor__title">${escapeHtml(title)}</h2>
          <p class="profile-editor__subtitle">${escapeHtml(subtitle)}</p>
        </div>
        ${renderAvatar(profile)}
      </div>

      <label class="profile-name-field">
        <span>Name</span>
        <input
          type="text"
          name="displayName"
          value="${escapeHtml(profile.displayName)}"
          maxlength="24"
          autocomplete="off"
          spellcheck="false"
        />
      </label>

      ${renderChoiceGroup('Skin', 'skinTone', profile)}
      ${renderChoiceGroup('Hair', 'hair', profile)}
      ${renderChoiceGroup('Clothes', 'outfit', profile)}

      <div class="profile-editor__actions">
        <button type="submit" class="save-slot-btn save-slot-btn--primary">${escapeHtml(submitLabel)}</button>
        ${onCancel ? `<button type="button" class="save-slot-btn" data-profile-cancel="true">${escapeHtml(cancelLabel)}</button>` : ''}
      </div>
    `;
  }

  function updateFromInput() {
    const input = root.querySelector('input[name="displayName"]');
    profile = normalizePlayerProfile({
      ...profile,
      displayName: input?.value ?? profile.displayName,
    });
  }

  root.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-profile-choice]');
    if (choice) {
      updateFromInput();
      profile = normalizePlayerProfile({
        ...profile,
        [choice.dataset.profileChoice]: choice.dataset.profileValue,
      });
      render();
      root.querySelector(`[data-profile-choice="${choice.dataset.profileChoice}"][data-profile-value="${choice.dataset.profileValue}"]`)?.focus();
      return;
    }

    if (event.target.closest('[data-profile-cancel="true"]')) {
      onCancel?.();
    }
  });

  root.addEventListener('submit', (event) => {
    event.preventDefault();
    updateFromInput();
    onSubmit?.(profile);
  });

  render();

  return {
    element: root,
    focus() {
      root.querySelector('input[name="displayName"]')?.focus();
    },
    getProfile() {
      updateFromInput();
      return normalizePlayerProfile(profile);
    },
  };
}

export {
  createPlayerProfileEditor,
};
