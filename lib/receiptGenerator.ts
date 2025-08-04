import { formatCurrency } from './utils';
import { auditLogger } from './auditLogger';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReceiptData {
  sale_id: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  notes?: string;
}

export const generateReceipt = (saleData: ReceiptData): string => {
  const {
    sale_id,
    date,
    items,
    subtotal,
    tax,
    total,
    payment_method,
    customer_name,
    customer_email,
    customer_phone,
    notes,
  } = saleData;

  // Log receipt generation
  auditLogger.logReceiptGeneration(sale_id, {
    format: 'text',
    itemCount: items.length,
    total: total,
    customer: customer_name || 'N/A'
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      other: 'Other',
    };
    return methodMap[method] || method;
  };

  let receipt = '';

  // Header
  receipt += '='.repeat(40) + '\n';
  receipt += 'SALES AND STOCKS MANAGER\n';
  receipt += 'RECEIPT\n';
  receipt += '='.repeat(40) + '\n\n';

  // Sale Information
  receipt += `Sale ID: ${sale_id}\n`;
  receipt += `Date: ${formatDate(date)}\n`;
  receipt += `Payment: ${formatPaymentMethod(payment_method)}\n`;
  
  if (customer_name) {
    receipt += `Customer: ${customer_name}\n`;
  }
  if (customer_email) {
    receipt += `Email: ${customer_email}\n`;
  }
  if (customer_phone) {
    receipt += `Phone: ${customer_phone}\n`;
  }
  
  receipt += '\n';

  // Items
  receipt += 'ITEMS:\n';
  receipt += '-'.repeat(40) + '\n';
  
  items.forEach((item, index) => {
    const itemNumber = (index + 1).toString().padStart(2, '0');
    const quantity = item.quantity.toString().padStart(3, ' ');
    const name = item.name.padEnd(20, ' ');
    const unitPrice = formatCurrency(item.unit_price).padStart(8, ' ');
    const totalPrice = formatCurrency(item.total_price).padStart(10, ' ');
    
    receipt += `${itemNumber}. ${quantity}x ${name} ${unitPrice} ${totalPrice}\n`;
  });
  
  receipt += '-'.repeat(40) + '\n';

  // Totals
  receipt += `Subtotal:${formatCurrency(subtotal).padStart(27, ' ')}\n`;
  receipt += `Tax:${formatCurrency(tax).padStart(31, ' ')}\n`;
  receipt += `TOTAL:${formatCurrency(total).padStart(29, ' ')}\n`;
  
  receipt += '='.repeat(40) + '\n';

  // Notes
  if (notes) {
    receipt += '\nNOTES:\n';
    receipt += notes + '\n\n';
  }

  // Footer
  receipt += 'Thank you for your purchase!\n';
  receipt += 'Please keep this receipt for your records.\n';
  receipt += '='.repeat(40) + '\n';

  return receipt;
};

export const generateReceiptHTML = (saleData: ReceiptData): string => {
  const {
    sale_id,
    date,
    items,
    subtotal,
    tax,
    total,
    payment_method,
    customer_name,
    customer_email,
    customer_phone,
    notes,
  } = saleData;

  // Log HTML receipt generation
  auditLogger.logReceiptGeneration(sale_id, {
    format: 'html',
    itemCount: items.length,
    total: total,
    customer: customer_name || 'N/A'
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      other: 'Other',
    };
    return methodMap[method] || method;
  };

  const itemsHTML = items.map((item, index) => `
    <tr>
      <td>${(index + 1).toString().padStart(2, '0')}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.unit_price)}</td>
      <td>${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${sale_id}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .sale-info {
          margin-bottom: 20px;
        }
        .sale-info div {
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .totals {
          text-align: right;
          margin-bottom: 20px;
        }
        .totals div {
          margin-bottom: 5px;
        }
        .total {
          font-weight: bold;
          font-size: 14px;
          border-top: 2px solid #000;
          padding-top: 5px;
        }
        .footer {
          text-align: center;
          border-top: 2px solid #000;
          padding-top: 10px;
          margin-top: 20px;
        }
        .notes {
          margin: 20px 0;
          padding: 10px;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SALES AND STOCKS MANAGER</h1>
        <h2>RECEIPT</h2>
      </div>
      
      <div class="sale-info">
        <div><strong>Sale ID:</strong> ${sale_id}</div>
        <div><strong>Date:</strong> ${formatDate(date)}</div>
        <div><strong>Payment Method:</strong> ${formatPaymentMethod(payment_method)}</div>
        ${customer_name ? `<div><strong>Customer:</strong> ${customer_name}</div>` : ''}
        ${customer_email ? `<div><strong>Email:</strong> ${customer_email}</div>` : ''}
        ${customer_phone ? `<div><strong>Phone:</strong> ${customer_phone}</div>` : ''}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="totals">
        <div><strong>Subtotal:</strong> ${formatCurrency(subtotal)}</div>
        <div><strong>Tax:</strong> ${formatCurrency(tax)}</div>
        <div class="total"><strong>TOTAL:</strong> ${formatCurrency(total)}</div>
      </div>
      
      ${notes ? `
        <div class="notes">
          <strong>Notes:</strong><br>
          ${notes}
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>Please keep this receipt for your records.</p>
      </div>
    </body>
    </html>
  `;
};

export const generateReceiptAccessibleText = (saleData: ReceiptData): string => {
  const {
    sale_id,
    date,
    items,
    subtotal,
    tax,
    total,
    payment_method,
    customer_name,
  } = saleData;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPaymentMethod = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      other: 'Other',
    };
    return methodMap[method] || method;
  };

  let accessibleText = 'Receipt for sale ' + sale_id + '. ';
  accessibleText += 'Date: ' + formatDate(date) + '. ';
  accessibleText += 'Payment method: ' + formatPaymentMethod(payment_method) + '. ';
  
  if (customer_name) {
    accessibleText += 'Customer: ' + customer_name + '. ';
  }

  accessibleText += 'Items: ';
  items.forEach((item, index) => {
    accessibleText += `${index + 1}. ${item.name}, quantity ${item.quantity}, unit price ${formatCurrency(item.unit_price)}, total ${formatCurrency(item.total_price)}. `;
  });

  accessibleText += `Subtotal: ${formatCurrency(subtotal)}. `;
  accessibleText += `Tax: ${formatCurrency(tax)}. `;
  accessibleText += `Total: ${formatCurrency(total)}. `;
  accessibleText += 'Thank you for your purchase.';

  return accessibleText;
}; 