/**
 * Export data array to a CSV file (Excel-compatible).
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean)[][]
) {
  const sanitize = (val: string | number | boolean) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a structured browser print dialog designed as an official Ethio-Re report.
 */
export function printReportDocument(
  title: string,
  companyName: string,
  headers: string[],
  rows: (string | number | boolean)[][],
  filtersSummary?: string,
  logoUrl?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - ${companyName}</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            font-size: 12px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0B2A5E;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .header-logo {
            max-height: 52px;
            max-width: 140px;
            object-fit: contain;
            border-radius: 6px;
            padding: 2px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
          }
          .header-logo-emblem {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            background: linear-gradient(135deg, #002855 0%, #004080 100%);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #002855;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .brand-title {
            font-size: 18px;
            font-weight: 700;
            color: #0B2A5E;
            margin: 0 0 4px 0;
          }
          .report-title {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin: 0;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .filter-bar {
            background-color: #f1f5f9;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            color: #475569;
            margin-bottom: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background-color: #0B2A5E;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 32px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            ${
              logoUrl
                ? `<img src="${logoUrl}" alt="${companyName} Logo" class="header-logo" onerror="this.style.display='none'; document.getElementById('report-fallback-logo').style.display='inline-flex';" />
                   <div id="report-fallback-logo" style="display:none;" class="header-logo-emblem">
                     <svg viewBox="0 0 40 40" fill="none" style="width: 32px; height: 32px;" xmlns="http://www.w3.org/2000/svg">
                       <path d="M20 3L36 12V24L20 37L4 24V12L20 3Z" stroke="#D4AF37" stroke-width="2.2" stroke-linejoin="round" fill="#002855"/>
                       <path d="M20 9L29 15V23L20 31L11 23V15L20 9Z" fill="rgba(255, 255, 255, 0.18)" stroke="white" stroke-width="1.6"/>
                       <circle cx="20" cy="20" r="3.5" fill="#D4AF37" />
                       <path d="M14 20H26M20 14V26" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
                     </svg>
                   </div>`
                : `<div class="header-logo-emblem">
                     <svg viewBox="0 0 40 40" fill="none" style="width: 32px; height: 32px;" xmlns="http://www.w3.org/2000/svg">
                       <path d="M20 3L36 12V24L20 37L4 24V12L20 3Z" stroke="#D4AF37" stroke-width="2.2" stroke-linejoin="round" fill="#002855"/>
                       <path d="M20 9L29 15V23L20 31L11 23V15L20 9Z" fill="rgba(255, 255, 255, 0.18)" stroke="white" stroke-width="1.6"/>
                       <circle cx="20" cy="20" r="3.5" fill="#D4AF37" />
                       <path d="M14 20H26M20 14V26" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
                     </svg>
                   </div>`
            }
            <div>
              <h1 class="brand-title">${companyName}</h1>
              <div class="report-title">${title}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${dateStr}</div>
            <div><strong>System:</strong> Ethio-Re HRMS Enterprise</div>
          </div>
        </div>
        ${filtersSummary ? `<div class="filter-bar"><strong>Report Scope:</strong> ${filtersSummary}</div>` : ''}
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell !== undefined && cell !== null ? String(cell) : '-'}</td>`).join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>Confidential — For Authorized Ethiopian Reinsurance S.C. Personnel Only</div>
          <div>Total Records: ${rows.length}</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
