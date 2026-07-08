const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

const PLAYER_PROFILE_OPTIONS = {
  skinTone: [
    { id: 'warm', label: 'Warm', color: '#d8b08c', value: 0xd8b08c },
    { id: 'olive', label: 'Olive', color: '#b9875f', value: 0xb9875f },
    { id: 'brown', label: 'Brown', color: '#8f5f3d', value: 0x8f5f3d },
    { id: 'deep', label: 'Deep', color: '#5b3828', value: 0x5b3828 },
  ],
  hair: [
    { id: 'softBrown', label: 'Brown', color: '#3b2c20', value: 0x3b2c20 },
    { id: 'silver', label: 'Silver', color: '#c8c0b2', value: 0xc8c0b2 },
    { id: 'black', label: 'Black', color: '#17120f', value: 0x17120f },
    { id: 'auburn', label: 'Auburn', color: '#7a3324', value: 0x7a3324 },
  ],
  outfit: [
    {
      id: 'gardenApron',
      label: 'Garden Apron',
      shirtColor: '#7f9a62',
      apronColor: '#c9b072',
      pantsColor: '#4a5b76',
      hatColor: '#6d4d33',
      shirtValue: 0x7f9a62,
      apronValue: 0xc9b072,
      pantsValue: 0x4a5b76,
      hatValue: 0x6d4d33,
    },
    {
      id: 'sunShirt',
      label: 'Sun Shirt',
      shirtColor: '#d59046',
      apronColor: '#78955c',
      pantsColor: '#3c4f45',
      hatColor: '#b88a4a',
      shirtValue: 0xd59046,
      apronValue: 0x78955c,
      pantsValue: 0x3c4f45,
      hatValue: 0xb88a4a,
    },
    {
      id: 'workDenim',
      label: 'Work Denim',
      shirtColor: '#5d7894',
      apronColor: '#a36e45',
      pantsColor: '#253848',
      hatColor: '#7b6041',
      shirtValue: 0x5d7894,
      apronValue: 0xa36e45,
      pantsValue: 0x253848,
      hatValue: 0x7b6041,
    },
  ],
};

const DEFAULT_PLAYER_PROFILE = {
  displayName: 'Mom',
  skinTone: 'warm',
  hair: 'softBrown',
  outfit: 'gardenApron',
};

function findOption(group, id) {
  return PLAYER_PROFILE_OPTIONS[group]?.find((entry) => entry.id === id)
    ?? PLAYER_PROFILE_OPTIONS[group]?.[0]
    ?? null;
}

function sanitizeDisplayName(value) {
  const cleaned = String(value ?? '')
    .replace(CONTROL_CHARS, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
  return cleaned || DEFAULT_PLAYER_PROFILE.displayName;
}

function normalizePlayerProfile(profile = {}) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    displayName: sanitizeDisplayName(source.displayName),
    skinTone: findOption('skinTone', source.skinTone)?.id ?? DEFAULT_PLAYER_PROFILE.skinTone,
    hair: findOption('hair', source.hair)?.id ?? DEFAULT_PLAYER_PROFILE.hair,
    outfit: findOption('outfit', source.outfit)?.id ?? DEFAULT_PLAYER_PROFILE.outfit,
  };
}

function isDefaultMomProfile(profile = {}) {
  const normalized = normalizePlayerProfile(profile);
  return normalized.displayName.toLowerCase() === DEFAULT_PLAYER_PROFILE.displayName.toLowerCase();
}

function getPlayerProfilePalette(profile = {}) {
  const normalized = normalizePlayerProfile(profile);
  const skin = findOption('skinTone', normalized.skinTone);
  const hair = findOption('hair', normalized.hair);
  const outfit = findOption('outfit', normalized.outfit);
  return {
    skin: skin?.value ?? 0xd8b08c,
    skinCss: skin?.color ?? '#d8b08c',
    hair: hair?.value ?? 0x3b2c20,
    hairCss: hair?.color ?? '#3b2c20',
    shirt: outfit?.shirtValue ?? 0x7f9a62,
    shirtCss: outfit?.shirtColor ?? '#7f9a62',
    apron: outfit?.apronValue ?? 0xc9b072,
    apronCss: outfit?.apronColor ?? '#c9b072',
    pants: outfit?.pantsValue ?? 0x4a5b76,
    pantsCss: outfit?.pantsColor ?? '#4a5b76',
    hat: outfit?.hatValue ?? 0x6d4d33,
    hatCss: outfit?.hatColor ?? '#6d4d33',
  };
}

function possessiveName(name) {
  const clean = sanitizeDisplayName(name);
  return clean.endsWith('s') ? `${clean}'` : `${clean}'s`;
}

function getPlayerNarrativeLabels(profile = {}) {
  const normalized = normalizePlayerProfile(profile);
  const defaultMom = isDefaultMomProfile(normalized);
  return {
    playerName: normalized.displayName,
    playerPossessive: possessiveName(normalized.displayName),
    sauceLabel: defaultMom ? "Mom's Sauce" : `${possessiveName(normalized.displayName)} Sauce`,
    recipeLabel: defaultMom ? "Mom's recipe" : 'your sauce recipe',
    backyardLabel: defaultMom ? "Mom's Backyard" : `${possessiveName(normalized.displayName)} Backyard`,
    householdLabel: defaultMom ? 'the house' : 'your household',
    returningGardener: defaultMom ? 'Mom' : normalized.displayName,
  };
}

function getCampaignPlayerProfile(campaignOrProfile = {}) {
  return normalizePlayerProfile(campaignOrProfile?.playerProfile ?? campaignOrProfile);
}

function resolvePlayerText(text, campaignOrProfile = {}) {
  const labels = getPlayerNarrativeLabels(getCampaignPlayerProfile(campaignOrProfile));
  return String(text ?? '').replace(/\{(playerName|playerPossessive|sauceLabel|recipeLabel|backyardLabel|householdLabel|returningGardener)\}/g, (_match, key) => labels[key]);
}

function getProfileRecipeName(recipeId, fallbackName, campaignOrProfile = {}) {
  if (recipeId === 'moms_sauce') {
    return getPlayerNarrativeLabels(getCampaignPlayerProfile(campaignOrProfile)).sauceLabel;
  }
  return fallbackName ?? recipeId;
}

export {
  DEFAULT_PLAYER_PROFILE,
  PLAYER_PROFILE_OPTIONS,
  getCampaignPlayerProfile,
  getPlayerNarrativeLabels,
  getPlayerProfilePalette,
  getProfileRecipeName,
  isDefaultMomProfile,
  normalizePlayerProfile,
  resolvePlayerText,
};
