let images = [];

// DOM Elements
const imageUpload = document.getElementById('imageUpload');
const previewContainer = document.getElementById('previewContainer');
const sendButton = document.getElementById('sendButton');
const groupSelect = document.getElementById('group');
const fincaSelect = document.getElementById('finca');

// Event Listeners
imageUpload.addEventListener('change', handleImageUpload);
document.querySelector('.upload-area').addEventListener('click', () => imageUpload.click());

// Load workers from API
async function loadWorkers() {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbwAiB1V0BBGSUkXQFnw351xoGMlmD_wBSzHviJwoLOAuSi9rAlSMCjfpd5T2ohdgBsyZA/exec');
        const data = await response.json();
        return data.map(item => {
            const [code, ...nameParts] = item.split(' ');
            return {
                value: code,
                label: `${code} - ${nameParts.join(' ')}`
            };
        });
    } catch (error) {
        console.error('Error loading workers:', error);
        return [];
    }
}

// Create searchable worker select element
async function createWorkerSelect(imageIndex) {
    const container = document.createElement('div');
    container.className = 'worker-select-container';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'select-input search-input';
    searchInput.placeholder = 'Search worker...';

    const select = document.createElement('select');
    select.className = 'select-input worker-select';
    select.size = 1;
    select.innerHTML = '<option value="">Select a worker...</option>';

    const workers = await loadWorkers();
    const allOptions = workers.map(worker => {
        const option = document.createElement('option');
        option.value = worker.value;
        option.textContent = worker.label;
        return option;
    });

    allOptions.forEach(option => select.appendChild(option));

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        select.innerHTML = '<option value="">Select a worker...</option>';
        
        const filteredOptions = allOptions.filter(option => 
            option.textContent.toLowerCase().includes(searchTerm)
        );

        filteredOptions.forEach(option => {
            const clonedOption = option.cloneNode(true);
            select.appendChild(clonedOption);
        });

        // Show dropdown when searching
        select.size = Math.min(filteredOptions.length + 1, 6);
        select.style.display = 'block';
    });

    // Handle select change
    select.addEventListener('change', () => {
        images[imageIndex].worker = {
            value: select.value,
            label: select.options[select.selectedIndex].text
        };
        select.size = 1;
        searchInput.value = select.options[select.selectedIndex].text;
        checkConfirmation();
    });

    // Handle focus
    searchInput.addEventListener('focus', () => {
        select.size = Math.min(allOptions.length + 1, 6);
        select.style.display = 'block';
    });

    // Handle click outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            select.size = 1;
        }
    });

    container.appendChild(searchInput);
    container.appendChild(select);
    return container;
}

// Handle image upload
async function handleImageUpload(event) {
    const files = event.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const imageIndex = images.length;
            images.push({
                file,
                dataUrl: e.target.result,
                worker: null
            });

            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" class="preview-image" alt="Preview">
                <div class="preview-actions">
                    <button class="action-button delete-button" onclick="removeImage(${imageIndex})">🗑️</button>
                    <button class="action-button confirm-button" onclick="confirmImage(${imageIndex})">✓</button>
                </div>
            `;

            const workerSelect = await createWorkerSelect(imageIndex);
            previewItem.appendChild(workerSelect);
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    }
}

// Remove image
function removeImage(index) {
    images.splice(index, 1);
    updatePreviewContainer();
    checkConfirmation();
}

// Confirm image
function confirmImage(index) {
    if (!images[index].worker) {
        alert('Please select a worker for this image before confirming.');
        return;
    }
    checkConfirmation();
}

// Check if all images are confirmed
function checkConfirmation() {
    const allConfirmed = images.length > 0 && images.every(img => img.worker);
    sendButton.style.display = allConfirmed ? 'flex' : 'none';
}

// Update preview container
async function updatePreviewContainer() {
    previewContainer.innerHTML = '';
    for (let i = 0; i < images.length; i++) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${images[i].dataUrl}" class="preview-image" alt="Preview">
            <div class="preview-actions">
                <button class="action-button delete-button" onclick="removeImage(${i})">🗑️</button>
                <button class="action-button confirm-button" onclick="confirmImage(${i})">✓</button>
            </div>
        `;

        const workerSelect = await createWorkerSelect(i);
        if (images[i].worker) {
            const searchInput = workerSelect.querySelector('.search-input');
            const select = workerSelect.querySelector('.worker-select');
            select.value = images[i].worker.value;
            searchInput.value = images[i].worker.label;
        }
        previewItem.appendChild(workerSelect);
        previewContainer.appendChild(previewItem);
    }
}

// Send images to Telegram
sendButton.addEventListener('click', async () => {
    const group = groupSelect.value;
    const finca = fincaSelect.value;

    if (!group || !finca) {
        alert('Please select a group and finca.');
        return;
    }

    for (const image of images) {
        if (!image.worker) continue;

        const formData = new FormData();
        formData.append('chat_id', group);
        formData.append('photo', image.file);
        formData.append('caption', `${image.worker.label} ( ${finca} )`);

        console.log('Sending data:', {
            chat_id: group,
            photo: image.file,
            caption: `${image.worker.label} ( ${finca} )`
        });

        try {
            const response = await fetch('https://api.telegram.org/bot7561853556:AAElzI6FYzNb6yNUV6EA_Bnzkec2hUrcP70/sendPhoto', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            console.log('Telegram API response:', result);
            if (result.ok) {
                console.log('Image sent successfully!');
            } else {
                console.error('Error sending image:', result);
            }
        } catch (error) {
            console.error('Error sending image:', error);
        }
    }

    // Clear form after successful send
    images = [];
    updatePreviewContainer();
    sendButton.style.display = 'none';
});
