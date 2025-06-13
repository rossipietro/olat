import { cleanGermanCharacters } from './utils.js';

export const API_CONFIGS = {
    google: { url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}', keyId: 'google_api_key', modelId: 'google-model-select' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', keyId: 'openai_api_key', modelId: 'openai-model-select' },
    deepseek: { url: 'https://api.deepseek.com/chat/completions', keyId: 'deepseek_api_key', modelId: 'deepseek-model-select' }
};

/**
 * Calls the selected LLM's API with the given prompt and files.
 * @param {string} provider The selected provider (e.g., 'google').
 * @param {string} prompt The full prompt text.
 * @param {Array} uploadedFiles An array of file data objects (images or videos).
 * @returns {Promise<object|null>} The JSON response from the API or null.
 */
export async function callApi(provider, prompt, uploadedFiles) {
    const config = API_CONFIGS[provider];
    const apiKey = document.getElementById(config.keyId).value;
    const model = document.getElementById(config.modelId).value;

    if (!apiKey) {
        alert(`Bitte geben Sie einen API-Schlüssel für ${provider} ein.`);
        return null;
    }

    const hasVideo = uploadedFiles.some(f => f.mime_type.startsWith('video/'));
    if (hasVideo && provider !== 'google') {
        alert(`Video-Upload wird derzeit nur für Google Gemini-Modelle unterstützt.`);
        return null;
    }

    let url = config.url.replace('{model}', model).replace('{apiKey}', apiKey);
    let headers = { 'Content-Type': 'application/json' };
    let body;
    let promptParts = [{ type: 'text', text: prompt }];

    if (uploadedFiles.length > 0) {
        const fileParts = uploadedFiles.map(file => {
            switch (provider) {
                case 'google': return { inlineData: { mimeType: file.mime_type, data: file.data } };
                case 'openai':
                case 'deepseek': return { type: 'image_url', image_url: { url: `data:${file.mime_type};base64,${file.data}` } };
                default: return null;
            }
        }).filter(p => p);

        if (provider === 'google') {
            promptParts.push(...fileParts);
        } else {
            promptParts = [{ type: 'text', text: prompt }, ...fileParts];
        }
    }

    switch (provider) {
        case 'google':
            body = { contents: [{ parts: promptParts }] };
            break;
        case 'openai':
        case 'deepseek':
            headers.Authorization = `Bearer ${apiKey}`;
            body = { model: model, messages: [{ role: 'user', content: (uploadedFiles.length > 0) ? promptParts : prompt }] };
            break;
    }

    try {
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Fehler (${response.status}): ${errText}`);
        }
        return await response.json();
    } catch (e) {
        console.error("API Call failed:", e);
        alert(`Fehler: ${e.message}`);
        return null;
    }
}

/**
 * Extracts the text content and token usage from an API response.
 * @param {string} provider The provider who sent the response.
 * @param {object} data The raw JSON response data.
 * @returns {{text: string, inputTokens: number, outputTokens: number}}
 */
export function extractContentAndTokens(provider, data) {
    if (!data) return { text: null, inputTokens: 0, outputTokens: 0 };
    let text, inputTokens = 0, outputTokens = 0;

    try {
        switch (provider) {
            case 'google':
                text = data.candidates[0].content.parts[0].text;
                inputTokens = data.usageMetadata?.promptTokenCount || 0;
                outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
                break;
            case 'openai':
            case 'deepseek':
                text = data.choices[0].message.content;
                inputTokens = data.usage?.prompt_tokens || 0;
                outputTokens = data.usage?.completion_tokens || 0;
                break;
        }
        text = cleanGermanCharacters(text);
    } catch (e) {
        console.error("Error parsing response:", e);
        text = "## FEHLER BEI DER ANTWORTVERARBEITUNG ##";
    }
    return { text, inputTokens, outputTokens };
}