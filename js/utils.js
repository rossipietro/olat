/**
 * Cleans German-specific characters from a string.
 * @param {string} text The input text.
 * @returns {string} The cleaned text.
 */
export function cleanGermanCharacters(text) {
    if (!text) return "";
    return text.replace(/ß/g, 'ss');
}

// START: NEW DATA STORE FOR ZIELNIVEAU DESCRIPTIONS
/**
 * A store for the detailed descriptions of each target level (Zielniveau).
 */
export const ZIELNIVEAU_DESCRIPTIONS = {
    'A2': {
        title: '🟢 A2 (elementar / Primarstufe, frühe Sek I)',
        description: 'Verwende einfache Satzstrukturen und grundlegenden Wortschatz. Die Fragen sollen sich auf vertraute Alltagssituationen beziehen. Verwende visuelle Hilfen, wenn möglich. Halte die Fragen kurz und klar. Vermeide abstrakte Begriffe.'
    },
    'B1': {
        title: '🔵 B1 (untere Sek II, Berufsschule, Realschule)',
        description: 'Verwende alltagsnahes, aber anspruchsvolleres Vokabular. Die Fragen sollen einfache Schlussfolgerungen und erste Transferleistungen ermöglichen. Verwende konkrete Kontexte (z. B. Schule, Arbeit, Freizeit). Halte sprachliche Komplexität moderat.'
    },
    'B2': {
        title: '🟡 B2 (obere Sek II, Maturität, Bachelorbeginn)',
        description: 'Verwende akademisch orientierten Wortschatz und moderate sprachliche Komplexität. Die Fragen sollen analytisches und kritisches Denken fördern. Es sind auch hypothetische Szenarien erlaubt. Fremdwörter können vorkommen, aber sollten kontextuell erschließbar sein.'
    },
    'C1': {
        title: '🟠 C1 (Bachelor/Master, Hochschulreife)',
        description: 'Verwende komplexe Satzstrukturen und einen gehobenen, akademischen Sprachstil. Die Fragen sollen Argumentation, Bewertung und Synthese fördern. Die Lernenden sollen eigenständig Thesen entwickeln und verschiedene Perspektiven vergleichen können.'
    },
    'C2': {
        title: '🔴 C2 (Master/Expertenniveau)',
        description: 'Verwende präzise, abstrakte und komplexe Sprache. Die Fragen sollen kreative, originelle Denkprozesse anregen und fächerübergreifende Kompetenzen einbeziehen. Es wird ein hohes Maß an Autonomie und metakognitivem Denken vorausgesetzt.'
    }
};
// END: NEW DATA STORE

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

// START: UPDATED PROMPT ASSEMBLY FUNCTION
/**
 * Assembles the full prompt to be sent to the LLM.
 * @param {string} basePrompt The base instruction from the prompt file.
 * @param {object} context An object containing language, zielniveau, goals, and text.
 * @returns {string} The complete prompt string.
 */
export function assembleFullPrompt(basePrompt, context) {
    const { language, zielniveau, goals, text } = context;
    const niveauDescription = ZIELNIVEAU_DESCRIPTIONS[zielniveau]?.description || 'Kein spezifisches Niveau ausgewählt.';

    return `${basePrompt}\n\n## CONTEXT ##\nLanguage: ${language}\nLearning Goals: """${goals || 'Keine spezifischen Lernziele vorgegeben.'}"""\n\n## ZIELNIVEAU-ANWEISUNG ##\n${niveauDescription}\n\n## MATERIAL ##\n"""${text}"""`;
}
// END: UPDATED PROMPT ASSEMBLY FUNCTION

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

// === NEW FUNCTION TO FORMAT THE INLINE FIB OUTPUT ===

/**
 * Transforms the raw JSON string from an Inline FIB response into two formatted text blocks.
 * @param {string} rawJsonString The raw string output from the LLM.
 * @returns {string} The formatted text output, or an error message.
 */
export function formatInlineFibOutput(rawJsonString) {
    // 1. Clean and parse the JSON
    let data;
    try {
        // Extract content from markdown code block if present
        const match = rawJsonString.match(/```json\s*([\s\S]*?)\s*```/);
        const cleanString = match ? match[1] : rawJsonString;
        data = JSON.parse(cleanString);
    } catch (error) {
        console.error("JSON parsing failed:", error);
        return `Fehler: Ungültiges JSON-Format im Inline FIB Output.\n\nOriginal-Output:\n${rawJsonString}`;
    }

    const fibOutput = [];
    const icOutput = [];

    // Helper to shuffle arrays for the Inlinechoice options
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };

    // 2. Process each item in the JSON array
    data.forEach(item => {
        const { text = '', blanks = [], wrong_substitutes = [] } = item;
        const numBlanks = blanks.length;
        if (numBlanks === 0) return; // Skip items with no blanks

        // Create a version of the text with placeholders
        const placeholder = "||BLANK||";
        let tempText = text;
        blanks.forEach(blank => {
            // Use a regex to replace only the first occurrence to handle duplicate blank words
            tempText = tempText.replace(new RegExp(blank.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), placeholder, 1);
        });
        const textParts = tempText.split(placeholder);

        // --- Build FIB (Fill-In-the-Blank) Output ---
        const fibLines = [
            "Type\tFIB",
            "Title\t✏✏Vervollständigen Sie die Lücken mit dem korrekten Begriff.✏✏",
            `Points\t${numBlanks}`
        ];
        textParts.forEach((part, index) => {
            fibLines.push(`Text\t${part.trim()}`);
            if (index < blanks.length) {
                fibLines.push(`1\t${blanks[index]}\t20`);
            }
        });
        fibOutput.push(fibLines.join('\n'));

        // --- Build Inlinechoice Output ---
        const icLines = [
            "Type\tInlinechoice",
            "Title\tWörter einordnen",
            "Question\t✏✏Wählen Sie die richtigen Wörter.✏✏",
            `Points\t${numBlanks}`
        ];
        const allOptions = [...blanks, ...wrong_substitutes];
        shuffleArray(allOptions);
        const optionsStr = allOptions.join('|');

        textParts.forEach((part, index) => {
            icLines.push(`Text\t${part.trim()}`);
            if (index < blanks.length) {
                icLines.push(`1\t${optionsStr}\t${blanks[index]}\t|`);
            }
        });
        icOutput.push(icLines.join('\n'));
    });

    // 3. Combine and return the final string
    return `${icOutput.join('\n\n')}\n\n---\n\n${fibOutput.join('\n\n')}`;
}