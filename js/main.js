import { fetchPromptForType, assembleFullPrompt, saveApiKeys, loadApiKeys, formatInlineFibOutput, ZIELNIVEAU_DESCRIPTIONS, saveOutputToHistory, loadOutputHistory, deleteFromOutputHistory, extractTextFromFile } from './utils.js';
import { callApi, extractContentAndTokens } from './api.js';
import { initializeQuestionCheckboxes, switchProviderConfig, handleFileUpload, updateTokenCount, clearOutputs, showSpinner, handleDownload, setButtonLoadingState, renderHistoryList, handleDocUpload, updateBatchStatus } from './ui.js';

// App state
let uploadedFiles = [];
let batchFiles = null;
const promptCache = {};

// DOM Element References
const elements = {
    // Sidebar
    providerSelect: document.getElementById('provider-select'),
    saveKeysCheckbox: document.getElementById('save-keys-checkbox'),
    apiKeyInputs: document.querySelectorAll('.api-key-input'),
    language: document.getElementById('language'),
    zielniveau: document.getElementById('zielniveau'),
    historyContainer: document.getElementById('history-container'),
    
    // Main Content
    docUpload: document.getElementById('doc-upload'),
    docList: document.getElementById('doc-list'),
    userInput: document.getElementById('user_input'),
    learningGoals: document.getElementById('learning_goals'),
    generateGoalsBtn: document.getElementById('generate-goals-btn'),
    fileUpload: document.getElementById('file-upload'),
    imagePreviews: document.getElementById('image-previews'),
    exploreTopicsBtn: document.getElementById('explore-topics-btn'),
    questionTypesContainer: document.getElementById('question-types'),
    generateQuestionsBtn: document.getElementById('generate-questions-btn'),
    
    // Output
    batchStatus: document.getElementById('batch-status'),
    outputContainer: document.getElementById('output-container'),
    spinner: document.getElementById('spinner'),
    resultsWrapper: document.getElementById('results-wrapper'),
    tokenUsageContainer: document.getElementById('token-usage'),
    allResponsesContainer: document.getElementById('all-responses'),
    downloadBtn: document.getElementById('download-btn'),
};

