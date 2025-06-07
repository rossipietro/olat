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
 * Handles the file upload event, creating image previews and returning image data.
 * @param {Event} event The file input change event.
 * @param {HTMLElement} previewsContainer The DOM element for image previews.
 * @returns {Promise<Array>} A promise that resolves to an array of image data objects.
 */
export function handleImageUpload(event, previewsContainer) {
    previewsContainer.innerHTML = '';
    const files = Array.from(event.target.files).slice(0, 5);
    const imagePromises = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'h-20 w-20 object-cover rounded-md';
                previewsContainer.appendChild(img);
                
                resolve({
                    mime_type: file.type,
                    data: e.target.result.split(',')[1]
                });
            };
            reader.readAsDataURL(file);
        });
    });
    return Promise.all(imagePromises);
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