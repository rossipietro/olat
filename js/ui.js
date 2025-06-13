/**
 * Creates and appends question type checkboxes to the container.
 * @param {Array<string>} types Array of question type strings.
 * @param {HTMLElement} container The DOM element to append checkboxes to.
 */
export function initializeQuestionCheckboxes(types, container) {
    types.forEach(type => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        const checkbox = document.createElement('input');
        checkbox.id = `type-${type}`;
        checkbox.name = 'question_type';
        checkbox.type = 'checkbox';
        checkbox.value = type;
        checkbox.className = 'h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500';
        const label = document.createElement('label');
        label.htmlFor = `type-${type}`;
        label.className = 'ml-2 text-sm text-gray-700';

        let labelText = type.replace(/_/g, ' ');
        if (type.startsWith("multiple_choice")) {
            labelText = labelText.replace(/(\d+)/, ' ($1)');
        }
        labelText = labelText.replace(/\b\w/g, l => l.toUpperCase());
        label.textContent = labelText;

        div.append(checkbox, label);
        container.appendChild(div);
    });
}

/**
 * Shows or hides the config section for the selected provider.
 * @param {string} providerValue The value of the selected provider.
 */
export function switchProviderConfig(providerValue) {
    document.querySelectorAll('.provider-config').forEach(el => el.classList.remove('active'));
    document.getElementById(`${providerValue}-config`).classList.add('active');
}

/**
 * Handles the file upload event, creating file previews and returning file data.
 * @param {Event} event The file input change event.
 * @param {HTMLElement} previewsContainer The DOM element for file previews.
 * @returns {Promise<Array>} A promise that resolves to an array of file data objects.
 */
export function handleFileUpload(event, previewsContainer) {
    previewsContainer.innerHTML = '';
    const files = Array.from(event.target.files).slice(0, 5);

    if (files.filter(f => f.type.startsWith('video/')).length > 1) {
        alert("Bitte laden Sie nur ein Video auf einmal hoch.");
        event.target.value = ''; // Clear the file input
        return Promise.resolve([]);
    }

    const filePromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => {
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'h-20 w-20 object-cover rounded-md';
                    previewsContainer.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = e.target.result;
                    video.className = 'h-20 w-20 object-cover rounded-md';
                    video.controls = true;
                    video.muted = true;
                    previewsContainer.appendChild(video);
                }
                
                resolve({
                    mime_type: file.type,
                    data: e.target.result.split(',')[1]
                });
            };
            reader.readAsDataURL(file);
        });
    });
    return Promise.all(filePromises);
}


/**
 * Displays the token count in its dedicated container.
 * @param {HTMLElement} container The DOM element to display the count.
 * @param {number} input Total input tokens.
 * @param {number} output Total output tokens.
 */
export function updateTokenCount(container, input, output) {
    if (input > 0 || output > 0) {
        container.textContent = `Tokens: ${input} (Input) / ${output} (Output) / ${input + output} (Total)`;
    } else {
        container.textContent = '';
    }
}

/**
 * Clears all output areas in the UI.
 * @param {object} elements An object containing the DOM elements to clear.
 */
export function clearOutputs(elements) {
    elements.allResponsesContainer.textContent = '';
    elements.topicExplorerResultsContainer.innerHTML = '';
    updateTokenCount(elements.tokenUsageContainer, 0, 0);
}

/**
 * Manages the visibility of the spinner and results wrapper.
 * @param {boolean} show Whether to show the spinner.
 * @param {object} elements An object containing the spinner, results wrapper, and download button.
 */
export function showSpinner(show, elements) {
    elements.spinner.style.display = show ? 'block' : 'none';
    elements.resultsWrapper.style.display = show ? 'none' : 'block';
    if (show) {
        clearOutputs(elements);
        elements.downloadBtn.style.display = 'none';
    }
}

/**
 * Initiates the download of the generated text.
 * @param {string} content The text content to download.
 */
export function handleDownload(content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'olat_fragen.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Sets the loading state for a button, disabling it and changing its content.
 * @param {HTMLButtonElement} button The button element to modify.
 * @param {boolean} isLoading Whether to set the loading state on or off.
 */
export function setButtonLoadingState(button, isLoading) {
    if (isLoading) {
        // Store the button's original content if it hasn't been stored yet
        if (!button.dataset.originalHtml) {
            button.dataset.originalHtml = button.innerHTML;
        }
        button.disabled = true;
        // The 'flex' and 'items-center' classes on the button ensure the spinner and text align correctly.
        button.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generiere...</span>
        `;
        button.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        // Restore the button to its original state
        if (button.dataset.originalHtml) {
            button.innerHTML = button.dataset.originalHtml;
        }
        button.disabled = false;
        button.classList.remove('opacity-75', 'cursor-not-allowed');
    }
}