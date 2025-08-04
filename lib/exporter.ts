/**
 * CSV Export Utility
 * 
 * Provides CSV export functionality for various data types
 * in the Sales and Stock Manager application.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Product, SalesTransaction, SalesTransactionItem } from './supabase';
import { formatCurrency, formatDate } from './utils';
import { errorHandler } from './errorHandler';

export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: 'iso' | 'readable';
  currencyFormat?: 'pence' | 'formatted';
  delimiter?: string;
  encoding?: FileSystem.EncodingType;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  recordCount?: number;
}

class CSVExporter {
  private defaultOptions: Required<ExportOptions> = {
    filename: `export_${new Date().toISOString().split('T')[0]}.csv`,
    includeHeaders: true,
    dateFormat: 'readable',
    currencyFormat: 'formatted',
    delimiter: ',',
    encoding: FileSystem.EncodingType.UTF8,
  };

  /**
   * Export products to CSV
   */
  public async exportProducts(
    products: Product[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const opts = { ...this.defaultOptions, ...options };
    opts.filename = options.filename || `products_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      const headers = [
        'ID',
        'Name',
        'SKU',
        'Barcode',
        'Category',
        'Description',
        'Quantity',
        'Low Stock Threshold',
        'Unit Price',
        'Location',
        'Image URL',
        'Created At',
        'Updated At',
      ];

      const rows = products.map(product => [
        product.id,
        product.name,
        product.sku,
        product.barcode || '',
        product.category || '',
        product.description || '',
        product.quantity.toString(),
        product.low_stock_threshold.toString(),
        this.formatCurrency(product.unit_price, opts.currencyFormat),
        product.location || '',
        product.image_url || '',
        this.formatDate(product.created_at, opts.dateFormat),
        this.formatDate(product.updated_at, opts.dateFormat),
      ]);

      const csvContent = this.generateCSV(headers, rows, opts);
      return await this.writeAndShareFile(csvContent, opts.filename, opts.encoding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorHandler.handle(
        errorHandler.createStorageError(
          `Failed to export products: ${errorMessage}`,
          { component: 'CSVExporter', action: 'exportProducts' },
          error instanceof Error ? error : undefined
        )
      );
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Export sales transactions to CSV
   */
  public async exportSalesTransactions(
    transactions: SalesTransaction[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const opts = { ...this.defaultOptions, ...options };
    opts.filename = options.filename || `sales_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      const headers = [
        'Transaction ID',
        'Store ID',
        'Total',
        'Status',
        'Customer Name',
        'Customer Email',
        'Customer Phone',
        'Payment Method',
        'Notes',
        'Items Count',
        'Created At',
        'Updated At',
        'Items Detail',
      ];

      const rows = transactions.map(transaction => [
        transaction.id,
        transaction.store_id || '',
        this.formatCurrency(transaction.total, opts.currencyFormat),
        transaction.status,
        transaction.customer_name || '',
        transaction.customer_email || '',
        transaction.customer_phone || '',
        transaction.payment_method || '',
        transaction.notes || '',
        transaction.items.length.toString(),
        this.formatDate(transaction.created_at, opts.dateFormat),
        this.formatDate(transaction.updated_at, opts.dateFormat),
        this.formatTransactionItems(transaction.items, opts),
      ]);

      const csvContent = this.generateCSV(headers, rows, opts);
      return await this.writeAndShareFile(csvContent, opts.filename, opts.encoding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorHandler.handle(
        errorHandler.createStorageError(
          `Failed to export sales transactions: ${errorMessage}`,
          { component: 'CSVExporter', action: 'exportSalesTransactions' },
          error instanceof Error ? error : undefined
        )
      );
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Export sales transactions with detailed items (separate rows for each item)
   */
  public async exportSalesTransactionsDetailed(
    transactions: SalesTransaction[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const opts = { ...this.defaultOptions, ...options };
    opts.filename = options.filename || `sales_detailed_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      const headers = [
        'Transaction ID',
        'Store ID',
        'Transaction Total',
        'Transaction Status',
        'Customer Name',
        'Payment Method',
        'Transaction Date',
        'Product ID',
        'Product Name',
        'Quantity',
        'Unit Price',
        'Total Price',
      ];

      const rows: string[][] = [];
      
      transactions.forEach(transaction => {
        transaction.items.forEach(item => {
          rows.push([
            transaction.id,
            transaction.store_id || '',
            this.formatCurrency(transaction.total, opts.currencyFormat),
            transaction.status,
            transaction.customer_name || '',
            transaction.payment_method || '',
            this.formatDate(transaction.created_at, opts.dateFormat),
            item.product_id,
            item.product_name || '',
            item.quantity.toString(),
            this.formatCurrency(item.unit_price, opts.currencyFormat),
            this.formatCurrency(item.total_price, opts.currencyFormat),
          ]);
        });
      });

      const csvContent = this.generateCSV(headers, rows, opts);
      return await this.writeAndShareFile(csvContent, opts.filename, opts.encoding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorHandler.handle(
        errorHandler.createStorageError(
          `Failed to export detailed sales transactions: ${errorMessage}`,
          { component: 'CSVExporter', action: 'exportSalesTransactionsDetailed' },
          error instanceof Error ? error : undefined
        )
      );
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Export low stock products to CSV
   */
  public async exportLowStockProducts(
    products: Product[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const lowStockProducts = products.filter(
      product => product.quantity <= product.low_stock_threshold
    );

    const opts = { ...this.defaultOptions, ...options };
    opts.filename = options.filename || `low_stock_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      const headers = [
        'ID',
        'Name',
        'SKU',
        'Current Quantity',
        'Low Stock Threshold',
        'Stock Difference',
        'Category',
        'Unit Price',
        'Location',
        'Status',
      ];

      const rows = lowStockProducts.map(product => {
        const difference = product.quantity - product.low_stock_threshold;
        const status = product.quantity === 0 ? 'Out of Stock' : 'Low Stock';
        
        return [
          product.id,
          product.name,
          product.sku,
          product.quantity.toString(),
          product.low_stock_threshold.toString(),
          difference.toString(),
          product.category || '',
          this.formatCurrency(product.unit_price, opts.currencyFormat),
          product.location || '',
          status,
        ];
      });

      const csvContent = this.generateCSV(headers, rows, opts);
      return await this.writeAndShareFile(csvContent, opts.filename, opts.encoding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorHandler.handle(
        errorHandler.createStorageError(
          `Failed to export low stock products: ${errorMessage}`,
          { component: 'CSVExporter', action: 'exportLowStockProducts' },
          error instanceof Error ? error : undefined
        )
      );
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Export generic data to CSV
   */
  public async exportGeneric<T extends Record<string, unknown>>(
    data: T[],
    headers: string[],
    rowMapper: (dataItem: T) => string[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      const rows = data.map(rowMapper);
      const csvContent = this.generateCSV(headers, rows, opts);
      return await this.writeAndShareFile(csvContent, opts.filename, opts.encoding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorHandler.handle(
        errorHandler.createStorageError(
          `Failed to export generic data: ${errorMessage}`,
          { component: 'CSVExporter', action: 'exportGeneric' },
          error instanceof Error ? error : undefined
        )
      );
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private generateCSV(
    headers: string[],
    rows: string[][],
    options: Required<ExportOptions>
  ): string {
    const csvRows: string[] = [];

    // Add headers if requested
    if (options.includeHeaders) {
      csvRows.push(this.formatCSVRow(headers, options.delimiter));
    }

    // Add data rows
    rows.forEach(row => {
      csvRows.push(this.formatCSVRow(row, options.delimiter));
    });

    return csvRows.join('\n');
  }

  private formatCSVRow(row: string[], delimiter: string): string {
    return row
      .map(cell => this.escapeCsvCell(cell, delimiter))
      .join(delimiter);
  }

  private escapeCsvCell(cell: string, delimiter: string): string {
    // Handle null/undefined
    if (cell == null) {
      return '';
    }

    const cellStr = String(cell);
    
    // If cell contains delimiter, newlines, or quotes, wrap in quotes
    if (
      cellStr.includes(delimiter) ||
      cellStr.includes('\n') ||
      cellStr.includes('\r') ||
      cellStr.includes('"')
    ) {
      // Escape existing quotes by doubling them
      const escaped = cellStr.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return cellStr;
  }

  private formatCurrency(
    amount: number | undefined,
    format: 'pence' | 'formatted'
  ): string {
    if (amount == null) return '';
    
    if (format === 'pence') {
      return amount.toString();
    }
    
    return formatCurrency(amount);
  }

  private formatDate(dateString: string, format: 'iso' | 'readable'): string {
    if (format === 'iso') {
      return dateString;
    }
    
    return formatDate(dateString);
  }

  private formatTransactionItems(
    items: SalesTransactionItem[],
    options: Required<ExportOptions>
  ): string {
    return items
      .map(item => 
        `${item.product_name || item.product_id} (${item.quantity}x @ ${this.formatCurrency(item.unit_price, options.currencyFormat)})`
      )
      .join('; ');
  }

  private async writeAndShareFile(
    content: string,
    filename: string,
    encoding: FileSystem.EncodingType
  ): Promise<ExportResult> {
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding });

    // Try to share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Data',
      });
    }

    return {
      success: true,
      filePath: fileUri,
      recordCount: content.split('\n').length - 1, // Subtract header row
    };
  }
}

// Export singleton instance
export const csvExporter = new CSVExporter();

// Export convenience functions
export const exportProducts = (
  products: Product[],
  options?: ExportOptions
) => csvExporter.exportProducts(products, options);

export const exportSalesTransactions = (
  transactions: SalesTransaction[],
  options?: ExportOptions
) => csvExporter.exportSalesTransactions(transactions, options);

export const exportSalesTransactionsDetailed = (
  transactions: SalesTransaction[],
  options?: ExportOptions
) => csvExporter.exportSalesTransactionsDetailed(transactions, options);

export const exportLowStockProducts = (
  products: Product[],
  options?: ExportOptions
) => csvExporter.exportLowStockProducts(products, options);

export const exportGeneric = <T extends Record<string, unknown>>(
  data: T[],
  headers: string[],
  rowMapper: (dataItem: T) => string[],
  options?: ExportOptions
) => csvExporter.exportGeneric(data, headers, rowMapper, options);