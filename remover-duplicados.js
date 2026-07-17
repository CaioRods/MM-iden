const fs = require("fs");

// Lendo o arquivo original
const texto = fs.readFileSync("data.js", "utf8");

// 1. Regex aprimorada para capturar o objeto completo, 
// lidando com quebras de linha e diferentes delimitadores
const regexBloco = /\{[\s\S]*?codigo:\s*'([^']+)'.*?\}/g;

let produtosExtraidos = [];
let match;

while ((match = regexBloco.exec(texto)) !== null) {
    const bloco = match[0];

    // Captura o código (sempre aspas simples)
    const codigo = bloco.match(/codigo:\s*'([^']+)'/)?.[1];
    
    // Captura o produto (aceita aspas simples ' ou crase `)
    // O grupo [1] ou [2] pegará o conteúdo dependendo do delimitador
    const produtoMatch = bloco.match(/produto:\s*[`']([\s\S]*?)[`']/);
    let produto = produtoMatch ? produtoMatch[1].trim() : null;

    // Captura a quantidade (aspas simples)
    const quantidadeMatch = bloco.match(/quantidade:\s*'([^']*)'/);
    const quantidade = quantidadeMatch ? quantidadeMatch[1] : "";

    if (codigo && produto) {
        // Limpeza estética: remove escapes de barra e crases internas
        produto = produto.replace(/\\/g, "").replace(/`/g, "");
        
        produtosExtraidos.push({ 
            codigo, 
            produto, 
            quantidade: quantidade || " " 
        });
    }
}

// 2. Remoção de duplicados usando Map (por código)
const mapa = new Map();
produtosExtraidos.forEach(p => {
    if (!mapa.has(p.codigo)) {
        mapa.set(p.codigo, p);
    }
});

const unicos = Array.from(mapa.values());

// 3. Geração do arquivo de saída com formatação estética
let conteudo = "const produtos = [\n\n";

unicos.forEach(p => {
    // Usando template strings para manter o padrão profissional
    conteudo += `  { codigo: '${p.codigo}', produto: \`${p.produto}\`, quantidade: '${p.quantidade}' },\n`;
});

conteudo += "\n];\n\nmodule.exports = produtos;";

fs.writeFileSync("datalimpo.js", conteudo);

console.log(`✅ Sucesso!`);
console.log(`📊 Total processado: ${produtosExtraidos.length}`);
console.log(`✨ Produtos únicos: ${unicos.length}`);
console.log(`📂 Arquivo 'datalimpo.js' gerado com acabamento profissional.`);