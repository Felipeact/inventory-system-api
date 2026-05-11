import { ExportRepository } from './export.repository';

export class ExportService {
  private repo = new ExportRepository();

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