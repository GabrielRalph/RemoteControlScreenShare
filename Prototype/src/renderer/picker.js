const { ipcRenderer } = require('electron');

async function loadSources() {
  const sources = await ipcRenderer.invoke('get-sources');
  const container = document.getElementById('sources');

  sources.forEach(source => {
    const div = document.createElement('div');
    div.className = 'source';
    div.innerHTML = `
      <img src="${source.thumbnail}" />
      <div class="source-name">${source.name}</div>
    `;
    
    div.onclick = () => {
      ipcRenderer.send('source-selected', source.id);
    };
    
    container.appendChild(div);
  });
}

loadSources();