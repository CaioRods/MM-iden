// script.js - ATUALIZADO

// ESTADO GLOBAL DO SISTEMA
let products = [];
let highlights = [];
let selectedProduct = null;
let currentView = 'catalog';
let currentFilter = 'all';



// ELEMENTOS DOM
const productsGrid = document.getElementById('productsGrid');
const highlightsGrid = document.getElementById('highlightsGrid');
const searchInput = document.getElementById('searchInput');
const modalAction = document.getElementById('modal-action');
const modalForm = document.getElementById('modal-form');
const modalCode = document.getElementById('modal-code');
const modalProductForm = document.getElementById('modal-product-form');
const printArea = document.getElementById('print-area');
const filterContainer = document.getElementById('filterContainer');

// INICIALIZAÇÃO
async function init() {
    const localDb = localStorage.getItem('mm_db_cache');
    if (localDb) {
        const data = JSON.parse(localDb);
        products = data.products;
        highlights = data.highlights;
    } else if (typeof initialData !== 'undefined') {
        products = initialData.products;
        highlights = initialData.highlights;
    }

    setupFilters();
    render();
    updateStats();
    setupEventListeners(); // Removido loadData e setInterval
    showToast("Sistema M&M Cebolas ID Pro Inicializado", "success");
}

async function loadData() {
    try {
        const response = await fetch(API_URL);
        if (response.ok) {
            const data = await response.json();
            const newDataStr = JSON.stringify(data);
            const oldDataStr = JSON.stringify({ products, highlights });
            
            if (newDataStr !== oldDataStr) {
                products = data.products.map(p => ({
                    ...p,
                    produto: p.produto.replace(/CAIXA/gi, 'CX')
                }));
                highlights = data.highlights;
                localStorage.setItem('mm_db_cache', JSON.stringify({ products, highlights }));
                render();
                updateStats();
            }
        }
    } catch (e) {
        console.warn("Servidor remoto offline. Usando dados locais.");
    }
}

async function saveData() {
    // Mantemos apenas o salvamento local para o usuário não perder o que digitar
    localStorage.setItem('mm_db_cache', JSON.stringify({ products, highlights }));
    updateStats();
    showToast("Alterações salvas no navegador", "success");
}

function updateStats() {
    document.getElementById('stat-total').textContent = products.length;
    document.getElementById('badge-highlights').textContent = `${highlights.length} itens`;
    document.getElementById('stat-session').textContent = sessionStorage.getItem('print_count') || 0;
}

