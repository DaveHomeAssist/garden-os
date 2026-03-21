function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function showReadOnlySheet(container, {
  id,
  title,
  subtitle = '',
  bodyHtml = '',
  footerHtml = '',
  closeLabel = 'Close',
  onClose,
}) {
  const sheet = document.createElement('div');
  sheet.className = 'panel-sheet is-open read-only-sheet';
  sheet.id = id;
  sheet.innerHTML = `
    <div class="panel-handle"></div>
    <div class="palette-header read-only-sheet__header">
      <div>
        <div class="palette-title">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="read-only-sheet__subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <button type="button" class="palette-dismiss read-only-sheet__close" data-close="true" aria-label="${escapeHtml(closeLabel)}">&times;</button>
    </div>
    <div class="read-only-sheet__body">${bodyHtml}</div>
    ${footerHtml ? `<div class="read-only-sheet__footer">${footerHtml}</div>` : ''}
  `;

  sheet.addEventListener('click', (event) => {
    if (event.target.closest('[data-close="true"]')) {
      sheet.classList.remove('is-open');
      setTimeout(() => {
        sheet.remove();
        onClose?.();
      }, 260);
    }
  });

  container.innerHTML = '';
  container.appendChild(sheet);
  return sheet;
}

export { escapeHtml };
