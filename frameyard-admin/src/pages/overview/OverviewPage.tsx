import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useProducts from '../../hooks/useProducts';
import useOrders from '../../hooks/useOrders';
import useCustomers from '../../hooks/useCustomers';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package, 
  ArrowRight,
  IndianRupee,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, fetchProducts, loading: loadingProducts } = useProducts(false);
  const { orders, fetchOrders, loading: loadingOrders } = useOrders(false);
  const { customers, fetchCustomers, loading: loadingCustomers } = useCustomers(false);
  const today = new Date();
  type ReportRange = 'today' | 'week' | 'month' | 'year' | 'custom';
  const [reportRange, setReportRange] = useState<ReportRange>('month');
  const [reportFromDate, setReportFromDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  );
  const [reportToDate, setReportToDate] = useState(today.toISOString().slice(0, 10));

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
    if (orders.length === 0) {
      fetchOrders({ page: 1, limit: 200, dateFilter: 'all' });
    }
    if (customers.length === 0) {
      fetchCustomers();
    }
  }, [fetchCustomers, fetchOrders, fetchProducts]);

  const reportDateRange = useMemo(() => {
    const now = new Date();

    if (reportRange === 'today') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
        label: 'Today',
      };
    }

    if (reportRange === 'week') {
      const dayOfWeek = now.getDay();
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
      const weekEnd = new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + 6,
        23,
        59,
        59,
        999
      );

      return {
        from: weekStart,
        to: weekEnd,
        label: 'This Week',
      };
    }

    if (reportRange === 'year') {
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
        label: `This Year (${now.getFullYear()})`,
      };
    }

    if (reportRange === 'month') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
        label: 'This Month',
      };
    }

    const from = reportFromDate ? new Date(`${reportFromDate}T00:00:00`) : new Date(0);
    const to = reportToDate ? new Date(`${reportToDate}T23:59:59.999`) : now;

    return {
      from,
      to,
      label: `${from.toLocaleDateString('en-IN')} - ${to.toLocaleDateString('en-IN')}`,
    };
  }, [reportFromDate, reportRange, reportToDate]);

  const reportOrders = useMemo(
    () =>
      orders.filter((order) => {
        const createdAt = new Date(order.createdAt);
        return (
          order.orderStatus !== 'CANCELLED' &&
          createdAt >= reportDateRange.from &&
          createdAt <= reportDateRange.to
        );
      }),
    [orders, reportDateRange]
  );

  const calculatedRevenue = orders.reduce(
    (sum, o) => (o.orderStatus !== 'CANCELLED' ? sum + Number(o.totalAmount || 0) : sum),
    0
  );
  const calculatedOrders = orders.length;
  const calculatedCustomers = customers.length;
  const calculatedProducts = products.filter((product) => product.isActive).length;

  const chartData = useMemo(() => {
    const formatDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const bucketByKey = reportOrders.reduce<Record<string, number>>((acc, order) => {
      const createdAt = new Date(order.createdAt);
      const key =
        reportRange === 'today'
          ? `${formatDateKey(createdAt)}-${String(createdAt.getHours()).padStart(2, '0')}`
          : reportRange === 'year'
          ? `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
          : formatDateKey(createdAt);

      acc[key] = (acc[key] || 0) + Number(order.totalAmount || 0);
      return acc;
    }, {});

    if (reportRange === 'year') {
      return Array.from({ length: 12 }, (_, monthIndex) => {
        const date = new Date(reportDateRange.from.getFullYear(), monthIndex, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        return {
          day: date.toLocaleDateString('en-US', { month: 'short' }),
          revenue: bucketByKey[key] || 0,
        };
      });
    }

    if (reportRange === 'today') {
      return Array.from({ length: 24 }, (_, hourIndex) => {
        const key = `${formatDateKey(reportDateRange.from)}-${String(hourIndex).padStart(2, '0')}`;

        return {
          day: hourIndex % 3 === 0 ? `${hourIndex}:00` : '',
          revenue: bucketByKey[key] || 0,
        };
      });
    }

    const daysInRange = Math.max(
      1,
      Math.ceil((reportDateRange.to.getTime() - reportDateRange.from.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );

    return Array.from({ length: Math.min(daysInRange, 31) }, (_, dayIndex) => {
      const date = new Date(reportDateRange.from);
      date.setDate(reportDateRange.from.getDate() + dayIndex);
      const key = formatDateKey(date);

      return {
        day: date.toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
        }),
        revenue: bucketByKey[key] || 0,
      };
    });
  }, [reportDateRange, reportOrders, reportRange]);

  const reportRevenue = reportOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  const downloadPdf = (filename: string, lines: string[]) => {
    const escapePdfText = (value: string) =>
      value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const pageWidth = 595;
    const pageHeight = 842;
    const startX = 48;
    let y = 780;
    const contentLines: string[] = ['BT', '/F1 11 Tf', `${startX} ${y} Td`];

    lines.forEach((line, index) => {
      if (index > 0) {
        y -= 18;
        if (y < 56) {
          return;
        }
        contentLines.push(`0 -18 Td`);
      }
      contentLines.push(`(${escapePdfText(line)}) Tj`);
    });
    contentLines.push('ET');

    const stream = contentLines.join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object) => {
      offsets.push(pdf.length);
      pdf += `${object}\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadRevenueReport = () => {
    const generatedAt = new Date().toLocaleString('en-IN');
    const lines = [
      'FrameYaad Revenue Report',
      `Range: ${reportDateRange.label}`,
      `Generated: ${generatedAt}`,
      '',
      `Total revenue: INR ${reportRevenue.toFixed(2)}`,
      `Paid/active orders: ${reportOrders.length}`,
      `Average order value: INR ${(reportOrders.length ? reportRevenue / reportOrders.length : 0).toFixed(2)}`,
      '',
      'Orders',
      ...reportOrders.slice(0, 28).map((order) =>
        `${new Date(order.createdAt).toLocaleDateString('en-IN')} | ${order.orderNumber} | ${order.user?.name || 'Unknown Customer'} | ${order.orderStatus} | INR ${Number(order.totalAmount).toFixed(2)}`
      ),
      ...(reportOrders.length > 28 ? [`+ ${reportOrders.length - 28} more orders not shown on this summary page`] : []),
    ];

    downloadPdf(`revenue-report-${new Date().toISOString().slice(0, 10)}.pdf`, lines);
  };

  // Recent 4 orders
  const recentOrders = orders.slice(0, 4);

  // Filter low stock products from products store
  const lowStockAlerts = products
    .flatMap(p => p.variants.map(v => ({
      name: p.name,
      variantName: v.frameSize,
      stock: v.stockQuantity,
      productId: p.id,
      status: v.stockQuantity === 0 ? 'Out of Stock' : v.stockQuantity <= 5 ? 'Critical' : 'Low'
    })))
    .filter(item => item.stock <= 15)
    .slice(0, 4);

  const displayLowStock = lowStockAlerts;

  // Order Fulfillment quantities
  const pendingCount = orders.filter(o => o.orderStatus === 'PLACED').length;
  const processingCount = orders.filter(o => o.orderStatus === 'PROCESSING').length;
  const shippedCount = orders.filter(o => o.orderStatus === 'SHIPPED').length;
  const deliveredCount = orders.filter(o => o.orderStatus === 'DELIVERED').length;
  const cancelledCount = orders.filter(o => o.orderStatus === 'CANCELLED').length;
  const navigateToOrdersByStatus = (status: string) => {
    navigate(`/admin/orders?status=${status}`);
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge type="success">Delivered</Badge>;
      case 'PROCESSING':
        return <Badge type="info">Processing</Badge>;
      case 'PLACED':
        return <Badge type="warning">Pending</Badge>;
      case 'CANCELLED':
        return <Badge type="error">Cancelled</Badge>;
      default:
        return <Badge type="neutral">{status}</Badge>;
    }
  };

  const getStockStatusBadge = (status: string) => {
    if (status === 'Out of Stock') return <Badge type="error">Out of Stock</Badge>;
    if (status === 'Critical') return <Badge type="error">Critical</Badge>;
    return <Badge type="warning">Low</Badge>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-on-surface mb-1">Overview</h2>
        <p className="text-sm text-on-surface-variant">Your store's performance at a glance.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Revenue"
          value={`₹${calculatedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={IndianRupee}
        />
        <KpiCard
          title="Total Orders"
          value={calculatedOrders.toLocaleString('en-US')}
          icon={ShoppingBag}
          onClick={() => navigate('/admin/orders')}
        />
        <KpiCard
          title="Total Customers"
          value={calculatedCustomers.toLocaleString('en-US')}
          icon={Users}
          onClick={() => navigate('/admin/customers')}
        />
        <KpiCard
          title="Active Products"
          value={calculatedProducts}
          icon={Package}
          onClick={() => navigate('/admin/products')}
        />
      </div>

      {/* Recharts Chart & Fulfillment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Line Chart */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Revenue ({reportDateRange.label})</h3>
              <p className="mt-1 text-xs text-on-surface-variant">
                INR {reportRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from {reportOrders.length} orders
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
              <select
                value={reportRange}
                onChange={(event) => setReportRange(event.target.value as ReportRange)}
                className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-center text-xs font-semibold text-on-surface outline-none [text-align-last:center]"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              {reportRange === 'custom' && (
                <>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(event) => setReportFromDate(event.target.value)}
                    className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface outline-none"
                  />
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(event) => setReportToDate(event.target.value)}
                    className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs text-on-surface outline-none"
                  />
                </>
              )}
              <button
                onClick={handleDownloadRevenueReport}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#111827] bg-[#111827] px-3 text-xs font-semibold text-white transition-colors hover:bg-black"
              >
                <Download className="h-3.5 w-3.5" />
                Report PDF
            </button>
            </div>
          </div>
          
          <div className="w-full h-64 mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGreenFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#111827" stopOpacity={0.34} />
                    <stop offset="48%" stopColor="#111827" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#111827" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" vertical stroke="rgba(15,23,42,0.08)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#6b7280', fontWeight: 700 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#6b7280', fontWeight: 700 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  contentStyle={{ background: '#fff', border: '1px solid #c3c6d7', borderRadius: '10px', color: '#111827', fontSize: '12px' }}
                  labelStyle={{ color: '#111827', fontWeight: 700 }}
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                />
                <Area
                  type="natural"
                  dataKey="revenue"
                  stroke="#111827"
                  strokeWidth={3.2}
                  fill="url(#revenueGreenFill)"
                  dot={{ r: 4.5, stroke: '#111827', strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#111827' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fulfillment Breakdown */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-6">Order Fulfillment</h3>
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('PLACED')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#f59e0b' }} />
                <span className="text-xs font-semibold text-on-surface">Pending Payment</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{pendingCount}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('PROCESSING')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#3b82f6' }} />
                <span className="text-xs font-semibold text-on-surface">Processing</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{processingCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('SHIPPED')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#16a34a' }} />
                <span className="text-xs font-semibold text-on-surface">Shipped</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{shippedCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigateToOrdersByStatus('DELIVERED')}>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#1d4ed8' }} />
                <span className="text-xs font-semibold text-on-surface">Delivered</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{deliveredCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer mt-auto" onClick={() => navigateToOrdersByStatus('CANCELLED')}>
              <div className="flex items-center gap-3">
                <span className="block h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: '#ef3340' }} />
                <span className="text-xs font-semibold text-on-surface">Cancelled</span>
              </div>
              <span className="text-xs font-bold text-on-surface">{cancelledCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Recent Orders Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-secondary text-xs font-semibold">
                  <th className="p-4 uppercase tracking-wider">Order Number</th>
                  <th className="p-4 uppercase tracking-wider">Customer</th>
                  <th className="p-4 uppercase tracking-wider">Address</th>
                  <th className="p-4 uppercase tracking-wider text-right">Amount</th>
                  <th className="p-4 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-outline-variant/30 text-on-surface">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-semibold text-primary">{order.orderNumber}</td>
                    <td className="p-4 text-on-surface-variant">{order.user?.name || 'Unknown Customer'}</td>
                    <td className="p-4 font-semibold text-primary">{order.addressLine}</td>
                    <td className="p-4 text-right font-semibold">₹{Number(order.totalAmount).toFixed(2)}</td>
                    <td className="p-4">{getOrderStatusBadge(order.orderStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts Table */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Low Stock Alerts</h3>
            <Link to="/admin/products" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Manage Inventory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-secondary text-xs font-semibold">
                  <th className="p-4 uppercase tracking-wider">Product Name</th>
                  <th className="p-4 uppercase tracking-wider">Variant</th>
                  <th className="p-4 uppercase tracking-wider text-right">Stock</th>
                  <th className="p-4 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-outline-variant/30 text-on-surface">
                {displayLowStock.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-semibold">{item.name}</td>
                    <td className="p-4 text-on-surface-variant">{item.variantName}</td>
                    <td className="p-4 text-right font-bold text-error">{item.stock}</td>
                    <td className="p-4">{getStockStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OverviewPage;