function setupFilters() {
    const filters = [
        { id: 'all', label: 'Todos' },
        { id: 'cx', label: 'Caixas', keywords: ['CX'] },
        { id: 'frascos', label: 'Frascos', keywords: ['FRASCO'] },
        { id: 'mp', label: 'Matéria Prima', keywords: ['AROMA', 'CORANTE', 'POLPA', 'AMIDO', 'SAL', 'AÇUCAR', 'VINAGRE'] }
    ];

    filterContainer.innerHTML = '';
    filters.forEach(f => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${currentFilter === f.id ? 'active' : ''}`;
        btn.textContent = f.label;
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = f.id;
            render();
        };
        filterContainer.appendChild(btn);
    });
}

// RENDERIZAÇÃO ATUALIZADA COM QUANTIDADE
function render(query = '') {
    productsGrid.innerHTML = '';
    highlightsGrid.innerHTML = '';

    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 0);
    
    let filtered = products.filter(p => {
        const text = (p.codigo + ' ' + p.produto).toLowerCase();
        const matchesQuery = queryWords.length === 0 || queryWords.every(word => text.includes(word));
        
        if (!matchesQuery) return false;

        if (currentFilter === 'all') return true;
        if (currentFilter === 'cx') return p.produto.includes('CX');
        if (currentFilter === 'frascos') return p.produto.includes('FRASCO');
        if (currentFilter === 'mp') {
            const mpKeywords = ['AROMA', 'CORANTE', 'POLPA', 'AMIDO', 'SAL', 'AÇUCAR', 'VINAGRE'];
            return mpKeywords.some(k => p.produto.includes(k));
        }
        return true;
    });

    filtered.sort((a, b) => a.produto.localeCompare(b.produto));

    filtered.forEach(p => {
        const card = createCard(p);
        if (highlights.includes(p.codigo)) {
            highlightsGrid.appendChild(card.cloneNode(true));
        }
        if (currentView === 'catalog' || (currentView === 'favorites' && highlights.includes(p.codigo))) {
            productsGrid.appendChild(card);
        }
    });

    const highlightsSection = document.getElementById('section-highlights');
    if (highlights.length === 0 || currentView === 'favorites' || query !== '' || currentFilter !== 'all') {
        highlightsSection.classList.add('hidden');
    } else {
        highlightsSection.classList.remove('hidden');
    }

    rebindCardEvents();
}

function getOnionIcon(product) {
    const code = product.codigo;
    const name = product.produto.toLowerCase();
    
    let sizeClass = 'onion-medium';
    let colorClass = 'onion-yellow';
    
    // cx-1 is small yellow, cx-2 is medium yellow, cx-3 is large yellow, cebola roxa is medium roxa
    if (code === '101001') {
        sizeClass = 'onion-small';
        colorClass = 'onion-yellow';
    } else if (code === '101002') {
        sizeClass = 'onion-medium';
        colorClass = 'onion-yellow';
    } else if (code === '101003') {
        sizeClass = 'onion-large';
        colorClass = 'onion-yellow';
    } else if (code === '101004' || name.includes('roxa')) {
        sizeClass = 'onion-medium';
        colorClass = 'onion-purple';
    }
    
    return `
    <svg class="onion-svg ${sizeClass} ${colorClass}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 6C30 17 15 26 15 42A17 17 0 0 0 49 42C49 26 34 17 32 6Z" class="onion-body" />
        <path d="M32 6C27 20 25 32 32 59" class="onion-line" />
        <path d="M32 6C37 20 39 32 32 59" class="onion-line" />
    </svg>
    `;
}

// CARD ATUALIZADO COM BADGE DE QUANTIDADE E ÍCONE DE CEBOLA
function createCard(p) {
    const div = document.createElement('div');
    div.className = 'product-card zoom-anim';
    if (highlights.includes(p.codigo)) div.classList.add('is-highlight');
    div.dataset.id = p.codigo;
    
    div.innerHTML = `
        <div class="card-header-info">
            <span class="card-code">#${p.codigo}</span>
            ${(p.quantidade && p.quantidade.trim() !== "") ? `<span class="badge-qty-card">${p.quantidade}</span>` : ''}
        </div>
        <div class="card-icon-container">
            ${getOnionIcon(p)}
        </div>
        <h3 class="card-name">${p.produto}</h3>
        ${highlights.includes(p.codigo) ? '<i class="ri-star-fill card-star"></i>' : ''}
    `;
    return div;
}

function rebindCardEvents() {
    document.querySelectorAll('.product-card').forEach(card => {
        card.onclick = (e) => {
            selectedProduct = products.find(p => p.codigo === card.dataset.id);
            if (!selectedProduct) return;
            openPrintForm();
        };

        card.oncontextmenu = (e) => {
            e.preventDefault();
            selectedProduct = products.find(p => p.codigo === card.dataset.id);
            if (!selectedProduct) return;
            openActionModal(selectedProduct.codigo);
        };
    });
}

// MODAIS ATUALIZADOS
function openPrintForm() {
    closeModal();
    
    // 1. Preenche dados fixos do produto selecionado
    document.getElementById('preview-code').textContent = selectedProduct.codigo;
    document.getElementById('preview-name').textContent = selectedProduct.produto;
    
    // 2. RESET TOTAL DOS CAMPOS (Limpa a identificação anterior)
    if(document.getElementById('input-nf')) document.getElementById('input-nf').value = "";
    if(document.getElementById('input-lote')) document.getElementById('input-lote').value = "";
    if(document.getElementById('input-validade')) document.getElementById('input-validade').value = "";
    
    // 3. LÓGICA DE QUANTIDADE AUTOMÁTICA
    const inputQty = document.getElementById('input-qty');
    if (inputQty) {
        // Se o produto tiver quantidade cadastrada, preenche. Se não, limpa.
        inputQty.value = (selectedProduct.quantidade && selectedProduct.quantidade.trim() !== "") 
                         ? selectedProduct.quantidade 
                         : "";
    }
    
    modalForm.classList.remove('hidden');
}

function openActionModal(id) {
    closeModal();
    document.getElementById('preview-code').textContent = selectedProduct.codigo;
    document.getElementById('preview-name').textContent = selectedProduct.produto;
    
    const isHigh = highlights.includes(selectedProduct.codigo);
    const btnHighlight = document.getElementById('btn-toggle-highlight');
    if (btnHighlight) {
        btnHighlight.innerHTML = `
            <div class="card-icon"><i class="ri-star-${isHigh ? 'fill' : 'line'}"></i></div>
            <div class="card-info">
                <strong>${isHigh ? 'Remover Destaque' : 'Adicionar Destaque'}</strong>
                <span>${isHigh ? 'Tirar da lista rápida' : 'Fixar no topo'}</span>
            </div>
        `;
    }
    modalAction.classList.remove('hidden');
}

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

// CRUD ATUALIZADO COM CAMPO QUANTIDADE
async function handleSaveProduct() {
    const codeEl = document.getElementById('prod-code');
    const nameEl = document.getElementById('prod-name');
    const qtyEl = document.getElementById('prod-qty'); // ID que deve estar no seu HTML

    if (!codeEl || !nameEl) return;

    const code = codeEl.value.trim();
    const name = nameEl.value.trim().toUpperCase().replace(/CAIXA/gi, 'CX');
    const qty = qtyEl ? qtyEl.value.trim() : " ";

    if (!code || !name) {
        showToast("Preencha código e nome", "error");
        return;
    }

    const updatedData = { codigo: code, produto: name, quantidade: qty };

    if (selectedProduct) {
        const idx = products.findIndex(p => p.codigo === selectedProduct.codigo);
        if (idx !== -1) products[idx] = updatedData;
    } else {
        products.push(updatedData);
    }

    await saveData();
    render();
    closeModal();
}

async function handleDeleteProduct() {
    if (!selectedProduct) return;
    if (confirm(`Excluir permanentemente: ${selectedProduct.produto}?`)) {
        products = products.filter(p => p.codigo !== selectedProduct.codigo);
        highlights = highlights.filter(h => h !== selectedProduct.codigo);
        await saveData();
        render();
        closeModal();
        showToast("Produto removido");
    }
}

async function toggleHighlight() {
    if (!selectedProduct) return;
    const id = selectedProduct.codigo;
    if (highlights.includes(id)) {
        highlights = highlights.filter(h => h !== id);
        showToast("Removido dos destaques");
    } else {
        highlights.push(id);
        showToast("Adicionado aos destaques", "success");
    }
    await saveData();
    render();
    closeModal();
}

// EVENT LISTENERS
function setupEventListeners() {
    searchInput.oninput = (e) => render(e.target.value);
    window.onkeydown = (e) => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape') closeModal();
    };

    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            render();
            if (window.innerWidth <= 768) document.getElementById('app-sidebar').classList.remove('open');
        };
    });

    document.getElementById('mobile-menu-toggle').onclick = () => {
        document.getElementById('app-sidebar').classList.toggle('open');
    };

    document.getElementById('sidebar-add-btn').onclick = () => {
        selectedProduct = null;
        document.getElementById('product-modal-title').textContent = "Novo Material";
        document.getElementById('prod-code').value = "";
        document.getElementById('prod-name').value = "";
        // Limpa o novo campo de quantidade se existir
        if(document.getElementById('prod-qty')) document.getElementById('prod-qty').value = "";
        modalProductForm.classList.remove('hidden');
    };

    document.getElementById('sidebar-export-btn').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({products, highlights}));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = "backup_mm_id.json";
        a.click();
        showToast("Backup exportado");
    };

    document.getElementById('theme-light').onclick = () => {
        document.body.className = 'theme-light';
        document.getElementById('theme-light').classList.add('active');
        document.getElementById('theme-dark').classList.remove('active');
    };
    document.getElementById('theme-dark').onclick = () => {
        document.body.className = 'theme-dark';
        document.getElementById('theme-dark').classList.add('active');
        document.getElementById('theme-light').classList.remove('active');
    };

    document.querySelectorAll('.close-modal, .close-modal-fs').forEach(btn => {
        btn.onclick = closeModal;
    });

    document.getElementById('btn-open-form').onclick = openPrintForm;

    document.getElementById('btn-show-code').onclick = () => {
        closeModal();
        document.getElementById('display-code-fs').textContent = selectedProduct.codigo;
        document.getElementById('display-name-fs').textContent = selectedProduct.produto;
        modalCode.classList.remove('hidden');
    };

    document.getElementById('btn-edit-product-trigger').onclick = () => {
        document.getElementById('product-modal-title').textContent = "Editar Material";
        document.getElementById('prod-code').value = selectedProduct.codigo;
        document.getElementById('prod-name').value = selectedProduct.produto;
        // Preenche a quantidade no modal de edição
        if(document.getElementById('prod-qty')) document.getElementById('prod-qty').value = selectedProduct.quantidade || "";
        closeModal();
        modalProductForm.classList.remove('hidden');
    };

    if (!document.getElementById('btn-toggle-highlight')) {
        const btnHighlight = document.createElement('button');
        btnHighlight.id = 'btn-toggle-highlight';
        btnHighlight.className = 'action-card-v2';
        btnHighlight.onclick = toggleHighlight;
        document.querySelector('.action-grid-v2').appendChild(btnHighlight);
    }

    document.getElementById('btn-delete-product-trigger').onclick = handleDeleteProduct;
    document.getElementById('btn-save-product').onclick = handleSaveProduct;
    document.getElementById('btn-copy-code').onclick = () => {
        navigator.clipboard.writeText(selectedProduct.codigo);
        showToast("Código copiado", "success");
    };

    document.getElementById('btn-generate-print').onclick = generatePrint;
    
    document.getElementById('close-print').onclick = () => printArea.classList.add('hidden');
}

// IMPRESSÃO (Sem alterações na lógica de impressão)
function generatePrint() {
    const opType = document.querySelector('input[name="op-type"]:checked').value;
    const nf = document.getElementById('input-nf').value || "---";
    const qty = document.getElementById('input-qty').value || "---";
    const lote = document.getElementById('input-lote').value || "---";
    const validadeRaw = document.getElementById('input-validade').value;
    
    // 1. CAPTURA SE A CHECKBOX DE ALERGÊNICO ESTÁ MARCADA
    const isAlergenico = document.getElementById('input-alergenico') ? document.getElementById('input-alergenico').checked : false;
    
    // 2. CAPTURA OS ELEMENTOS DA FOLHA DE IMPRESSÃO QUE SERÃO ALTERADOS/REORDENADOS
    const sectionTitle = document.getElementById('print-section-title');
    const gridHeader = document.getElementById('print-grid-header');
    const gridValues = document.getElementById('print-grid-values');
    
    const headerQty = document.getElementById('header-qty');
    const headerLote = document.getElementById('header-lote');
    const headerValidade = document.getElementById('header-validade');
    
    const cellQty = document.getElementById('print-qty');
    const cellLote = document.getElementById('print-lote');
    const cellValidade = document.getElementById('print-validade');

    // 3. APLICA A LÓGICA CONDICIONAL DE ALERGÊNICO (ORDEM E TEXTOS)
    if (isAlergenico) {
        // Altera o título da seção conforme solicitado
        if (sectionTitle) sectionTitle.textContent = "MATERIAL ALERGÊNICO";
        
        // Inverte a ordem física no Cabeçalho: Quantidade -> Data Validade -> Lote
        if (gridHeader && headerQty && headerLote && headerValidade) {
            gridHeader.innerHTML = '';
            gridHeader.appendChild(headerQty);
            gridHeader.appendChild(headerValidade); // Validade vem primeiro
            gridHeader.appendChild(headerLote);     // Lote vai por último
            
            // Reajusta classes de borda para manter o layout perfeito
            headerQty.className = "tbl-cell g-col";
            headerValidade.className = "tbl-cell g-col border-left";
            headerLote.className = "tbl-cell g-col border-left";
        }
        
        // Inverte a ordem física nos Valores: Quantidade -> Data Validade -> Lote
        if (gridValues && cellQty && cellLote && cellValidade) {
            gridValues.innerHTML = '';
            gridValues.appendChild(cellQty);
            gridValues.appendChild(cellValidade); // Validade vem primeiro
            gridValues.appendChild(cellLote);     // Lote vai por último
            
            // Reajusta classes de borda para manter o layout perfeito
            cellQty.className = "tbl-cell g-val qnt";
            cellValidade.className = "tbl-cell g-val border-left";
            cellLote.className = "tbl-cell g-val border-left lote";
        }
    } else {
        // SE NÃO FOR ALERGÊNICO: Retorna exatamente ao modelo padrão original
        if (sectionTitle) sectionTitle.textContent = "CÓDIGO/DESCRIÇÃO MATERIAL";
        
        // Ordem Padrão: Quantidade -> Lote -> Data Validade
        if (gridHeader && headerQty && headerLote && headerValidade) {
            gridHeader.innerHTML = '';
            gridHeader.appendChild(headerQty);
            gridHeader.appendChild(headerLote);
            gridHeader.appendChild(headerValidade);
            
            headerQty.className = "tbl-cell g-col";
            headerLote.className = "tbl-cell g-col border-left";
            headerValidade.className = "tbl-cell g-col border-left";
        }
        
        if (gridValues && cellQty && cellLote && cellValidade) {
            gridValues.innerHTML = '';
            gridValues.appendChild(cellQty);
            gridValues.appendChild(cellLote);
            gridValues.appendChild(cellValidade);
            
            cellQty.className = "tbl-cell g-val qnt";
            cellLote.className = "tbl-cell g-val border-left lote";
            cellValidade.className = "tbl-cell g-val border-left";
        }
    }

    // 4. PROCESSAMENTO DOS DADOS E PREENCHIMENTO DOS CAMPOS (SEU CÓDIGO ORIGINAL)
    let valFormatted = "00/00/0000";
    if(validadeRaw) { 
        const p = validadeRaw.split('-'); 
        valFormatted = `${p[2]}/${p[1]}/${p[0]}`; 
    }

    document.getElementById('print-date').textContent = new Date().toLocaleDateString('pt-BR');
    document.getElementById('print-code').textContent = selectedProduct.codigo;
    document.getElementById('print-product').textContent = selectedProduct.produto;
    document.getElementById('print-qty').textContent = qty;
    document.getElementById('print-lote').textContent = lote;
    document.getElementById('print-validade').textContent = valFormatted;
    document.getElementById('print-nf').textContent = nf;
    document.getElementById('print-day-lot').textContent = String(getDayOfYear()).padStart(3, '0');

    document.getElementById('box-rec').classList.toggle('checked', opType === 'recebimento');
    document.getElementById('box-dev').classList.toggle('checked', opType === 'devolucao');

    // 5. FINALIZAÇÃO DA EXIBIÇÃO (SEU CÓDIGO ORIGINAL)
    closeModal();
    printArea.classList.remove('hidden');
    
    let count = parseInt(sessionStorage.getItem('print_count') || 0) + 1;
    sessionStorage.setItem('print_count', count);
    updateStats();

    setTimeout(adjustProductFontSize, 10);
}

function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function adjustProductFontSize() {
    const container = document.querySelector('.big-content-row');
    const wrapper = document.querySelector('.container-produto-ajustavel');
    const productEl = document.getElementById('print-product');
    if (!productEl || !wrapper || !container) return;

    let size = 48;
    productEl.style.fontSize = size + "pt";
    const maxWidth = container.clientWidth - 40; 
    while (wrapper.scrollWidth > maxWidth && size > 16) {
        size -= 1;
        productEl.style.fontSize = size + "pt";
    }
}

// TOAST
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'ri-checkbox-circle-fill' : (type === 'error' ? 'ri-error-warning-fill' : 'ri-information-fill');
    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// LÓGICA 3D (Mantida original)
const sheet = document.querySelector('.sheet-viewport');
const overlay = document.querySelector('.print-overlay');
let isDragging = false;
let startX, startY;
let currentRotX = 0, currentRotY = 0;
let velX = 0, velY = 0;
let currentZoom = 0.6;
let resetTimer;

function applyTransform() {
    if (sheet) sheet.style.transform = `scale(${currentZoom}) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
}

function physicsLoop() {
    if (!isDragging) {
        velX *= 0.95; velY *= 0.95;
        currentRotY += velX; currentRotX += velY;
        applyTransform();
    }
    requestAnimationFrame(physicsLoop);
}
physicsLoop();

overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay || e.target === sheet) {
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        if (sheet) sheet.style.transition = "none";
        clearTimeout(resetTimer);
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    velX = dx * 0.15; velY = -dy * 0.15;
    currentRotY += velX; currentRotX += velY;
    startX = e.clientX; startY = e.clientY;
    applyTransform();
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
            if (sheet) {
                sheet.style.transition = "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
                currentRotX = 0; currentRotY = 0;
                applyTransform();
            }
        }, 2500);
    }
});
// --- Lógica do Editor de Texto Flutuante (M&M) ---

