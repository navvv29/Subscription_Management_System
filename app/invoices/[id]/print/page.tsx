'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/types/common';
import type { Invoice, Payment } from '@/types/database';
import { Printer, ArrowLeft } from 'lucide-react';

function InvoicePrintContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoiceData() {
      try {
        setLoading(true);
        const [invRes, payRes] = await Promise.all([
          fetch(`/api/invoices/${invoiceId}`),
          fetch(`/api/payments?invoiceId=${invoiceId}`),
        ]);

        const invJson = await invRes.json();
        const payJson = await payRes.json();

        if (!invRes.ok || invJson.error) {
          throw new Error(invJson.error?.message || 'Invoice not found');
        }

        setInvoice(invJson.data);
        if (payRes.ok && payJson.data) {
          setPayments(payJson.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-gray-500 font-medium">Generating printable tax invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 text-red-700">
          <p className="font-semibold">Unable to load invoice</p>
          <p className="text-sm mt-1">{error || 'Invoice not found.'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 print:p-0 print:bg-white text-gray-900">
      {/* Top action toolbar - hidden when printed */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Corporate Tax Invoice Document */}
      <div className="max-w-4xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg p-8 sm:p-12 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-8">
          <div>
            <div className="text-2xl font-black tracking-tight text-blue-900">
              BRIGHTLOOP TECHNOLOGIES
            </div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">
              Tax Invoice / Bill of Supply
            </div>
            <div className="text-xs text-gray-600 mt-2 space-y-0.5">
              <p>Brightloop Technologies Pvt Ltd</p>
              <p>GSTIN: 29AABCU9603R1ZM</p>
              <p>124 Residency Road, Richmond Circle</p>
              <p>Bengaluru, Karnataka 560025, India</p>
              <p>support@brightloop.io | +91-80-4567-8900</p>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 text-xs font-bold uppercase rounded tracking-wider ${
                invoice.status === 'paid'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : invoice.status === 'partially_paid'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : invoice.status === 'confirmed'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : invoice.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-gray-100 text-gray-800 border border-gray-300'
              }`}
            >
              {invoice.status.replace('_', ' ')}
            </span>
            <div className="mt-4 text-sm">
              <span className="text-gray-500">Invoice Number:</span>{' '}
              <span className="font-mono font-bold text-gray-900">{invoice.number}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Invoice Date:</span>{' '}
              <span className="font-medium text-gray-900">{invoice.createdAt.split('T')[0]}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Due Date:</span>{' '}
              <span className="font-bold text-red-600">{invoice.dueDate}</span>
            </div>
          </div>
        </div>

        {/* Bill To & Billing Period */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-gray-200">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Billed To
            </h3>
            <div className="mt-2 text-sm text-gray-800 space-y-1">
              <p className="font-bold text-base text-gray-900">{invoice.customerName}</p>
              <p>{invoice.customerEmail}</p>
              <p>Customer ID: {invoice.customerId}</p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Service Period & Terms
            </h3>
            <div className="mt-2 text-sm text-gray-800 space-y-1">
              {invoice.billingPeriodStart && invoice.billingPeriodEnd && (
                <p>
                  <span className="text-gray-500">Period:</span> {invoice.billingPeriodStart} to{' '}
                  {invoice.billingPeriodEnd}
                </p>
              )}
              {invoice.subscriptionId && (
                <p>
                  <span className="text-gray-500">Subscription:</span> {invoice.subscriptionId}
                </p>
              )}
              <p>
                <span className="text-gray-500">Payment Terms:</span> Due on receipt
              </p>
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-6">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Tax (%)</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="py-3 px-3 font-medium text-gray-900">
                    {item.productDescription}
                  </td>
                  <td className="py-3 px-3 text-right">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono text-gray-600">
                    {formatCurrency(item.unitPriceMinor)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600">
                    {item.discountAmountMinor > 0 ? `-${formatCurrency(item.discountAmountMinor)}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600">
                    {item.taxRate}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-gray-900">
                    {formatCurrency(item.lineTotalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals Breakdown */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <div className="w-full sm:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotalMinor)}</span>
            </div>
            {invoice.discountTotalMinor > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts:</span>
                <span className="font-mono">-{formatCurrency(invoice.discountTotalMinor)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>GST Total:</span>
              <span className="font-mono">{formatCurrency(invoice.taxTotalMinor)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-300">
              <span>Total Amount:</span>
              <span className="font-mono">{formatCurrency(invoice.totalMinor)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Amount Paid:</span>
              <span className="font-mono text-emerald-700">
                {formatCurrency(invoice.paidMinor)}
              </span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-blue-900 pt-2 border-t border-gray-300">
              <span>Balance Due:</span>
              <span className="font-mono">{formatCurrency(invoice.balanceMinor)}</span>
            </div>
          </div>
        </div>

        {/* Payment History Ledger */}
        {payments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Payment Receipts Ledger
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gray-200">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Reference / Note</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2 px-3 font-mono">{p.paymentDate}</td>
                      <td className="py-2 px-3 uppercase font-semibold">{p.method}</td>
                      <td className="py-2 px-3 text-gray-500">
                        {p.note || p.transactionRef || 'Direct settlement'}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono font-bold ${
                          p.isRefund ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {p.isRefund ? `-${formatCurrency(p.amountMinor)}` : formatCurrency(p.amountMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Banking and Remittance Details */}
        <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-2 gap-6 text-xs text-gray-500">
          <div>
            <p className="font-bold text-gray-700 mb-1">Electronic Remittance Details</p>
            <p>Bank: HDFC Bank Ltd</p>
            <p>Account Name: Brightloop Technologies Pvt Ltd</p>
            <p>Account Number: 50200012345678</p>
            <p>IFSC Code: HDFC0000123</p>
            <p>UPI ID: brightloop@hdfcbank</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-700 mb-1">Declaration</p>
            <p>This is a computer-generated invoice and requires no physical signature.</p>
            <p>All disputes subject to Bengaluru jurisdiction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePrintPageWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center p-8 text-gray-500 font-medium">
          Loading printable invoice...
        </div>
      }
    >
      <InvoicePrintContent params={params} />
    </Suspense>
  );
}
