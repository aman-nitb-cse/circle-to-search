chrome.storage.local.get(['lastCroppedImage'], (result) => {
  const dataUrl = result.lastCroppedImage;
  // Remove the temporary image from extension storage as soon as the bridge reads it.
  chrome.storage.local.remove('lastCroppedImage');

  if (!dataUrl || typeof dataUrl !== 'string') {
    document.body.innerHTML = '<h3>No image captured. Please try selecting an area again.</h3>';
    return;
  }

  const preview = document.getElementById('crop-preview');
  if (preview) preview.src = dataUrl;

  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch || !parts[1]) throw new Error('Invalid image data.');
    const mime = mimeMatch[1];
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const file = new File([blob], 'selected_area.jpg', { type: 'image/jpeg' });

    const form = document.createElement('form');
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    form.action = `https://lens.google.com/v3/upload?hl=en&re=df&st=${Date.now()}&ep=ccm`;
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
    document.body.innerHTML = '<h3>Could not prepare the image. Please try again.</h3>';
  }
});
