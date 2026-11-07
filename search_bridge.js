chrome.storage.local.get(['lastCroppedImage'], (res) => {
  if (!res.lastCroppedImage) {
    document.body.innerHTML = '<h3>No image captured. Please try circling again.</h3>';
    return;
  }

  const dataUrl = res.lastCroppedImage;
  const preview = document.getElementById('crop-preview');
  if (preview) preview.src = dataUrl;

  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const blob = new Blob([u8arr], { type: mime });
  const file = new File([blob], 'circled_selection.jpg', { type: 'image/jpeg' });

  const form = document.createElement('form');
  form.method = 'POST';
  form.enctype = 'multipart/form-data';
  form.action = `https://lens.google.com/v3/upload?hl=en&re=df&st=${Date.now()}&ep=ccm`;
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'file';
  input.name = 'encoded_image';

  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
});
