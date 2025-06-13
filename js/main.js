import { fetchPromptForType, assembleFullPrompt, saveApiKeys, loadApiKeys, formatInlineFibOutput, ZIELNIVEAU_DESCRIPTIONS } from './utils.js';
import { callApi, extractContentAndTokens } from './api.js';
import { initializeQuestionCheckboxes, switchProviderConfig, handleFileUpload, updateTokenCount, clearOutputs, showSpinner, handleDownload, setButtonLoadingState } from './ui.js';

// App constants
const QUESTION_TYPES = [
    "single_choice", "multiple_choice1", "multiple_choice2", "multiple_choice3",
    "kprim", "truefalse", "draganddrop", "inline_fib"
];

// App state
let uploadedFiles = [];
const promptCache = {};

// DOM Element References
const elements = {
    providerSelect: document.getElementById('provider-select'),
    saveKeysCheckbox: document.getElementById('save-keys-checkbox'),
    apiKeyInputs: document.querySelectorAll('.api-key-input'),
    fileUpload: document.getElementById('file-upload'),
    imagePreviews: document.getElementById('image-previews'),
    language: document.getElementById('language'),
    zielniveau: document.getElementById('zielniveau'),
    userInput: document.getElementById('user_input'),
    learningGoals: document.getElementById('learning_goals'),
    generateGoalsBtn: document.getElementById('generate-goals-btn'),
    exploreTopicsBtn: document.getElementById('explore-topics-btn'),
    generateQuestionsBtn: document.getElementById('generate-questions-btn'),
    questionTypesContainer: document.getElementById('question-types'),
    spinner: document.getElementById('spinner'),
    resultsWrapper: document.getElementById('results-wrapper'),
    tokenUsageContainer: document.getElementById('token-usage'),
    allResponsesContainer: document.getElementById('all-responses'),
    topicExplorerResultsContainer: document.getElementById('topic-explorer-results'),
    downloadBtn: document.getElementById('download-btn'),
};

/**
 * Main application logic starts here, after the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Event Handlers ---

    async function onGenerateGoals() {
        if (!elements.userInput.value.trim() && uploadedFiles.length === 0) {
            return alert("Bitte geben Sie Text ein oder laden Sie Bilder hoch.");
        }

        setButtonLoadingState(elements.generateGoalsBtn, true);

        try {
            const niveauKey = elements.zielniveau.value;
            const niveauDescription = ZIELNIVEAU_DESCRIPTIONS[niveauKey]?.description;
            const prompt = `Analysiere den bereitgestellten Inhalt und generiere 3-5 Lernziele.
Formuliere die Lernziele als "Die Lernenden können...".
Beachte bei der Formulierung die folgende Anweisung für das Zielniveau: "${niveauDescription}"`;

            const context = {
                language: elements.language.value,
                zielniveau: niveauKey,
                goals: "", // No goals provided when generating goals
                text: elements.userInput.value
            };

            const resultData = await callApi(elements.providerSelect.value, assembleFullPrompt(prompt, context), uploadedFiles);
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
            return alert("Bitte geben Sie Text ein oder laden Sie Bilder hoch.");
        }

        setButtonLoadingState(elements.exploreTopicsBtn, true);
        elements.topicExplorerResultsContainer.innerHTML = ''; // Clear previous results

        try {
            const prompt = `Analysiere den bereitgestellten Text und/oder die Bilder. Schlage 3-5 verwandte Themen oder Konzepte vor. Formatiere als sauberes HTML mit <h4> und <p> Tags. Gib NUR das HTML aus.`;
            const context = {
                language: elements.language.value,
                zielniveau: elements.zielniveau.value,
                goals: "",
                text: elements.userInput.value
            };
            const resultData = await callApi(elements.providerSelect.value, assembleFullPrompt(prompt, context), uploadedFiles);

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

    async function onGenerateQuestions() {
        const selectedTypes = Array.from(document.querySelectorAll('input[name="question_type"]:checked')).map(cb => cb.value);
        if ((!elements.userInput.value.trim() && uploadedFiles.length === 0) || selectedTypes.length === 0) {
            return alert("Bitte geben Sie Material ein und wählen Sie mindestens einen Fragetyp.");
        }

        showSpinner(true, elements); // Use the main spinner for this primary action
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
        elements.downloadBtn.style.display = allGeneratedResponses ? 'block' : 'none';
        showSpinner(false, elements);
    }

    // --- Initial Setup ---

    initializeQuestionCheckboxes(QUESTION_TYPES, elements.questionTypesContainer);
    switchProviderConfig(elements.providerSelect.value);
    elements.saveKeysCheckbox.checked = loadApiKeys();

    // --- Event Listener Attachments ---

    elements.providerSelect.addEventListener('change', (e) => switchProviderConfig(e.target.value));
    elements.fileUpload.addEventListener('change', async (e) => {
        uploadedFiles = await handleFileUpload(e, elements.imagePreviews);
    });

    elements.generateGoalsBtn.addEventListener('click', onGenerateGoals);
    elements.exploreTopicsBtn.addEventListener('click', onExploreTopics);
    elements.generateQuestionsBtn.addEventListener('click', onGenerateQuestions);
    elements.downloadBtn.addEventListener('click', () => handleDownload(elements.allResponsesContainer.textContent));

    elements.saveKeysCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            saveApiKeys(true);
            alert('API Schlüssel werden jetzt bei Eingabe lokal gespeichert.');
        } else {
            localStorage.removeItem('apiKeys');
            localStorage.removeItem('saveApiKeysPreference');
            alert('Lokales Speichern der API Schlüssel deaktiviert. Gespeicherte Schlüssel wurden entfernt.');
        }
    });
    elements.apiKeyInputs.forEach(input => input.addEventListener('input', () => saveApiKeys(elements.saveKeysCheckbox.checked)));
});