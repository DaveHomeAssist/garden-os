/**
 * Data Loader — imports canonical specs at build time via Vite.
 * No runtime fetch needed. Works offline.
 */
import cropData from 'specs/CROP_SCORING_DATA.json';
import eventDeck from 'specs/EVENT_DECK.json';
import dialogueData from 'specs/DIALOGUE_ENGINE.json';

export { cropData, eventDeck, dialogueData };
