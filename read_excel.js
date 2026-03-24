import fs from 'fs';
import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('C:\\\\Proyectos\\\\trainalytics-ai\\\\Informe de Notas Ruta 1 Nuevo Vendedor.xlsx');
workbook.SheetNames.forEach(sheetName => {
    console.log('=== Sheet:', sheetName, '===');
    const items = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log(items.slice(0, 10));
});
