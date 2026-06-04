import PDFDocument from 'pdfkit';
import { utils, write } from 'xlsx';
import { ExportRepository } from './export.repository';

export class ExportService {
  private repo = new ExportRepository();

  private buildXlsx(rows: Array<string[]>, sheetName: string) {
    const workbook = utils.book_new();
    const worksheet = utils.aoa_to_sheet(rows);
    utils.book_append_sheet(workbook, worksheet, sheetName);
    return write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }

  private async buildPdf(title: string, header: string[], rows: Array<string[]>) {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('error', (err) => {
      throw err;
    });

    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(11);

    const columnWidths = header.map(() => 140);
    const rowHeight = 20;
    let y = doc.y;

    header.forEach((value, index) => {
      doc.text(value, 40 + index * columnWidths[index], y, {
        width: columnWidths[index],
        continued: index < header.length - 1
      });
    });
    y += rowHeight;
    doc.moveDown(0.5);

    rows.forEach((row) => {
      row.forEach((value, index) => {
        doc.text(value, 40 + index * columnWidths[index], y, {
          width: columnWidths[index],
          continued: index < row.length - 1
        });
      });
      y += rowHeight;
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
    });

    doc.end();

    return Buffer.concat(buffers);
  }

  async productsCsv(companyId: string) {
    const products = await this.repo.getProducts(companyId);

    const header = [
      'Name',
      'Barcode',
      'Quantity',
      'Low Stock Threshold'
    ];

    const rows = products.map((product) => [
      product.name,
      product.barcode,
      product.inventory?.quantity ?? 0,
      product.lowStockThreshold
    ]);

    const csv = [
      header.join(','),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return csv;
  }

  async productsXlsx(companyId: string) {
    const products = await this.repo.getProducts(companyId);
    const rows = [
      ['Name', 'Barcode', 'Quantity', 'Low Stock Threshold'],
      ...products.map((product) => [
        product.name,
        product.barcode,
        String(product.inventory?.quantity ?? 0),
        String(product.lowStockThreshold)
      ])
    ];

    return this.buildXlsx(rows, 'Products');
  }

  async assetsXlsx(companyId: string) {
    const assets = await this.repo.getAssets(companyId);
    const rows = [
      ['Name', 'Barcode', 'Status', 'Created At'],
      ...assets.map((asset: any) => [
        asset.name,
        asset.barcode ?? '',
        asset.status ?? '',
        asset.createdAt ? new Date(asset.createdAt).toISOString() : ''
      ])
    ];

    return this.buildXlsx(rows, 'Assets');
  }

  async usersXlsx(companyId: string) {
    const users = await this.repo.getUsers(companyId);
    const rows = [
      ['Email', 'Role'],
      ...users.map((user: any) => [
        user.email,
        user.role?.name ?? ''
      ])
    ];

    return this.buildXlsx(rows, 'Users');
  }

  async productsPdf(companyId: string) {
    const products = await this.repo.getProducts(companyId);
    const header = ['Name', 'Barcode', 'Quantity', 'Low Stock Threshold'];
    const rows = products.map((product) => [
      product.name,
      product.barcode ?? '',
      String(product.inventory?.quantity ?? 0),
      String(product.lowStockThreshold)
    ]);

    return this.buildPdf('Products Export', header, rows);
  }

  async assetsPdf(companyId: string) {
    const assets = await this.repo.getAssets(companyId);
    const header = ['Name', 'Barcode', 'Status', 'Created At'];
    const rows = assets.map((asset: any) => [
      asset.name,
      asset.barcode ?? '',
      asset.status ?? '',
      asset.createdAt ? new Date(asset.createdAt).toISOString() : ''
    ]);

    return this.buildPdf('Assets Export', header, rows);
  }

  async usersPdf(companyId: string) {
    const users = await this.repo.getUsers(companyId);
    const header = ['Email', 'Role'];
    const rows = users.map((user: any) => [
      user.email,
      user.role?.name ?? ''
    ]);

    return this.buildPdf('Users Export', header, rows);
  }

  async assetsCsv(companyId: string) {
    const assets = await this.repo.getAssets(companyId);

    const header = [
      'Name',
      'Barcode',
      'Status',
      'Created At'
    ];

    const rows = assets.map((asset: any) => [
      asset.name,
      asset.barcode ?? '',
      asset.status ?? '',
      asset.createdAt ?? ''
    ]);

    const csv = [
      header.join(','),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return csv;
  }
  async usersCsv(companyId: string) {
    const users = await this.repo.getUsers(companyId);

    const header = [
      'Email',
      'Role'
    ];

    const rows = users.map((user: any) => [
      user.email,
      user.role?.name ?? ''
    ]);

    const csv = [
      header.join(','),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    return csv;
  }

  async companyJson(companyId: string) {
    const company = await this.repo.getCompanyBackup(companyId);
    const auditLogs = await this.repo.getAuditLogs(companyId);

    return {
      exportedAt: new Date().toISOString(),
      company,
      auditLogs
    };
  }
}