/**
 * Main application logic starts here, after the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Start of Function Definitions ---

    async function onGenerateGoals() {
        if (!elements.userInput.value.trim() && uploadedFiles.length === 0) {
            return alert("Bitte geben Sie Text ein oder laden Sie Multimedia-Dateien für den Lernziel-Assistenten hoch.");
        }

        setButtonLoadingState(elements.generateGoalsBtn, true);

        try {
            const niveauKey = elements.zielniveau.value;
            const niveauDescription = ZIELNIVEAU_DESCRIPTIONS[niveauKey]?.description;
            const prompt = `Analysiere den bereitgestellten Inhalt und generiere 3-5 Lernziele.\nFormuliere die Lernziele als "Die Lernenden können...".\nBeachte bei der Formulierung die folgende Anweisung für das Zielniveau: "${niveauDescription}"`;
            const resultData = await callApi(elements.providerSelect.value, prompt, uploadedFiles);
            const { text, inputTokens, outputTokens } = extractContentAndTokens(elements.providerSelect.value, resultData);
            if (text) elements.learningGoals.value = text;
            updateTokenCount(elements.tokenUsageContainer, inputTokens, outputTokens);

        } catch (error) {
            console.error("Failed to generate learning goals:", error);
            alert(`Fehler beim Generieren der Lernziele: ${error.message}`);
        } finally {
            setButtonLoadingState(elements.generateGoalsBtn, false);
        }
    }

    async function onExploreTopics() {
        if (!elements.userInput.value.trim() && uploadedFiles.length === 0) {
            return alert("Bitte geben Sie Text ein oder laden Sie Multimedia-Dateien für den Themen-Explorer hoch.");
        }

        setButtonLoadingState(elements.exploreTopicsBtn, true);
        elements.topicExplorerResultsContainer.innerHTML = '';

        try {
            const prompt = `Analysiere den bereitgestellten Text und/oder die Bilder. Schlage 3-5 verwandte Themen oder Konzepte vor. Formatiere als sauberes HTML mit <h4> und <p> Tags. Gib NUR das HTML aus.`;
            const resultData = await callApi(elements.providerSelect.value, prompt, uploadedFiles);

            const { text, inputTokens, outputTokens } = extractContentAndTokens(elements.providerSelect.value, resultData);
            if (text) {
                elements.topicExplorerResultsContainer.innerHTML = `<h3 class="text-lg font-semibold mb-2 text-indigo-700">✨ Verwandte Themen</h3><div class="p-4 bg-indigo-50 rounded-md">${text}</div>`;
            }
            updateTokenCount(elements.tokenUsageContainer, inputTokens, outputTokens);
        } catch (error) {
            console.error("Failed to explore topics:", error);
            alert(`Fehler beim Erforschen der Themen: ${error.message}`);
        } finally {
            setButtonLoadingState(elements.exploreTopicsBtn, false);
        }
    }
    
    async function generateQuestionsForText(textInput) {
        const selectedTypes = Array.from(document.querySelectorAll('input[name="question_type"]:checked')).map(cb => cb.value);
        let combinedResponse = '';
        let totalInput = 0;
        let totalOutput = 0;

        for (const type of selectedTypes) {
            const basePrompt = await fetchPromptForType(type, promptCache);
            if (!basePrompt) continue;

            const context = {
                language: elements.language.value,
                zielniveau: elements.zielniveau.value,
                goals: elements.learningGoals.value,
                text: textInput,
            };
            const fullPrompt = assembleFullPrompt(basePrompt, context);
            const resultData = await callApi(elements.providerSelect.value, fullPrompt, []); 
            let { text, inputTokens, outputTokens } = extractContentAndTokens(elements.providerSelect.value, resultData);

            totalInput += inputTokens;
            totalOutput += outputTokens;

            if (type === 'inline_fib' && text && text.includes('```json')) {
                text = formatInlineFibOutput(text);
            }
            combinedResponse += text ? `## ${type.replace(/_/g, ' ').toUpperCase()} ##\n\n${text}\n\n---\n\n` : `## FEHLER FÜR ${type.toUpperCase()} ##\nKeine Antwort vom Server erhalten.\n\n---\n\n`;
        }
        return { fullResponse: combinedResponse, totalInput, totalOutput };
    }

    async function onGenerateQuestions() {
        if (batchFiles && batchFiles.length > 0) {
            await runBatchMode();
        } else {
            await runSingleMode();
        }
    }

    async function runSingleMode() {
        if (!elements.userInput.value.trim() && uploadedFiles.length === 0) {
            return alert("Bitte geben Sie Text ein oder laden Sie eine Multimedia-Datei hoch.");
        }
        
        showSpinner(true, elements);
        updateBatchStatus('', elements.batchStatus);
        
        const selectedTypes = Array.from(document.querySelectorAll('input[name="question_type"]:checked')).map(cb => cb.value);
        let allGeneratedResponses = '';
        let totalInputTokens = 0, totalOutputTokens = 0;

        for (const type of selectedTypes) {
            const basePrompt = await fetchPromptForType(type, promptCache);
            if (!basePrompt) continue;

            const context = {
                language: elements.language.value,
                zielniveau: elements.zielniveau.value,
                goals: elements.learningGoals.value,
                text: elements.userInput.value
            };
            const fullPrompt = assembleFullPrompt(basePrompt, context);
            const resultData = await callApi(elements.providerSelect.value, fullPrompt, uploadedFiles);
            let { text, inputTokens, outputTokens } = extractContentAndTokens(elements.providerSelect.value, resultData);

            totalInputTokens += inputTokens;
            totalOutputTokens += outputTokens;

            if (type === 'inline_fib' && text && text.includes('```json')) {
                text = formatInlineFibOutput(text);
            }
            allGeneratedResponses += text ? `## ${type.replace(/_/g, ' ').toUpperCase()} ##\n\n${text}\n\n---\n\n` : `## FEHLER FÜR ${type.toUpperCase()} ##\nKeine Antwort vom Server erhalten.\n\n---\n\n`;
        }

        elements.allResponsesContainer.textContent = allGeneratedResponses;
        updateTokenCount(elements.tokenUsageContainer, totalInputTokens, totalOutputTokens);
        showSpinner(false, elements);

        if (allGeneratedResponses.trim()) {
            const newHistory = saveOutputToHistory(allGeneratedResponses);
            renderHistoryList(newHistory, elements.historyContainer);
        }
    }

    async function runBatchMode() {
        showSpinner(true, elements);
        let finalBatchOutput = `BATCH-VERARBEITUNGSERGEBNISSE - ${new Date().toLocaleString('de-CH')}\n\n`;
        let cumulativeInputTokens = 0;
        let cumulativeOutputTokens = 0;
        const totalFiles = batchFiles.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = batchFiles[i];
            updateBatchStatus(`Verarbeite Datei ${i + 1} von ${totalFiles}: ${file.name}...`, elements.batchStatus);
            
            try {
                const extractedText = await extractTextFromFile(file);
                if (!extractedText.trim()) {
                    finalBatchOutput += `\n\n====================\n## DOKUMENT: ${file.name} ##\n====================\n\nFEHLER: Konnte keinen Text aus der Datei extrahieren oder die Datei ist leer.\n\n`;
                    continue;
                }

                const result = await generateQuestionsForText(extractedText);
                
                finalBatchOutput += `\n\n====================\n## DOKUMENT: ${file.name} ##\n====================\n\n${result.fullResponse}`;
                cumulativeInputTokens += result.totalInput;
                cumulativeOutputTokens += result.totalOutput;

            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                finalBatchOutput += `\n\n====================\n## DOKUMENT: ${file.name} ##\n====================\n\nFEHLER: ${error.message}\n\n`;
            }
        }

        updateBatchStatus('Batch-Verarbeitung abgeschlossen!', elements.batchStatus);
        elements.allResponsesContainer.textContent = finalBatchOutput;
        updateTokenCount(elements.tokenUsageContainer, cumulativeInputTokens, cumulativeOutputTokens);
        showSpinner(false, elements);
        
        if (finalBatchOutput.trim()) {
            const newHistory = saveOutputToHistory(finalBatchOutput);
            renderHistoryList(newHistory, elements.historyContainer);
        }
    }

    // --- End of Function Definitions ---


    // --- Initial Setup & Event Listeners ---
    
    initializeQuestionCheckboxes(QUESTION_TYPES, elements.questionTypesContainer);
    switchProviderConfig(elements.providerSelect.value);
    elements.saveKeysCheckbox.checked = loadApiKeys();
    
    const initialHistory = loadOutputHistory();
    renderHistoryList(initialHistory, elements.historyContainer);

    elements.providerSelect.addEventListener('change', (e) => switchProviderConfig(e.target.value));
    
    elements.fileUpload.addEventListener('change', async (e) => {
        uploadedFiles = await handleFileUpload(e, elements.imagePreviews);
    });

    elements.docUpload.addEventListener('change', (e) => {
        batchFiles = handleDocUpload(e, elements.docList);
        const disabled = batchFiles && batchFiles.length > 0;
        elements.userInput.disabled = disabled;
        elements.fileUpload.disabled = disabled;
        elements.userInput.classList.toggle('bg-gray-200', disabled);
    });
    
    elements.generateQuestionsBtn.addEventListener('click', onGenerateQuestions);
    elements.generateGoalsBtn.addEventListener('click', onGenerateGoals);
    elements.exploreTopicsBtn.addEventListener('click', onExploreTopics);
    elements.downloadBtn.addEventListener('click', () => handleDownload(elements.allResponsesContainer.textContent));

    elements.saveKeysCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            saveApiKeys(true);
            alert('API Schlüssel werden jetzt bei Eingabe lokal gespeichert.');
        } else {
            localStorage.removeItem('apiKeys');
            localStorage.removeItem('saveApiKeysPreference');
            alert('Lokales Speichern der API Schlüssel deaktiviert.');
        }
    });
    elements.apiKeyInputs.forEach(input => input.addEventListener('input', () => saveApiKeys(elements.saveKeysCheckbox.checked)));

    elements.historyContainer.addEventListener('click', (e) => {
        const downloadBtn = e.target.closest('.download-history-btn');
        const deleteBtn = e.target.closest('.delete-history-btn');

        if (downloadBtn) {
            const timestamp = downloadBtn.dataset.timestamp;
            const history = loadOutputHistory();
            const item = history.find(i => i.timestamp === timestamp);
            if (item) handleDownload(item.content);
        }

        if (deleteBtn) {
            const timestamp = deleteBtn.dataset.timestamp;
            if (confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) {
                const newHistory = deleteFromOutputHistory(timestamp);
                renderHistoryList(newHistory, elements.historyContainer);
            }
        }
    });
});