const textToolbar = document.getElementById('text-editor-toolbar');
const fontSizeInput = document.getElementById('font-size-input');
let currentSelectionRange = null;

// Salva a seleção atual antes que o foco mude para o toolbar
function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        currentSelectionRange = selection.getRangeAt(0);
    }
}

// Restaura a seleção salva para aplicar o estilo
function restoreSelection() {
    if (currentSelectionRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(currentSelectionRange);
    }
}

// Detecta seleção e exibe o toolbar
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText.length > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer.nodeType === 3 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;

        // Verifica se está na folha de identificação
        if (container.closest('.official-sheet')) {
            const rect = range.getBoundingClientRect();
            
            saveSelection(); // Salva a seleção IMEDIATAMENTE

            textToolbar.classList.add('active');
            // Posicionamento considerando scroll e zoom da folha
            textToolbar.style.top = `${rect.top - 65}px`; 
            textToolbar.style.left = `${rect.left + (rect.width / 2) - (textToolbar.offsetWidth / 2)}px`;
            
            // Sincroniza o tamanho da fonte
            const computedSize = window.getComputedStyle(container).fontSize;
            if (fontSizeInput) fontSizeInput.value = parseInt(computedSize);

            // Garante que o container seja editável
            const editableParent = container.closest('.official-sheet [contenteditable="true"]') || container;
            if (editableParent && !editableParent.hasAttribute('contenteditable')) {
                editableParent.contentEditable = true;
            }
        }
    } else {
        // Só esconde se o foco não estiver dentro do toolbar
        if (!document.activeElement.closest('#text-editor-toolbar')) {
            textToolbar.classList.remove('active');
            currentSelectionRange = null; // Limpa a seleção salva
        }
    }
});

