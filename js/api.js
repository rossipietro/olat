import { cleanGermanCharacters, delay } from './utils.js';

export const API_CONFIGS = {
    google: { 
        url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}',
        fileUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files?key={apiKey}',
        keyId: 'google_api_key', 
        modelId: 'google-model-select' 
    },
    openai: { 
        url: 'https://api.openai.com/v1/chat/completions', 
        keyId: 'openai_api_key', 
        modelId: 'openai-model-select' 
    },
    deepseek: { 
        url: 'https://api.deepseek.com/chat/completions', 
        keyId: 'deepseek_api_key', 
        modelId: 'deepseek-model-select' 
    }
};

/**
 * Uploads a single file to the Gemini File API.
 * @param {File} file The raw file object to upload.
 * @param {string} apiKey The user's Google API key.
 * @returns {Promise<object>} The file metadata object from the API response.
 */
async function uploadFileToGemini(file, apiKey) {
    console.log(`Uploading ${file.name} to Gemini File API...`);
    const url = API_CONFIGS.google.fileUrl.replace('{apiKey}', apiKey);
    const headers = { 'X-Goog-Upload-Protocol': 'raw', 'Content-Type': file.type };
    
    const response = await fetch(url, { method: 'POST', headers: headers, body: file });
    
    if (!response.ok) {
        throw new Error(`File upload failed for ${file.name}: ${await response.text()}`);
    }
    
    const data = await response.json();
    console.log(`Successfully uploaded ${file.name}. URI: ${data.file.uri}`);
    // Return the file object from the nested structure
    return data.file;
}

/**
 * Fetches the metadata for a specific file from the Gemini File API to check its state.
 * @param {string} fileName The full resource name of the file (e.g., 'files/abc-123').
 * @param {string} apiKey The user's Google API key.
 * @returns {Promise<object>} The file metadata object from the API.
 */
async function getFile(fileName, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to get file status for ${fileName}: ${await response.text()}`);
    }
    return await response.json();
}

/**
 * Calls the selected LLM's API with the given prompt and files.
 * @param {string} provider The selected provider (e.g., 'google').
 * @param {string} prompt The full prompt text.
 * @param {Array} uploadedFiles An array of file data objects from the UI.
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
    
    let url = config.url.replace('{model}', model).replace('{apiKey}', apiKey);
    let headers = { 'Content-Type': 'application/json' };
    let body;

    // --- Start of Provider-Specific Logic ---
    if (provider === 'google') {
        const promptParts = [{ text: prompt }];
        
        if (uploadedFiles.length > 0) {
            try {
                // Step 1: Upload all files and get their initial metadata.
                const initialUploadResponses = await Promise.all(
                    uploadedFiles.map(fileObj => uploadFileToGemini(fileObj.rawFile, apiKey))
                );

                // Step 2: Poll for each file to become ACTIVE.
                const uploadedFileMetadata = await Promise.all(
                    initialUploadResponses.map(async (uploadedFile) => {
                        let currentFile = uploadedFile;
                        const maxAttempts = 10;
                        let attempt = 0;

                        // Immediately fetch the full metadata to get the initial state.
                        currentFile = await getFile(currentFile.name, apiKey);

                        while (currentFile.state === 'PROCESSING' && attempt < maxAttempts) {
                            attempt++;
                            console.log(`File ${currentFile.name} is PROCESSING. Waiting... (Attempt ${attempt})`);
                            await delay(2000); // Wait for 2 seconds
                            currentFile = await getFile(currentFile.name, apiKey);
                        }

                        if (currentFile.state !== 'ACTIVE') {
                            throw new Error(`File ${currentFile.name} did not become ACTIVE. Final state: ${currentFile.state}`);
                        }

                        console.log(`File ${currentFile.name} is now ACTIVE.`);
                        return currentFile; // Return the final, ACTIVE file metadata.
                    })
                );

                // Step 3: Create fileData parts using the URIs from the ACTIVE files.
                const fileDataParts = uploadedFileMetadata.map(meta => ({
                    fileData: { mimeType: meta.mimeType, fileUri: meta.uri }
                }));
                
                promptParts.push(...fileDataParts);

            } catch (error) {
                console.error("Error during file upload and processing:", error);
                alert(`Fehler beim Hochladen oder Verarbeiten der Dateien: ${error.message}`);
                return null;
            }
        }
        
        // ** THIS LINE IS CRITICAL AND WAS MISSING **
        body = { contents: [{ parts: promptParts }] };

    } else { // Logic for OpenAI, DeepSeek, etc.
        const hasVideo = uploadedFiles.some(f => f.mime_type.startsWith('video/'));
        const hasAudio = uploadedFiles.some(f => f.mime_type.startsWith('audio/'));
        if (hasVideo || hasAudio) {
            alert(`Video- und Audio-Upload wird derzeit nur für Google Gemini-Modelle unterstützt.`);
            return null;
        }

        let promptParts = [{ type: 'text', text: prompt }];
        if (uploadedFiles.length > 0) {
            const imageParts = uploadedFiles.map(file => ({
                type: 'image_url',
                image_url: { url: `data:${file.mime_type};base64,${file.data}` }
            }));
            promptParts.push(...imageParts);
        }

        headers.Authorization = `Bearer ${apiKey}`;
        body = { model: model, messages: [{ role: 'user', content: promptParts }] };
    }
    // --- End of Provider-Specific Logic ---

    try {
        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!response.ok) {
            const errText = await response.text();
            console.error("Failed API Request Body:", JSON.stringify(body, null, 2));
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
                if (data.candidates && data.candidates.length > 0) {
                    // Check if parts array exists and has text
                    if (data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                        text = data.candidates[0].content.parts[0].text;
                    } else {
                        text = "## ANTWORT ERHALTEN, ABER KEIN TEXTINHALT ##\nDie API hat geantwortet, aber der 'text'-Teil war leer. Dies kann bei einigen Anfragen (z.B. reinen Bildanalysen ohne textuelle Frage) vorkommen.";
                    }
                } else if (data.promptFeedback?.blockReason) {
                     text = `## ANTWORT GEBLOCKT ##\nGrund: ${data.promptFeedback.blockReason}\n\n${data.promptFeedback.safetyRatings.map(r => `${r.category}: ${r.probability}`).join('\n')}`;
                } else {
                     text = "## FEHLER ##\nKein Inhalt in der API-Antwort gefunden. Überprüfen Sie die Konsolenausgabe für Details."
                     console.log("Full API response with no content:", data);
                }
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
        console.error("Error parsing response:", e, data);
        text = "## FEHLER BEI DER ANTWORTVERARBEITUNG ##";
    }
    return { text, inputTokens, outputTokens };
}