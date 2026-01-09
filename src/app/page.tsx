'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Settings,
  FileText,
  BarChart3,
  History,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  ChevronRight,
  TrendingUp,
  Users,
  Truck,
  DollarSign,
  Calculator,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type {
  ProductType,
  TransportType,
  ShipmentStatus,
  RateCardStatus,
} from '@/lib/types';
import {
  PRODUCT_TYPE_LABELS,
  TRANSPORT_TYPE_LABELS,
  SHIPMENT_STATUS_LABELS,
  RATE_CARD_STATUS_LABELS,
} from '@/lib/types';
import { formatCurrency, formatNumber, calculateFull } from '@/lib/calc';

// ==================== MOCK DATA ====================
const MOCK_USER = {
  id: '1',
  email: 'admin@commission-cargo.com',
  name: 'ผู้ดูแลระบบ',
  role: 'ADMIN' as const,
};

const MOCK_SALESPEOPLE = [
  { id: '1', salesCode: 'S-01', salesName: 'สมชาย ใจดี', active: true },
  { id: '2', salesCode: 'S-02', salesName: 'สมหญิง รักงาน', active: true },
  { id: '3', salesCode: 'S-03', salesName: 'ประยุทธ์ ขยัน', active: true },
];

const MOCK_CUSTOMERS = [
  { id: '1', customerCode: 'PR-001', customerName: 'บริษัท เพชรรุ่ง จำกัด', assignedSalespersonId: '1' },
  { id: '2', customerCode: 'PR-002', customerName: 'ห้างหุ้นส่วน เจริญทอง', assignedSalespersonId: '1' },
  { id: '3', customerCode: 'PR-003', customerName: 'บริษัท สยามสตาร์ จำกัด', assignedSalespersonId: '2' },
  { id: '4', customerCode: 'PR-004', customerName: 'ร้าน มงคลพาณิชย์', assignedSalespersonId: '2' },
  { id: '5', customerCode: 'PR-005', customerName: 'บริษัท ไทยเจริญ จำกัด', assignedSalespersonId: '3' },
];

const MOCK_RATE_CARDS = [
  {
    id: '1',
    name: 'เรทมาตรฐาน 2026-01',
    description: 'เรทมาตรฐานสำหรับเดือนมกราคม 2569',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    status: 'ACTIVE' as RateCardStatus,
    rateRows: [
      { productType: 'GENERAL' as ProductType, transport: 'TRUCK' as TransportType, unit: 'CBM', rateValue: 5500 },
      { productType: 'GENERAL' as ProductType, transport: 'TRUCK' as TransportType, unit: 'KG', rateValue: 55 },
      { productType: 'GENERAL' as ProductType, transport: 'SHIP' as TransportType, unit: 'CBM', rateValue: 4500 },
      { productType: 'GENERAL' as ProductType, transport: 'SHIP' as TransportType, unit: 'KG', rateValue: 45 },
      { productType: 'TIS' as ProductType, transport: 'TRUCK' as TransportType, unit: 'CBM', rateValue: 6500 },
      { productType: 'TIS' as ProductType, transport: 'TRUCK' as TransportType, unit: 'KG', rateValue: 65 },
      { productType: 'FDA' as ProductType, transport: 'TRUCK' as TransportType, unit: 'CBM', rateValue: 7000 },
      { productType: 'FDA' as ProductType, transport: 'TRUCK' as TransportType, unit: 'KG', rateValue: 70 },
      { productType: 'SPECIAL' as ProductType, transport: 'TRUCK' as TransportType, unit: 'CBM', rateValue: 8000 },
      { productType: 'SPECIAL' as ProductType, transport: 'TRUCK' as TransportType, unit: 'KG', rateValue: 80 },
    ],
  },
];