// Impede que o clique no toolbar limpe a seleção do texto
textToolbar.addEventListener('mousedown', (e) => {
    // Se clicou no input de tamanho, deixa o navegador focar nele
    if (e.target !== fontSizeInput) {
        e.preventDefault(); 
    }
    e.stopPropagation();
});

function applyStyle(command, value = null) {
    restoreSelection(); // Garante que o estilo seja aplicado no texto certo
    document.execCommand(command, false, value);
    // Atualiza a seleção salva após a mudança
    saveSelection(); 
}

// Aplica tamanho exato ao digitar e dar Enter
fontSizeInput.addEventListener('change', (e) => {
    const size = e.target.value;
    if (size > 0 && size < 300) {
        applyExactFontSize(size);
    }
});

function applyExactFontSize(size) {
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Verifica se já existe um span de formatação puro
        let span = range.commonAncestorContainer.parentElement;
        if (span && span.tagName === 'SPAN' && span.style.cssText.includes('font-size')) {
            span.style.fontSize = size + 'px';
        } else {
            // Cria novo span
            span = document.createElement('span');
            span.style.fontSize = size + 'px';
            span.style.lineHeight = '1.1';
            try {
                span.appendChild(range.extractContents());
                range.insertNode(span);
            } catch (e) {
                // Fallback
                document.execCommand('fontSize', false, "3");
            }
        }
        // Resalva a seleção para os atalhos funcionarem em sequência
        saveSelection();
    }
}

