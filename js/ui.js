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
                const previewWrapper = document.createElement('div');
                previewWrapper.className = 'h-20 w-full flex items-center justify-center bg-gray-100 rounded-md p-1';

                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'h-full w-full object-cover rounded-md';
                    previewWrapper.appendChild(img);
                } else if (file.type.startsWith('video/')) {
                    const video = document.createElement('video');
                    video.src = e.target.result;
                    video.className = 'h-full w-full object-cover rounded-md';
                    video.controls = true;
                    video.muted = true;
                    previewWrapper.appendChild(video);
                } else if (file.type.startsWith('audio/')) {
                    previewWrapper.innerHTML = `
                        <div class="text-center text-gray-600">
                            <svg class="mx-auto h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>
                            <span class="block text-xs font-medium truncate w-20">${file.name}</span>
                        </div>
                    `;
                }
                previewsContainer.appendChild(previewWrapper);
                
                resolve({
                    mime_type: file.type,
                    // The raw file object is now needed for the File API
                    rawFile: file, 
                    // Base64 data is kept for non-Google providers (if they ever support it)
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

// ... (keep all existing functions like initializeQuestionCheckboxes, etc.) ...

/**
 * Renders the list of saved outputs in the history container.
 * @param {Array} history The array of history items to render.
 * @param {HTMLElement} container The DOM element to render the list into.
 */
export function renderHistoryList(history, container) {
    const placeholder = document.getElementById('history-placeholder');
    container.innerHTML = ''; // Clear previous items

    if (history.length === 0) {
        container.appendChild(placeholder);
        placeholder.style.display = 'block';
    } else {
        placeholder.style.display = 'none';
        history.forEach(item => {
            const date = new Date(item.timestamp);
            // Format for Switzerland: DD.MM.YYYY, HH:MM
            const formattedDate = date.toLocaleString('de-CH', { 
                year: 'numeric', month: '2-digit', day: '2-digit', 
                hour: '2-digit', minute: '2-digit' 
            });

            const itemDiv = document.createElement('div');
            itemDiv.className = 'p-2 bg-gray-50 rounded-md flex items-center justify-between hover:bg-gray-100';
            
            itemDiv.innerHTML = `
                <div class="text-sm text-gray-700">
                    <span class="font-semibold">${formattedDate}</span>
                    <p class="text-xs text-gray-500 truncate max-w-xs">${item.content.substring(0, 40).replace(/\n/g, ' ')}...</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button title="Herunterladen" class="download-history-btn p-1 text-gray-500 hover:text-indigo-600" data-timestamp="${item.timestamp}">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    </button>
                    <button title="Löschen" class="delete-history-btn p-1 text-gray-500 hover:text-red-600" data-timestamp="${item.timestamp}">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }
}