const MOCK_SHIPMENTS = [
  {
    id: '1',
    dateIn: '2026-01-05',
    customerId: '1',
    salespersonId: '1',
    trackingNo: '7100123456',
    productType: 'GENERAL' as ProductType,
    transport: 'TRUCK' as TransportType,
    weightKg: 120,
    cbm: 0.8,
    sellBase: 5500,
    costMode: 'AUTO' as const,
    costManual: null,
    costCbm: 4400,
    costKg: 6600,
    costFinal: 6600,
    costRule: 'KG' as const,
    commissionMethod: 'DIFF' as const,
    commissionValue: -1100,
    status: 'DELIVERED' as ShipmentStatus,
    note: '',
  },
  {
    id: '2',
    dateIn: '2026-01-06',
    customerId: '2',
    salespersonId: '1',
    trackingNo: '7100123457',
    productType: 'TIS' as ProductType,
    transport: 'TRUCK' as TransportType,
    weightKg: 50,
    cbm: 1.2,
    sellBase: 9000,
    costMode: 'AUTO' as const,
    costManual: null,
    costCbm: 7800,
    costKg: 3250,
    costFinal: 7800,
    costRule: 'CBM' as const,
    commissionMethod: 'DIFF' as const,
    commissionValue: 1200,
    status: 'IN_TRANSIT' as ShipmentStatus,
    note: 'สินค้าเร่งด่วน',
  },
  {
    id: '3',
    dateIn: '2026-01-07',
    customerId: '3',
    salespersonId: '2',
    trackingNo: '7100123458',
    productType: 'GENERAL' as ProductType,
    transport: 'SHIP' as TransportType,
    weightKg: 200,
    cbm: 2.0,
    sellBase: 9000,
    costMode: 'AUTO' as const,
    costManual: null,
    costCbm: 9000,
    costKg: 9000,
    costFinal: 9000,
    costRule: 'CBM' as const,
    commissionMethod: 'ONEPCT' as const,
    commissionValue: 90,
    status: 'PENDING' as ShipmentStatus,
    note: '',
  },
  {
    id: '4',
    dateIn: '2026-01-08',
    customerId: '4',
    salespersonId: '2',
    trackingNo: '7100123459-1',
    productType: 'FDA' as ProductType,
    transport: 'TRUCK' as TransportType,
    weightKg: 80,
    cbm: 0.6,
    sellBase: 6500,
    costMode: 'MANUAL' as const,
    costManual: 5000,
    costCbm: 4200,
    costKg: 5600,
    costFinal: 5000,
    costRule: 'MANUAL' as const,
    commissionMethod: 'DIFF' as const,
    commissionValue: 1500,
    status: 'DELIVERED' as ShipmentStatus,
    note: 'ต้นทุนพิเศษตาม deal',
  },
  {
    id: '5',
    dateIn: '2026-01-09',
    customerId: '5',
    salespersonId: '3',
    trackingNo: '7100123460',
    productType: 'SPECIAL' as ProductType,
    transport: 'TRUCK' as TransportType,
    weightKg: 150,
    cbm: 1.5,
    sellBase: 15000,
    costMode: 'AUTO' as const,
    costManual: null,
    costCbm: 12000,
    costKg: 12000,
    costFinal: 12000,
    costRule: 'CBM' as const,
    commissionMethod: 'DIFF' as const,
    commissionValue: 3000,
    status: 'PENDING' as ShipmentStatus,
    note: '',
  },
];

// ==================== TYPES ====================
type PageType = 'dashboard' | 'rates' | 'shipments' | 'summary' | 'logs' | 'settings';

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ReactNode;
}

// ==================== COMPONENTS ====================