// --- Lógica dos Atalhos (Shift + ↑/↓) ---
document.addEventListener('keydown', (e) => {
    const selection = window.getSelection();
    
    // Só funciona se houver texto selecionado na folha
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const container = selection.getRangeAt(0).commonAncestorContainer.parentElement;
        
        if (container.closest('.official-sheet')) {
            if (e.shiftKey) {
                let currentSize = parseInt(window.getComputedStyle(container).fontSize);
                let newSize = currentSize;

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    newSize = currentSize + 2; // Aumenta de 2 em 2px
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    newSize = currentSize - 2; // Diminui de 2 em 2px
                }

                if (newSize !== currentSize && newSize > 6 && newSize < 200) {
                    // Restaura a seleção antes de aplicar
                    restoreSelection();
                    applyExactFontSize(newSize);
                    
                    // Atualiza o input no modal se ele estiver visível
                    if (fontSizeInput) fontSizeInput.value = newSize;
                    
                    showToast(`Fonte: ${newSize}px`, "success");
                }
            }
        }
    }
});

overlay.addEventListener('wheel', (e) => {
    e.preventDefault();
    currentZoom += e.deltaY * -0.0008;
    currentZoom = Math.max(0.3, Math.min(1.8, currentZoom));
    applyTransform();
}, { passive: false });

init();

// Função para controlar o loader
const toggleLoader = (show) => {
    const loader = document.getElementById('app-loader-overlay');
    if (!loader) return;
    
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
};

// Executa assim que a página carrega
window.addEventListener('DOMContentLoaded', () => {
    // Mostra o loader imediatamente
    toggleLoader(true);


    setTimeout(() => {
        toggleLoader(false);
    }, 1500);
});

function renderizarEtiquetas() {
    toggleLoader(true);
    
    
    setTimeout(() => toggleLoader(false), 500);
}