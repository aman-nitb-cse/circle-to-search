const PROMPT_MAX = 300;

// The default prompt (set in the popup) is sent with every search as the text query.
function readDefaultPrompt(result) {
  if (result.defaultPromptEnabled === false) return '';
  if (typeof result.defaultPrompt !== 'string') return '';
  return result.defaultPrompt.replace(/\s+/g, ' ').trim().slice(0, PROMPT_MAX);
}

chrome.storage.local.get(['lastCroppedImage', 'defaultPrompt', 'defaultPromptEnabled'], (result) => {
  const dataUrl = result.lastCroppedImage;
  const prompt = readDefaultPrompt(result);
  chrome.storage.local.remove('lastCroppedImage');

  if (!dataUrl || typeof dataUrl !== 'string') {
    document.body.textContent = 'No image captured. Please try again.';
    return;
  }

  try {
    const parts = dataUrl.split(',');
    if (!parts[1]) throw new Error('Invalid image data.');
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], 'selected_area.jpg', { type: 'image/jpeg' });

    const form = document.createElement('form');
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    let action = `https://lens.google.com/v3/upload?hl=en&re=df&st=${Date.now()}&ep=ccm`;
    if (prompt) action += `&q=${encodeURIComponent(prompt)}`;
    form.action = action;
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'file';
    input.name = 'encoded_image';
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  } catch (error) {
    console.error('Circle to Search could not prepare the Google Lens upload:', error);
    document.body.textContent = 'Could not prepare the image. Please try again.';
  }
});