// Sidebar Component
function Sidebar({
  currentPage,
  onPageChange,
  isOpen,
  onClose
}: {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'rates', label: 'ตั้งค่าเรททุน', icon: <Settings size={20} /> },
    { id: 'shipments', label: 'รายการขนส่ง', icon: <Package size={20} /> },
    { id: 'summary', label: 'สรุปค่าคอม', icon: <BarChart3 size={20} /> },
    { id: 'logs', label: 'ประวัติการเปลี่ยนแปลง', icon: <History size={20} /> },
  ];

  return (
    <>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 299 }} />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Truck size={28} />
            <span>Commission Cargo</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => {
                onPageChange(item.id);
                onClose();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {currentPage === item.id && <ChevronRight size={16} style={{ marginLeft: 'auto' }} />}
            </a>
          ))}
        </nav>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--spacing-4)',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div className="nav-item" style={{ cursor: 'pointer' }}>
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// Page Header Component
function PageHeader({
  title,
  subtitle,
  onMenuClick,
  children
}: {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className="btn btn-icon btn-ghost"
            onClick={onMenuClick}
            style={{ display: 'none' }}
            id="menu-toggle"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <div className="flex items-center gap-3" style={{ paddingLeft: 'var(--spacing-4)', borderLeft: '1px solid var(--border-light)' }}>
            <span className="text-sm font-medium">{MOCK_USER.name}</span>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-100)',
              color: 'var(--color-primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}>
              {MOCK_USER.name[0]}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Stats Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  type = 'default',
  change,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  type?: 'default' | 'success' | 'warning' | 'error';
  change?: { value: number; positive: boolean };
}) {
  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-icon" style={{
        background: type === 'success' ? 'var(--color-success-100)' :
          type === 'warning' ? 'var(--color-warning-100)' :
            type === 'error' ? 'var(--color-error-100)' : 'var(--color-primary-100)',
        color: type === 'success' ? 'var(--color-success-600)' :
          type === 'warning' ? 'var(--color-warning-600)' :
            type === 'error' ? 'var(--color-error-600)' : 'var(--color-primary-600)',
      }}>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{title}</div>
      {subtitle && <div className="text-xs text-muted mt-2">{subtitle}</div>}
      {change && (
        <div className={`stat-change ${change.positive ? 'positive' : 'negative'}`}>
          <TrendingUp size={14} style={{ transform: change.positive ? 'none' : 'rotate(180deg)' }} />
          {change.value}% จากเดือนก่อน
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: ShipmentStatus }) {
  const config: Record<ShipmentStatus, { class: string; icon: React.ReactNode }> = {
    PENDING: { class: 'badge-warning', icon: <Clock size={12} /> },
    IN_TRANSIT: { class: 'badge-primary', icon: <Truck size={12} /> },
    DELIVERED: { class: 'badge-success', icon: <CheckCircle size={12} /> },
    CANCELLED: { class: 'badge-error', icon: <X size={12} /> },
  };

  return (
    <span className={`badge ${config[status].class}`}>
      {config[status].icon}
      {SHIPMENT_STATUS_LABELS[status]}
    </span>
  );
}

// Empty State Component
function EmptyState({
  title,
  description,
  icon,
  action
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{description}</p>
      {action}
    </div>
  );
}

// ==================== PAGES ====================

