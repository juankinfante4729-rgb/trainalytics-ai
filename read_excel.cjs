const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('C:\\\\Proyectos\\\\trainalytics-ai\\\\Informe de Notas Ruta 1 Nuevo Vendedor.xlsx');
let out = '';
workbook.SheetNames.forEach(sheetName => {
    out += `=== Sheet: ${sheetName} ===\n`;
    const items = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    out += JSON.stringify(items.slice(0, 10), null, 2) + '\n';
});
fs.writeFileSync('out.json', out, 'utf8');
