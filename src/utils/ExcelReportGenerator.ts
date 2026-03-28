import { SessionReport, ApplicationRecord, ApplicationStatus } from '../types';
import ExcelJS from 'exceljs';

/**
 * Excel Report Generator for Job Application Sessions
 * Generates Excel files with job application data
 */
export class ExcelReportGenerator {
  
  /**
   * Generate Excel report from session data
   * @param sessionReport Session report data
   * @param sessionId Session identifier
   * @returns Buffer containing Excel file data
   */
  async generateExcelReport(sessionReport: SessionReport, sessionId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Intelligent Job Agent';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Create Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    this.createSummarySheet(summarySheet, sessionReport, sessionId);
    
    // Create Successful Applications sheet
    const successSheet = workbook.addWorksheet('Successful Applications');
    const successful = sessionReport.applications.filter(app => app.status === ApplicationStatus.Success);
    this.createApplicationsSheet(successSheet, successful, false);
    
    // Create Failed Applications sheet
    const failedSheet = workbook.addWorksheet('Failed Applications');
    const failed = sessionReport.applications.filter(app => app.status === ApplicationStatus.Failed);
    this.createApplicationsSheet(failedSheet, failed, true);
    
    // Create All Applications sheet
    const allSheet = workbook.addWorksheet('All Applications');
    this.createApplicationsSheet(allSheet, sessionReport.applications, true);
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
  
  private createSummarySheet(sheet: ExcelJS.Worksheet, report: SessionReport, sessionId: string): void {
    // Title
    sheet.mergeCells('A1:B1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Job Search Session Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Session info
    sheet.getCell('A3').value = 'Session ID:';
    sheet.getCell('B3').value = sessionId;
    sheet.getCell('A4').value = 'Generated:';
    sheet.getCell('B4').value = new Date().toISOString();
    
    // Summary statistics
    sheet.getCell('A6').value = 'SUMMARY STATISTICS';
    sheet.getCell('A6').font = { bold: true, size: 12 };
    
    const summaryData = [
      ['Total Jobs Scanned:', report.summary.totalScanned],
      ['Jobs Eliminated:', report.summary.eliminated],
      ['Jobs Scored:', report.summary.scored],
      ['Applications Submitted:', report.summary.applied],
      ['Applications Failed:', report.summary.failed],
      ['Success Rate:', report.summary.applied > 0 ? `${((report.summary.applied / (report.summary.applied + report.summary.failed)) * 100).toFixed(1)}%` : 'N/A']
    ];
    
    summaryData.forEach((row, index) => {
      sheet.getCell(`A${7 + index}`).value = row[0];
      sheet.getCell(`B${7 + index}`).value = row[1];
    });
    
    // Style the summary
    sheet.getColumn('A').width = 30;
    sheet.getColumn('B').width = 20;
    sheet.getColumn('A').font = { bold: true };
  }
  
  private createApplicationsSheet(sheet: ExcelJS.Worksheet, applications: ApplicationRecord[], includeError: boolean): void {
    // Define columns
    const columns: any[] = [
      { header: 'Job Title', key: 'jobTitle', width: 30 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Attempts', key: 'attempts', width: 10 },
      { header: 'Timestamp', key: 'timestamp', width: 20 }
    ];
    
    if (includeError) {
      columns.push({ header: 'Error', key: 'error', width: 40 });
    }
    
    sheet.columns = columns;
    
    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Add data rows
    applications.forEach(app => {
      const row: any = {
        jobTitle: app.jobTitle,
        company: app.company,
        score: app.score,
        status: app.status,
        attempts: app.attempts,
        timestamp: app.timestamp.toISOString()
      };
      
      if (includeError) {
        row.error = app.error || '';
      }
      
      sheet.addRow(row);
    });
    
    // Add conditional formatting for scores
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        const scoreCell = row.getCell('score');
        const score = Number(scoreCell.value);
        
        if (score >= 75) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF92D050' } // Green
          };
        } else if (score >= 50) {
          scoreCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC000' } // Orange
          };
        }
      }
    });
  }
  
  /**
   * Generate detailed Excel report with multiple sheets
   * @param sessionReport Session report data
   * @param sessionId Session identifier
   * @returns Buffer containing Excel file data
   */
  async generateDetailedExcelReport(sessionReport: SessionReport, sessionId: string): Promise<Buffer> {
    return this.generateExcelReport(sessionReport, sessionId);
  }
  
  /**
   * Get filename for the Excel report
   * @param sessionId Session identifier
   * @returns Filename string
   */
  getReportFilename(sessionId: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `job-search-report-${sessionId}-${timestamp}.xlsx`;
  }
  
  /**
   * Get MIME type for the report file
   * @returns MIME type string
   */
  getReportMimeType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  
  /**
   * Generate summary statistics for the report
   * @param applications List of application records
   * @returns Summary statistics object
   */
  private generateSummaryStats(applications: ApplicationRecord[]) {
    const stats = {
      total: applications.length,
      successful: 0,
      failed: 0,
      pending: 0,
      retrying: 0,
      averageScore: 0,
      totalAttempts: 0
    };
    
    let totalScore = 0;
    
    applications.forEach(app => {
      switch (app.status) {
        case ApplicationStatus.Success:
          stats.successful++;
          break;
        case ApplicationStatus.Failed:
          stats.failed++;
          break;
        case ApplicationStatus.Pending:
          stats.pending++;
          break;
        case ApplicationStatus.Retrying:
          stats.retrying++;
          break;
      }
      
      totalScore += app.score;
      stats.totalAttempts += app.attempts;
    });
    
    stats.averageScore = applications.length > 0 ? totalScore / applications.length : 0;
    
    return stats;
  }
  
  /**
   * Format application record for CSV export
   * @param app Application record
   * @returns Formatted CSV row
   */
  private formatApplicationForCSV(app: ApplicationRecord): string {
    const fields = [
      `"${app.jobTitle}"`,
      `"${app.company}"`,
      app.score.toString(),
      app.status,
      app.attempts.toString(),
      `"${app.timestamp.toISOString()}"`,
      app.error ? `"${app.error.replace(/"/g, '""')}"` : '""'
    ];
    
    return fields.join(',');
  }
}