/**
 * Cleans German-specific characters from a string.
 * @param {string} text The input text.
 * @returns {string} The cleaned text.
 */
export function cleanGermanCharacters(text) {
    if (!text) return "";
    return text.replace(/ß/g, 'ss');
}

/**
 * Fetches a prompt from a file, using a cache to avoid re-fetching.
 * @param {string} type The type of prompt to fetch (corresponds to filename).
 * @param {object} cache The cache object to store and retrieve prompts.
 * @returns {Promise<string|null>} The prompt text or null if failed.
 */
export async function fetchPromptForType(type, cache) {
    if (cache[type]) return cache[type];
    try {
        const response = await fetch(`./prompts/${type}.md`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        cache[type] = text;
        return text;
    } catch (e) {
        alert(`Konnte Prompt für "${type}" nicht laden. Stellen Sie sicher, dass die Datei /prompts/${type}.md existiert und Sie die Seite über einen lokalen Webserver ausführen.`);
        return null;
    }
}

/**
 * Assembles the full prompt to be sent to the LLM.
 * @param {string} basePrompt The base instruction from the prompt file.
 * @param {object} context An object containing language, zielniveau, goals, and text.
 * @returns {string} The complete prompt string.
 */
export function assembleFullPrompt(basePrompt, context) {
    const { language, zielniveau, goals, text } = context;
    return `${basePrompt}\n\n## CONTEXT ##\nLanguage: ${language}\nZielniveau: ${zielniveau}\nLearning Goals: """${goals || 'Keine spezifischen Lernziele vorgegeben.'}"""\n\n## MATERIAL ##\n"""${text}"""`;
}

/**
 * Saves API keys to local storage if the user has opted in.
 * @param {boolean} shouldSave A boolean indicating if keys should be saved.
 */
export function saveApiKeys(shouldSave) {
    if (shouldSave) {
        const keys = {
            google: document.getElementById('google_api_key').value,
            openai: document.getElementById('openai_api_key').value,
            deepseek: document.getElementById('deepseek_api_key').value,
        };
        localStorage.setItem('apiKeys', JSON.stringify(keys));
        localStorage.setItem('saveApiKeysPreference', 'true');
    }
}

/**
 * Loads API keys from local storage on page load.
 */
export function loadApiKeys() {
    const preference = localStorage.getItem('saveApiKeysPreference');
    if (preference !== 'true') return false;

    const savedKeys = JSON.parse(localStorage.getItem('apiKeys') || '{}');
    if (savedKeys.google) document.getElementById('google_api_key').value = savedKeys.google;
    if (savedKeys.openai) document.getElementById('openai_api_key').value = savedKeys.openai;
    if (savedKeys.deepseek) document.getElementById('deepseek_api_key').value = savedKeys.deepseek;
    return true; // Return true if preference was set
}