// Dashboard Page
function DashboardPage() {
  const totalShipments = MOCK_SHIPMENTS.length;
  const totalRevenue = MOCK_SHIPMENTS.reduce((sum, s) => sum + s.sellBase, 0);
  const totalCost = MOCK_SHIPMENTS.reduce((sum, s) => sum + s.costFinal, 0);
  const totalCommission = MOCK_SHIPMENTS.reduce((sum, s) => sum + s.commissionValue, 0);
  const pendingCount = MOCK_SHIPMENTS.filter(s => s.status === 'PENDING').length;

  return (
    <div className="page-content">
      <div className="stats-grid">
        <StatCard
          title="รายการขนส่งทั้งหมด"
          value={totalShipments}
          subtitle="เดือนมกราคม 2569"
          icon={<Package size={24} />}
          change={{ value: 12, positive: true }}
        />
        <StatCard
          title="ยอดขายรวม"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign size={24} />}
          type="success"
          change={{ value: 8, positive: true }}
        />
        <StatCard
          title="ต้นทุนรวม"
          value={formatCurrency(totalCost)}
          icon={<Calculator size={24} />}
        />
        <StatCard
          title="ค่าคอมมิชชั่นรวม"
          value={formatCurrency(totalCommission)}
          icon={<TrendingUp size={24} />}
          type={totalCommission >= 0 ? 'success' : 'error'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-6)' }}>
        {/* Recent Shipments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">รายการล่าสุด</h3>
            <a className="btn btn-ghost btn-sm">ดูทั้งหมด <ChevronRight size={16} /></a>
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เลข Tracking</th>
                  <th>ลูกค้า</th>
                  <th>ยอดขาย</th>
                  <th>ค่าคอม</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SHIPMENTS.slice(0, 5).map((shipment) => {
                  const customer = MOCK_CUSTOMERS.find(c => c.id === shipment.customerId);
                  return (
                    <tr key={shipment.id}>
                      <td>{shipment.dateIn}</td>
                      <td className="font-mono">{shipment.trackingNo}</td>
                      <td>{customer?.customerCode}</td>
                      <td className="numeric">{formatCurrency(shipment.sellBase)}</td>
                      <td className={`numeric ${shipment.commissionValue >= 0 ? 'text-success' : 'text-error'}`}>
                        {formatCurrency(shipment.commissionValue)}
                      </td>
                      <td><StatusBadge status={shipment.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">สรุปสถานะ</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning-500)' }} />
                  <span>รอดำเนินการ</span>
                </div>
                <span className="font-bold">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-500)' }} />
                  <span>กำลังขนส่ง</span>
                </div>
                <span className="font-bold">{MOCK_SHIPMENTS.filter(s => s.status === 'IN_TRANSIT').length}</span>
              </div>
              <div className="flex items-center justify-between" style={{ padding: 'var(--spacing-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success-500)' }} />
                  <span>ส่งแล้ว</span>
                </div>
                <span className="font-bold">{MOCK_SHIPMENTS.filter(s => s.status === 'DELIVERED').length}</span>
              </div>
            </div>

            <div style={{ marginTop: 'var(--spacing-6)', paddingTop: 'var(--spacing-6)', borderTop: '1px solid var(--border-light)' }}>
              <h4 className="text-sm font-medium mb-4">เรทที่ใช้งานอยู่</h4>
              <div style={{ padding: 'var(--spacing-4)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-200)' }}>
                <div className="font-medium" style={{ color: 'var(--color-primary-700)' }}>
                  {MOCK_RATE_CARDS[0].name}
                </div>
                <div className="text-xs text-muted mt-1">
                  มีผลตั้งแต่ {MOCK_RATE_CARDS[0].effectiveFrom}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Rates Page
function RatesPage() {
  const [selectedCard, setSelectedCard] = useState(MOCK_RATE_CARDS[0]);

  return (
    <div className="page-content">
      <div className="card mb-6">
        <div className="card-header">
          <h3 className="card-title">ชุดเรททุน</h3>
          <button className="btn btn-primary">
            <Plus size={18} />
            สร้างเรทใหม่
          </button>
        </div>
        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อชุดเรท</th>
                <th>มีผลตั้งแต่</th>
                <th>ถึงวันที่</th>
                <th>สถานะ</th>
                <th>การกระทำ</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RATE_CARDS.map((card) => (
                <tr key={card.id}>
                  <td className="font-medium">{card.name}</td>
                  <td>{card.effectiveFrom}</td>
                  <td>{card.effectiveTo || '-'}</td>
                  <td>
                    <span className={`badge ${card.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                      {RATE_CARD_STATUS_LABELS[card.status]}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCard(card)}>
                      <Eye size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm">
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCard && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">รายละเอียดเรท: {selectedCard.name}</h3>
          </div>
          <div className="card-body">
            <p className="text-sm text-muted mb-4">{selectedCard.description}</p>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ประเภทสินค้า</th>
                    <th>ช่องทาง</th>
                    <th>หน่วย</th>
                    <th className="text-right">ราคา (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCard.rateRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="badge badge-primary">
                          {PRODUCT_TYPE_LABELS[row.productType]}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.transport === 'TRUCK' ? 'badge-warning' : 'badge-primary'}`}>
                          {TRANSPORT_TYPE_LABELS[row.transport]}
                        </span>
                      </td>
                      <td>{row.unit}</td>
                      <td className="numeric font-bold">{formatNumber(row.rateValue, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shipments Page
function ShipmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('2026-01');
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | ''>('');

  const filteredShipments = MOCK_SHIPMENTS.filter((shipment) => {
    const matchesSearch = shipment.trackingNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = shipment.dateIn.startsWith(filterMonth);
    const matchesStatus = !filterStatus || shipment.status === filterStatus;
    return matchesSearch && matchesMonth && matchesStatus;
  });

  return (
    <div className="page-content">
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">ค้นหา</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="เลข Tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
        <div className="filter-group">
          <label className="filter-label">เดือน</label>
          <input
            type="month"
            className="form-input"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">สถานะ</label>
          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ShipmentStatus | '')}
          >
            <option value="">ทั้งหมด</option>
            {Object.entries(SHIPMENT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-3)' }}>
          <button className="btn btn-secondary">
            <Upload size={18} />
            Import CSV
          </button>
          <button className="btn btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button className="btn btn-primary">
            <Plus size={18} />
            เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>Tracking</th>
                <th>ลูกค้า</th>
                <th>เซลล์</th>
                <th>ประเภท</th>
                <th>ช่องทาง</th>
                <th className="text-right">CBM</th>
                <th className="text-right">น้ำหนัก (KG)</th>
                <th className="text-right">ยอดขาย</th>
                <th className="text-right">ต้นทุน</th>
                <th>วิธีคำนวณ</th>
                <th className="text-right">ค่าคอม</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shipment) => {
                const customer = MOCK_CUSTOMERS.find(c => c.id === shipment.customerId);
                const salesperson = MOCK_SALESPEOPLE.find(s => s.id === shipment.salespersonId);
                return (
                  <tr key={shipment.id}>
                    <td>{shipment.dateIn}</td>
                    <td className="font-mono">{shipment.trackingNo}</td>
                    <td>{customer?.customerCode}</td>
                    <td>{salesperson?.salesCode}</td>
                    <td>
                      <span className="badge badge-neutral">
                        {PRODUCT_TYPE_LABELS[shipment.productType]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${shipment.transport === 'TRUCK' ? 'badge-warning' : 'badge-primary'}`}>
                        {TRANSPORT_TYPE_LABELS[shipment.transport]}
                      </span>
                    </td>
                    <td className="numeric">{formatNumber(shipment.cbm, 2)}</td>
                    <td className="numeric">{formatNumber(shipment.weightKg, 1)}</td>
                    <td className="numeric">{formatCurrency(shipment.sellBase)}</td>
                    <td className="numeric">{formatCurrency(shipment.costFinal)}</td>
                    <td>
                      <span className={`badge ${shipment.costRule === 'MANUAL' ? 'badge-warning' :
                          shipment.costRule === 'CBM' ? 'badge-primary' : 'badge-neutral'
                        }`}>
                        {shipment.costRule}
                      </span>
                    </td>
                    <td className={`numeric font-bold ${shipment.commissionValue >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatCurrency(shipment.commissionValue)}
                    </td>
                    <td><StatusBadge status={shipment.status} /></td>
                    <td className="actions">
                      <button className="btn btn-ghost btn-icon sm">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredShipments.length === 0 && (
          <EmptyState
            title="ไม่พบรายการ"
            description="ไม่พบรายการขนส่งที่ตรงกับเงื่อนไขการค้นหา"
            icon={<Package size={32} />}
          />
        )}
      </div>
    </div>
  );
}

// Summary Page
function SummaryPage() {
  const [viewMode, setViewMode] = useState<'customer' | 'salesperson' | 'monthly'>('customer');

  // Calculate summaries
  const customerSummaries = MOCK_CUSTOMERS.map(customer => {
    const shipments = MOCK_SHIPMENTS.filter(s => s.customerId === customer.id);
    return {
      ...customer,
      totalShipments: shipments.length,
      totalSell: shipments.reduce((sum, s) => sum + s.sellBase, 0),
      totalCost: shipments.reduce((sum, s) => sum + s.costFinal, 0),
      totalCommission: shipments.reduce((sum, s) => sum + s.commissionValue, 0),
    };
  }).filter(c => c.totalShipments > 0);

  const salespersonSummaries = MOCK_SALESPEOPLE.map(sp => {
    const shipments = MOCK_SHIPMENTS.filter(s => s.salespersonId === sp.id);
    return {
      ...sp,
      totalShipments: shipments.length,
      totalSell: shipments.reduce((sum, s) => sum + s.sellBase, 0),
      totalCost: shipments.reduce((sum, s) => sum + s.costFinal, 0),
      totalCommission: shipments.reduce((sum, s) => sum + s.commissionValue, 0),
    };
  });

  return (
    <div className="page-content">
      {/* View Mode Tabs */}
      <div className="card mb-6">
        <div className="card-body" style={{ padding: 'var(--spacing-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            {[
              { id: 'customer', label: 'รายลูกค้า', icon: <Users size={18} /> },
              { id: 'salesperson', label: 'รายเซลล์', icon: <Users size={18} /> },
              { id: 'monthly', label: 'รายเดือน', icon: <BarChart3 size={18} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`btn ${viewMode === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode(tab.id as typeof viewMode)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {viewMode === 'customer' && 'สรุปค่าคอมมิชชั่นรายลูกค้า'}
            {viewMode === 'salesperson' && 'สรุปค่าคอมมิชชั่นรายเซลล์'}
            {viewMode === 'monthly' && 'สรุปค่าคอมมิชชั่นรายเดือน'}
          </h3>
          <button className="btn btn-secondary">
            <Download size={18} />
            Export
          </button>
        </div>
        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          {viewMode === 'customer' && (
            <table className="table">
              <thead>
                <tr>
                  <th>รหัสลูกค้า</th>
                  <th>ชื่อลูกค้า</th>
                  <th className="text-right">จำนวนรายการ</th>
                  <th className="text-right">ยอดขายรวม</th>
                  <th className="text-right">ต้นทุนรวม</th>
                  <th className="text-right">ค่าคอมรวม</th>
                </tr>
              </thead>
              <tbody>
                {customerSummaries.map((cs) => (
                  <tr key={cs.id}>
                    <td className="font-mono font-medium">{cs.customerCode}</td>
                    <td>{cs.customerName}</td>
                    <td className="numeric">{cs.totalShipments}</td>
                    <td className="numeric">{formatCurrency(cs.totalSell)}</td>
                    <td className="numeric">{formatCurrency(cs.totalCost)}</td>
                    <td className={`numeric font-bold ${cs.totalCommission >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatCurrency(cs.totalCommission)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                  <td colSpan={2}>รวมทั้งหมด</td>
                  <td className="numeric">{customerSummaries.reduce((sum, c) => sum + c.totalShipments, 0)}</td>
                  <td className="numeric">{formatCurrency(customerSummaries.reduce((sum, c) => sum + c.totalSell, 0))}</td>
                  <td className="numeric">{formatCurrency(customerSummaries.reduce((sum, c) => sum + c.totalCost, 0))}</td>
                  <td className="numeric">{formatCurrency(customerSummaries.reduce((sum, c) => sum + c.totalCommission, 0))}</td>
                </tr>
              </tbody>
            </table>
          )}

          {viewMode === 'salesperson' && (
            <table className="table">
              <thead>
                <tr>
                  <th>รหัสเซลล์</th>
                  <th>ชื่อเซลล์</th>
                  <th className="text-right">จำนวนรายการ</th>
                  <th className="text-right">ยอดขายรวม</th>
                  <th className="text-right">ต้นทุนรวม</th>
                  <th className="text-right">ค่าคอมรวม</th>
                </tr>
              </thead>
              <tbody>
                {salespersonSummaries.map((sp) => (
                  <tr key={sp.id}>
                    <td className="font-mono font-medium">{sp.salesCode}</td>
                    <td>{sp.salesName}</td>
                    <td className="numeric">{sp.totalShipments}</td>
                    <td className="numeric">{formatCurrency(sp.totalSell)}</td>
                    <td className="numeric">{formatCurrency(sp.totalCost)}</td>
                    <td className={`numeric font-bold ${sp.totalCommission >= 0 ? 'text-success' : 'text-error'}`}>
                      {formatCurrency(sp.totalCommission)}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-tertiary)', fontWeight: 600 }}>
                  <td colSpan={2}>รวมทั้งหมด</td>
                  <td className="numeric">{salespersonSummaries.reduce((sum, s) => sum + s.totalShipments, 0)}</td>
                  <td className="numeric">{formatCurrency(salespersonSummaries.reduce((sum, s) => sum + s.totalSell, 0))}</td>
                  <td className="numeric">{formatCurrency(salespersonSummaries.reduce((sum, s) => sum + s.totalCost, 0))}</td>
                  <td className="numeric">{formatCurrency(salespersonSummaries.reduce((sum, s) => sum + s.totalCommission, 0))}</td>
                </tr>
              </tbody>
            </table>
          )}

          {viewMode === 'monthly' && (
            <table className="table">
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th className="text-right">จำนวนรายการ</th>
                  <th className="text-right">ยอดขายรวม</th>
                  <th className="text-right">ต้นทุนรวม</th>
                  <th className="text-right">ค่าคอมรวม</th>
                  <th className="text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">มกราคม 2569</td>
                  <td className="numeric">{MOCK_SHIPMENTS.length}</td>
                  <td className="numeric">{formatCurrency(MOCK_SHIPMENTS.reduce((s, sh) => s + sh.sellBase, 0))}</td>
                  <td className="numeric">{formatCurrency(MOCK_SHIPMENTS.reduce((s, sh) => s + sh.costFinal, 0))}</td>
                  <td className="numeric font-bold text-success">
                    {formatCurrency(MOCK_SHIPMENTS.reduce((s, sh) => s + sh.commissionValue, 0))}
                  </td>
                  <td className="numeric">
                    {formatNumber(
                      ((MOCK_SHIPMENTS.reduce((s, sh) => s + sh.sellBase, 0) -
                        MOCK_SHIPMENTS.reduce((s, sh) => s + sh.costFinal, 0)) /
                        MOCK_SHIPMENTS.reduce((s, sh) => s + sh.costFinal, 0)) * 100,
                      1
                    )}%
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Audit Logs Page
function LogsPage() {
  const mockLogs = [
    {
      id: '1',
      createdAt: '2026-01-09 15:30:00',
      actor: 'ผู้ดูแลระบบ',
      action: 'UPDATE',
      entityType: 'RATE_ROW',
      message: 'เปลี่ยนเรท ทั่วไป/รถ/CBM จาก 5,400 เป็น 5,500 บาท',
    },
    {
      id: '2',
      createdAt: '2026-01-09 14:20:00',
      actor: 'ผู้ดูแลระบบ',
      action: 'CREATE',
      entityType: 'SHIPMENT',
      message: 'สร้างรายการใหม่ Tracking: 7100123460',
    },
    {
      id: '3',
      createdAt: '2026-01-08 16:45:00',
      actor: 'ผู้ดูแลระบบ',
      action: 'RECALC',
      entityType: 'SHIPMENT',
      message: 'คำนวณใหม่ 3 รายการตามเรทใหม่',
    },
    {
      id: '4',
      createdAt: '2026-01-08 10:00:00',
      actor: 'ผู้ดูแลระบบ',
      action: 'CREATE',
      entityType: 'RATE_CARD',
      message: 'สร้างชุดเรทใหม่: เรทมาตรฐาน 2026-01',
    },
  ];

  return (
    <div className="page-content">
      <div className="filter-bar">
        <div className="filter-group">
          <label className="filter-label">ประเภท</label>
          <select className="form-select">
            <option value="">ทั้งหมด</option>
            <option value="RATE_CARD">เรททุน</option>
            <option value="SHIPMENT">รายการขนส่ง</option>
            <option value="CUSTOMER">ลูกค้า</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">การกระทำ</label>
          <select className="form-select">
            <option value="">ทั้งหมด</option>
            <option value="CREATE">สร้างใหม่</option>
            <option value="UPDATE">แก้ไข</option>
            <option value="DELETE">ลบ</option>
            <option value="RECALC">คำนวณใหม่</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">ช่วงวันที่</label>
          <input type="date" className="form-input" />
          <span className="text-muted">ถึง</span>
          <input type="date" className="form-input" />
        </div>
      </div>

      <div className="card">
        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>วันที่/เวลา</th>
                <th style={{ width: 150 }}>ผู้ดำเนินการ</th>
                <th style={{ width: 100 }}>การกระทำ</th>
                <th style={{ width: 120 }}>ประเภท</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((log) => (
                <tr key={log.id}>
                  <td className="text-sm text-muted">{log.createdAt}</td>
                  <td>{log.actor}</td>
                  <td>
                    <span className={`badge ${log.action === 'CREATE' ? 'badge-success' :
                        log.action === 'UPDATE' ? 'badge-warning' :
                          log.action === 'DELETE' ? 'badge-error' :
                            'badge-primary'
                      }`}>
                      {log.action === 'CREATE' && 'สร้างใหม่'}
                      {log.action === 'UPDATE' && 'แก้ไข'}
                      {log.action === 'DELETE' && 'ลบ'}
                      {log.action === 'RECALC' && 'คำนวณใหม่'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{log.entityType}</span>
                  </td>
                  <td>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================
export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return { title: 'Dashboard', subtitle: 'ภาพรวมระบบค่าคอมมิชชั่น' };
      case 'rates': return { title: 'ตั้งค่าเรททุน', subtitle: 'จัดการเรทราคาทุนตามประเภทสินค้าและช่องทาง' };
      case 'shipments': return { title: 'รายการขนส่ง', subtitle: 'จัดการรายการขนส่งและคำนวณค่าคอมมิชชั่น' };
      case 'summary': return { title: 'สรุปค่าคอมมิชชั่น', subtitle: 'รายงานสรุปค่าคอมรายลูกค้า เซลล์ และรายเดือน' };
      case 'logs': return { title: 'ประวัติการเปลี่ยนแปลง', subtitle: 'บันทึกการแก้ไขข้อมูลทั้งหมดในระบบ' };
      default: return { title: 'Commission Cargo', subtitle: '' };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        <PageHeader
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        >
          {currentPage === 'shipments' && (
            <button className="btn btn-accent">
              <RefreshCw size={18} />
              คำนวณใหม่
            </button>
          )}
        </PageHeader>

        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'rates' && <RatesPage />}
        {currentPage === 'shipments' && <ShipmentsPage />}
        {currentPage === 'summary' && <SummaryPage />}
        {currentPage === 'logs' && <LogsPage />}
      </main>
    </div>
  );
}
