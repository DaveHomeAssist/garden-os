// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCutsceneMachine } from './cutscene-machine.js';
import { createDialoguePanel } from '../ui/dialogue-panel.js';

// Lila's offer: greeting with "New request" -> offer line with "I'll do it" / "Not right now".
function offerScene(accept) {
  return {
    id: 'quest_talk:lila', priority: 1, skippable: true,
    beats: [{ speaker: 'lila', text: "The kitchen's not open yet.", choices: [{ label: 'New request: Fresh Basil, Please', branchId: 'offer' }, { label: 'Goodbye', branchId: 'farewell' }] }],
    branches: {
      offer: [{ speaker: 'lila', text: 'I need basil. Three bunches. And I mean fresh.', choices: [{ label: "I'll do it", effect: { run: accept }, branchId: 'accepted' }, { label: 'Not right now', branchId: 'farewell' }] }],
      accepted: [{ speaker: 'narrator', text: 'Quest accepted: Fresh Basil, Please.' }],
      farewell: [{ speaker: 'lila', text: 'See you.' }],
    },
  };
}

describe('quest offer with the keyboard (Space)', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('finishing the offer line early still shows its choices instead of closing the scene', () => {
    vi.useFakeTimers();
    const accept = vi.fn();
    const onFinish = vi.fn();
    const machine = createCutsceneMachine({ onStateChange: () => {}, onFinish, onEffect: (e) => e.run?.() });
    machine.start(offerScene(accept), {});
    vi.runAllTimers();
    expect(machine.hasChoices()).toBe(true);
    machine.selectChoice(0); // New request
    machine.next(); // Space while the offer is still typing: finish the line
    expect(machine.hasChoices()).toBe(true);
    machine.next(); // a second Space must not close the offer unanswered
    expect(onFinish).not.toHaveBeenCalled();
    expect(machine.hasChoices()).toBe(true);
    machine.selectChoice(0); // I'll do it
    expect(accept).toHaveBeenCalledTimes(1);
  });

  it('Space on a focused choice does not also reach the global "next line" key', () => {
    document.body.innerHTML = '<div id="cutscene-layer"><div id="dialogue-root"></div></div>';
    const panel = createDialoguePanel(document.getElementById('dialogue-root'));
    const handler = vi.fn();
    panel.setChoiceHandler(handler);
    panel.render({ visible: true, speaker: 'lila', speakerName: 'Lila', textVisible: 'Hi', canAdvance: true, canSkip: true, beatIndex: 0, beatCount: 1, choices: [{ label: 'New request' }, { label: 'Goodbye' }], selectedChoiceIndex: 0 });
    const globalNext = vi.fn();
    document.addEventListener('keydown', globalNext);
    const button = document.querySelector('.dp-choice-btn');
    button.focus();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    document.removeEventListener('keydown', globalNext);
    expect(handler).toHaveBeenCalledWith(0);
    expect(globalNext).not.toHaveBeenCalled();
  });
});
